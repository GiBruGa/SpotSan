<script>
  import { onMount } from 'svelte'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, connecterParTelephone, supprimerCompte } from './lib/profil.js'
  import { viderQueue, nombreEnAttente } from './lib/queueAvis.js'
  import Accueil from './lib/components/Accueil.svelte'
  import Connexion from './lib/components/Connexion.svelte'
  import Inscription from './lib/components/Inscription.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import Carte from './lib/components/Carte.svelte'
  import FicheSanitaire from './lib/components/FicheSanitaire.svelte'
  import FormulaireAvis from './lib/components/FormulaireAvis.svelte'
  import SignalerIncivilite from './lib/components/SignalerIncivilite.svelte'

  let chargement = $state(true)
  let erreurInit = $state('')
  let userId = $state(null)
  let profil = $state(null)
  let enAttente = $state(0)
  // 'accueil' | 'connexion' | 'inscription' -- tant que !profil.
  let vueAuth = $state('accueil')

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

  async function surInscriptionValidee(donnees) {
    profil = await creerProfil(userId, donnees)
  }

  async function surConnexionValidee(telephone) {
    profil = await connecterParTelephone(telephone)
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

{#if $needRefresh}
  <div class="maj-disponible">
    <span>Nouvelle version disponible.</span>
    <button type="button" onclick={() => updateServiceWorker(true)}>Mettre à jour</button>
  </div>
{/if}

{#if chargement}
  <p class="etat">Chargement…</p>
{:else if erreurInit}
  <p class="etat erreur">{erreurInit}</p>
{:else if !profil}
  {#if vueAuth === 'connexion'}
    <Connexion onValide={surConnexionValidee} onRetour={() => (vueAuth = 'accueil')} />
  {:else if vueAuth === 'inscription'}
    <Inscription onValide={surInscriptionValidee} />
  {:else}
    <Accueil onConnexion={() => (vueAuth = 'connexion')} onInscription={() => (vueAuth = 'inscription')} />
  {/if}
{:else if ubIdFormulaire}
  <FormulaireAvis {userId} ubId={ubIdFormulaire} onFerme={surFermetureFormulaire} />
{:else if ubIdSignalement}
  <SignalerIncivilite {userId} ubId={ubIdSignalement} onFerme={surFermetureSignalement} />
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
    color: #666;
  }

  .etat.erreur {
    color: #c55a7a;
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

  .maj-disponible {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.5rem;
    background: #540e28;
    color: #fff;
    font-size: 0.82rem;
  }

  .maj-disponible button {
    border: 1px solid #fff;
    background: transparent;
    color: #fff;
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
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
