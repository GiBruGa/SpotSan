<script>
  import { onMount } from 'svelte'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { supabase, assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, supprimerCompte } from './lib/profil.js'
  import { viderQueue, nombreEnAttente } from './lib/queueAvis.js'
  import { ouvrirAvecRetour } from './lib/retourFerme.js'
  import Accueil from './lib/components/Accueil.svelte'
  import EcranBienvenue from './lib/components/EcranBienvenue.svelte'
  import AideInstallation from './lib/components/AideInstallation.svelte'
  import Connexion from './lib/components/Connexion.svelte'
  import Inscription from './lib/components/Inscription.svelte'
  import SecuriserCompte from './lib/components/SecuriserCompte.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import Carte from './lib/components/Carte.svelte'
  import FicheSanitaire from './lib/components/FicheSanitaire.svelte'
  import FormulaireAvis from './lib/components/FormulaireAvis.svelte'
  import SignalerIncivilite from './lib/components/SignalerIncivilite.svelte'
  import InstructionsEntrainement from './lib/components/InstructionsEntrainement.svelte'

  // Module "S'entrainer" (demande de Gilles le 2026-09-02, pour ses
  // proches ages peu a l'aise avec les applis) : parcours reel (fiche +
  // avis + signalement) mais sur un sanitaire fictif dedie, exclu de la
  // vraie carte (UB-ENTRAINEMENT, voir sanitaires.js), et rien de ce qui
  // y est fait n'est enregistre (prop entrainement, voir
  // FormulaireAvis/SignalerIncivilite/BoutonPhoto).
  const UB_ENTRAINEMENT = 'UB-ENTRAINEMENT'
  // 'off' | 'instructions' | 'fiche' | 'avis' | 'signalement'
  let etapeEntrainement = $state('off')
  // Toute l'excursion "S'entrainer" ne pousse qu'UNE seule entree
  // d'historique (comme le menu/la lightbox, voir retourFerme.js) : le
  // retour materiel/geste quitte l'entrainement d'un coup plutot que de
  // remonter etape par etape -- les boutons "← Carte"/"← Menu" internes
  // suffisent pour la navigation fine a l'interieur.
  let fermerEntrainementViaRetour = null

  function lancerEntrainement() {
    etapeEntrainement = 'instructions'
    fermerEntrainementViaRetour = ouvrirAvecRetour(() => {
      etapeEntrainement = 'off'
      fermerEntrainementViaRetour = null
    })
  }

  function quitterEntrainement() {
    fermerEntrainementViaRetour?.()
    fermerEntrainementViaRetour = null
    etapeEntrainement = 'off'
  }

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

  let versionFiche = $state(0)

  // Ecran post-connexion courant, pilote par l'historique du navigateur
  // (retour Gilles du 2026-09-19 : le bouton/geste "retour" du telephone
  // n'avait rien a depiler dans une SPA sans routeur -- soit il quittait
  // l'appli, soit forcait un rechargement complet qui reinitialisait tout
  // au montage : ecran de bienvenue qui revient, carte qui se recentre sur
  // la position live en perdant l'endroit consulte). Chaque navigation
  // "vers l'avant" (allerA) pousse une entree d'historique ; le retour
  // materiel/geste ET les boutons "← Carte" (history.back()) depilent
  // proprement un ecran a la fois, sans jamais recharger l'appli. Types
  // possibles : {type:'bienvenue'} | {type:'carte'} | {type:'fiche', ubId}
  // | {type:'formulaire', ubId, nom?} | {type:'signalement', ubId}.
  // `nom` (nom du sanitaire, facultatif) n'est renseigne que lorsqu'on
  // arrive depuis la fiche -- sert de titre dans FormulaireAvis.
  let ecran = $state({ type: 'carte' })

  function allerA(nouvelEcran) {
    history.pushState(nouvelEcran, '')
    ecran = nouvelEcran
  }

  // Remplace l'entree courante sans empiler -- pour les transitions qui ne
  // sont pas une "vraie" navigation avant (ecran initial post-connexion,
  // sortie de l'ecran de bienvenue) : un retour materiel depuis l'ecran
  // qui suit doit quitter l'appli, pas revenir sur l'etape precedente.
  function remplacerEcran(nouvelEcran) {
    ecran = nouvelEcran
    history.replaceState(nouvelEcran, '')
  }

  function surPopState(e) {
    // Les entrees factices du menu/de la lightbox (retourFerme.js) portent
    // toujours l'etat de l'ecran sous-jacent en plus de leur propre flag
    // (panneauOuvert) -- les restaurer ici avec le meme type/ubId est donc
    // sans effet (idempotent), les deux mecanismes cohabitent sans conflit.
    ecran = e.state?.type ? e.state : { type: 'carte' }
  }

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
      } else if (profil) {
        remplacerEcran({ type: 'bienvenue' })
      }
    } catch (e) {
      console.error(e)
      erreurInit = "Connexion impossible pour l'instant. Réessaie plus tard."
    } finally {
      chargement = false
    }

    window.addEventListener('popstate', surPopState)

    const rejouer = async () => {
      const { envoyes } = await viderQueue()
      if (envoyes) console.info(`${envoyes} avis en attente envoyés.`)
      enAttente = await nombreEnAttente()
    }
    rejouer()
    window.addEventListener('online', rejouer)
    nombreEnAttente().then((n) => (enAttente = n))
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
      remplacerEcran({ type: 'carte' })
    } else {
      telephoneEnCoursInscription = telephone
      vueAuth = 'inscription-details'
    }
  }

  async function surInscriptionDetailsValidee(donnees) {
    profil = await creerProfil(userId, { ...donnees, telephone: telephoneEnCoursInscription })
    remplacerEcran({ type: 'carte' })
  }

  async function surConnexionReussie() {
    await rafraichirUserId()
    profil = await chargerProfil(userId)
    vueAuth = 'accueil'
    remplacerEcran({ type: 'carte' })
  }

  async function surSuppression() {
    await supprimerCompte()
    profil = null
    userId = null
    vueAuth = 'accueil'
    ecran = { type: 'carte' }
    const session = await assurerSession()
    userId = session.user.id
  }

  async function surDeconnexion() {
    profil = null
    userId = null
    vueAuth = 'accueil'
    ecran = { type: 'carte' }
    const session = await assurerSession()
    userId = session.user.id
    profil = await chargerProfil(userId)
  }

  // Rejoint la fiche (history.back()) qu'il s'agisse d'une sauvegarde
  // reussie, mise en attente hors-ligne, ou d'un "Sortir sans sauvegarder"
  // -- retour Gilles du 2026-09-19 : ne jamais laisser l'ecran de saisie
  // affiche sans dire clairement si l'avis a ete pris en compte.
  function surFermetureFormulaire() {
    versionFiche++ // force le rechargement de la fiche (avis a jour)
    nombreEnAttente().then((n) => (enAttente = n))
    history.back()
  }

  function surFermetureSignalement() {
    versionFiche++
    history.back()
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
{:else if etapeEntrainement !== 'off'}
  {#if etapeEntrainement === 'instructions'}
    <InstructionsEntrainement
      onCommencer={() => (etapeEntrainement = 'fiche')}
      onFermer={quitterEntrainement}
    />
  {:else if etapeEntrainement === 'fiche'}
    <FicheSanitaire
      ubId={UB_ENTRAINEMENT}
      entrainement={true}
      onDonnerAvis={() => (etapeEntrainement = 'avis')}
      onSignaler={() => (etapeEntrainement = 'signalement')}
      onRetour={quitterEntrainement}
    />
  {:else if etapeEntrainement === 'avis'}
    <FormulaireAvis {userId} ubId={UB_ENTRAINEMENT} entrainement={true} onFerme={() => (etapeEntrainement = 'fiche')} />
  {:else if etapeEntrainement === 'signalement'}
    <SignalerIncivilite ubId={UB_ENTRAINEMENT} entrainement={true} onFerme={() => (etapeEntrainement = 'fiche')} />
  {/if}
{:else if ecran.type === 'formulaire'}
  <FormulaireAvis {userId} ubId={ecran.ubId} nomLieu={ecran.nom} onFerme={surFermetureFormulaire} />
{:else if ecran.type === 'signalement'}
  <SignalerIncivilite ubId={ecran.ubId} onFerme={surFermetureSignalement} />
{:else if ecran.type === 'fiche'}
  {#key versionFiche}
    <FicheSanitaire
      ubId={ecran.ubId}
      onDonnerAvis={(id, nom) => allerA({ type: 'formulaire', ubId: id, nom })}
      onSignaler={(id) => allerA({ type: 'signalement', ubId: id })}
      onRetour={() => history.back()}
    />
  {/key}
{:else if ecran.type === 'bienvenue'}
  <EcranBienvenue onContinuer={() => remplacerEcran({ type: 'carte' })} />
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
      onEntrainement={lancerEntrainement}
    />
    {#if enAttente > 0}
      <p class="badge-attente">{enAttente} avis en attente d'envoi (pas de réseau au moment de la sauvegarde).</p>
    {/if}
    <Carte onChoixSanitaire={(id) => allerA({ type: 'fiche', ubId: id })} />
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
