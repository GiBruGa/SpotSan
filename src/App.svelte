<script>
  import { onMount } from 'svelte'
  import { assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, supprimerCompte } from './lib/profil.js'
  import { viderQueue, nombreEnAttente } from './lib/queueAvis.js'
  import Inscription from './lib/components/Inscription.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import Carte from './lib/components/Carte.svelte'
  import FicheSanitaire from './lib/components/FicheSanitaire.svelte'
  import FormulaireAvis from './lib/components/FormulaireAvis.svelte'

  let chargement = $state(true)
  let erreurInit = $state('')
  let userId = $state(null)
  let profil = $state(null)
  let enAttente = $state(0)

  let ubIdFiche = $state(null)
  let ubIdFormulaire = $state(null)
  let versionFiche = $state(0)

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

  async function surSuppression() {
    await supprimerCompte()
    profil = null
    userId = null
    const session = await assurerSession()
    userId = session.user.id
  }

  function surFermetureFormulaire() {
    ubIdFormulaire = null
    versionFiche++ // force le rechargement de la fiche (avis a jour)
    enAttente = nombreEnAttente()
  }
</script>

{#if chargement}
  <p class="etat">Chargement…</p>
{:else if erreurInit}
  <p class="etat erreur">{erreurInit}</p>
{:else if !profil}
  <Inscription onValide={surInscriptionValidee} />
{:else if ubIdFormulaire}
  <FormulaireAvis {userId} ubId={ubIdFormulaire} onFerme={surFermetureFormulaire} />
{:else if ubIdFiche}
  {#key versionFiche}
    <FicheSanitaire
      ubId={ubIdFiche}
      onDonnerAvis={(id) => (ubIdFormulaire = id)}
      onRetour={() => (ubIdFiche = null)}
    />
  {/key}
{:else}
  <div class="ecran-carte">
    <BandeauEntete {profil} onSupprimer={surSuppression} />
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

  .badge-attente {
    background: #ddd5cb;
    color: #1a1414;
    font-size: 0.8rem;
    text-align: center;
    padding: 0.4rem;
    margin: 0;
  }
</style>
