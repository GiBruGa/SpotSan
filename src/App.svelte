<script>
  import { onMount } from 'svelte'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { supabase, assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, supprimerCompte } from './lib/profil.js'
  import { viderQueue, nombreEnAttente } from './lib/queueAvis.js'
  import Accueil from './lib/components/Accueil.svelte'
  import AideInstallation from './lib/components/AideInstallation.svelte'
  import Connexion from './lib/components/Connexion.svelte'
  import Inscription from './lib/components/Inscription.svelte'
  import SecuriserCompte from './lib/components/SecuriserCompte.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import Carte from './lib/components/Carte.svelte'
  import FicheSanitaire from './lib/components/FicheSanitaire.svelte'
  import FormulaireAvis from './lib/components/FormulaireAvis.svelte'
  import SignalerIncivilite from './lib/components/SignalerIncivilite.svelte'

  // Destination du QR code (InstallationQR.svelte) : aide a l'installation
  // publique, sans compte requis -- avant, le QR menait direct a l'ecran de
  // connexion, forcant un premier SMS juste pour voir comment installer,
  // puis un second pour se connecter une fois l'app installee (retour de
  // Gilles le 2026-08-31, cf. V2-PLAN.md §8). Verifie une seule fois au
  // chargement, avant tout le reste -- l'ecran d'aide ne doit jamais
  // attendre la session/le profil.
  let modeInstallation = $state(new URLSearchParams(window.location.search).has('installer'))

  let chargement = $state(true)
  let erreurInit = $state('')
  let userId = $state(null)
  let profil = $state(null)
  let enAttente = $state(0)
  // 'accueil' | 'connexion' | 'inscription' (verif telephone+mdp) |
  // 'inscription-details' (reste du profil) | 'securiser' (depuis le lien
  // "pas de mot de passe" de Connexion) | 'securiser-existant' (gate forcee,
  // profil deja charge mais compte Auth encore anonyme) -- tant que !profil
  // ou vueAuth === 'securiser-existant'.
  let vueAuth = $state('accueil')
  // Telephone deja verifie par SecuriserCompte pendant une inscription,
  // en attente que Inscription.svelte collecte le reste (nom/pseudo/etc).
  let telephoneEnCoursInscription = $state('')

  let ubIdFiche = $state(null)
  let ubIdFormulaire = $state(null)
  let ubIdSignalement = $state(null)
  let versionFiche = $state(0)

  // Mise a jour de l'app : pas de rechargement automatique en silence --
  // ca pourrait effacer une saisie en cours (formulaire, photo). On
  // affiche juste un bandeau, l'utilisateur choisit le moment.
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  onMount(async () => {
    try {
      const session = await assurerSession()
      userId = session.user.id
      profil = await chargerProfil(userId)
      // Profil deja cree (avant le 2026-08-29) mais compte Auth toujours
      // anonyme : mot de passe jamais defini -- on force sa mise en place
      // avant de laisser entrer, comme demande par Gilles ("a leur
      // prochaine connexion").
      if (profil && session.user.is_anonymous) {
        vueAuth = 'securiser-existant'
      }
    } catch (e) {
      console.error(e)
      erreurInit = "Connexion impossible pour l'instant. Réessaie plus tard."
    } finally {
      chargement = false
    }

    const rejouer = async () => {
      const { envoyes } = await viderQueue()
      if (envoyes) console.info(`${envoyes} avis en attente envoyés.`)
      enAttente = nombreEnAttente()
    }
    rejouer()
    window.addEventListener('online', rejouer)
    enAttente = nombreEnAttente()
  })

  /** Rafraichit userId depuis la session courante -- necessaire apres tout
   *  signInWithOtp/verifyOtp/signInWithPassword, qui changent l'identite
   *  Auth active (differente de l'anonyme de depart). */
  async function rafraichirUserId() {
    const { data: { session } } = await supabase.auth.getSession()
    userId = session.user.id
    return session
  }

  /** Callback unique de SecuriserCompte (inscription, migration, mot de
   *  passe oublie -- meme flux dans les 3 cas, voir ce composant). */
  async function surSecuriseTermine({ profil: profilTrouve, telephone }) {
    await rafraichirUserId()
    if (profilTrouve) {
      profil = profilTrouve
      vueAuth = 'accueil'
    } else {
      telephoneEnCoursInscription = telephone
      vueAuth = 'inscription-details'
    }
  }

  async function surInscriptionDetailsValidee(donnees) {
    profil = await creerProfil(userId, { ...donnees, telephone: telephoneEnCoursInscription })
  }

  async function surConnexionReussie() {
    await rafraichirUserId()
    profil = await chargerProfil(userId)
    vueAuth = 'accueil'
  }

  async function surSuppression() {
    await supprimerCompte()
    profil = null
    userId = null
    vueAuth = 'accueil'
    const session = await assurerSession()
    userId = session.user.id
  }

  async function surDeconnexion() {
    profil = null
    userId = null
    vueAuth = 'accueil'
    const session = await assurerSession()
    userId = session.user.id
    profil = await chargerProfil(userId)
  }

  function surFermetureFormulaire() {
    ubIdFormulaire = null
    versionFiche++ // force le rechargement de la fiche (avis a jour)
    enAttente = nombreEnAttente()
  }

  function surFermetureSignalement() {
    ubIdSignalement = null
    versionFiche++
  }
</script>

{#if modeInstallation}
  <AideInstallation
    onContinuer={() => {
      modeInstallation = false
      history.replaceState(null, '', window.location.pathname)
    }}
  />
{:else if chargement}
  <p class="etat">Chargement…</p>
{:else if erreurInit}
  <p class="etat erreur">{erreurInit}</p>
{:else if !profil || vueAuth === 'securiser-existant'}
  {#if vueAuth === 'connexion'}
    <Connexion
      onValide={surConnexionReussie}
      onRetour={() => (vueAuth = 'accueil')}
      onSansMotDePasse={() => (vueAuth = 'securiser')}
    />
  {:else if vueAuth === 'inscription'}
    <SecuriserCompte onTermine={surSecuriseTermine} onRetour={() => (vueAuth = 'accueil')} />
  {:else if vueAuth === 'inscription-details'}
    <Inscription telephone={telephoneEnCoursInscription} onValide={surInscriptionDetailsValidee} />
  {:else if vueAuth === 'securiser'}
    <SecuriserCompte onTermine={surSecuriseTermine} onRetour={() => (vueAuth = 'connexion')} />
  {:else if vueAuth === 'securiser-existant'}
    <SecuriserCompte telephoneConnu={profil?.Phone} onTermine={surSecuriseTermine} />
  {:else}
    <Accueil onConnexion={() => (vueAuth = 'connexion')} onInscription={() => (vueAuth = 'inscription')} />
  {/if}
{:else if ubIdFormulaire}
  <FormulaireAvis {userId} ubId={ubIdFormulaire} onFerme={surFermetureFormulaire} />
{:else if ubIdSignalement}
  <SignalerIncivilite ubId={ubIdSignalement} onFerme={surFermetureSignalement} />
{:else if ubIdFiche}
  {#key versionFiche}
    <FicheSanitaire
      ubId={ubIdFiche}
      onDonnerAvis={(id) => (ubIdFormulaire = id)}
      onSignaler={(id) => (ubIdSignalement = id)}
      onRetour={() => (ubIdFiche = null)}
    />
  {/key}
{:else}
  <div class="ecran-carte">
    <BandeauEntete
      {userId}
      {profil}
      needRefresh={$needRefresh}
      onMettreAJour={() => updateServiceWorker(true)}
      onProfilMisAJour={(p) => (profil = p)}
      onSupprimer={surSuppression}
      onDeconnexion={surDeconnexion}
    />
    {#if enAttente > 0}
      <p class="badge-attente">{enAttente} avis en attente d'envoi (pas de réseau au moment de la sauvegarde).</p>
    {/if}
    <Carte onChoixSanitaire={(id) => (ubIdFiche = id)} />
  </div>
{/if}

<style>
  .etat {
    padding: 2rem;
    text-align: center;
    color: var(--texte-attenue);
  }

  .etat.erreur {
    color: var(--danger-texte);
  }

  .ecran-carte {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .ecran-carte :global(.carte) {
    position: relative;
    flex: 1;
  }

  .badge-attente {
    background: #ddd5cb;
    color: #1a1414;
    font-size: 0.8rem;
    text-align: center;
    padding: 0.4rem;
    margin: 0;
  }
</style>
