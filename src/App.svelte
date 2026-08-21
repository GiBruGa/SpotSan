<script>
  import { onMount } from 'svelte'
  import { assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, supprimerCompte } from './lib/profil.js'
  import Inscription from './lib/components/Inscription.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import EchelleEtat from './lib/components/EchelleEtat.svelte'

  let chargement = $state(true)
  let erreurInit = $state('')
  let userId = $state(null)
  let profil = $state(null)

  let avisGeneral = $state(null)
  let etatLaveMain = $state('Abs')
  let etatPoubelle = $state('Abs')

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
  })

  async function surInscriptionValidee(donnees) {
    profil = await creerProfil(userId, donnees)
  }

  async function surSuppression() {
    await supprimerCompte()
    profil = null
    userId = null
    // Nouvelle session anonyme pour pouvoir recreer un compte tout de suite.
    const session = await assurerSession()
    userId = session.user.id
  }
</script>

{#if chargement}
  <p class="etat">Chargement…</p>
{:else if erreurInit}
  <p class="etat erreur">{erreurInit}</p>
{:else if !profil}
  <Inscription onValide={surInscriptionValidee} />
{:else}
  <BandeauEntete {profil} onSupprimer={surSuppression} />

  <main>
    <h1>SpotSan V2</h1>
    <p class="sous-titre">Lot 1 (comptes utilisateurs) en cours.</p>

    <section>
      <h2>Démo du composant réutilisable — échelle d'état standard (§3.1)</h2>

      <EchelleEtat label="Avis général" bind:value={avisGeneral} />
      <EchelleEtat label="Lave-main" bind:value={etatLaveMain} extensions={['Abs', 'HS']} />
      <EchelleEtat label="Poubelle" bind:value={etatPoubelle} extensions={['Abs', 'Débordante']} />
    </section>
  </main>
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

  main {
    max-width: 480px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .sous-titre {
    color: #666;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }
</style>
