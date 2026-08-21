<script>
  import { onMount } from 'svelte'
  import { assurerSession } from './lib/supabaseClient.js'
  import { chargerProfil, creerProfil, supprimerCompte } from './lib/profil.js'
  import { viderQueue, nombreEnAttente } from './lib/queueAvis.js'
  import Inscription from './lib/components/Inscription.svelte'
  import BandeauEntete from './lib/components/BandeauEntete.svelte'
  import FormulaireAvis from './lib/components/FormulaireAvis.svelte'

  let chargement = $state(true)
  let erreurInit = $state('')
  let userId = $state(null)
  let profil = $state(null)

  // Lot 2/3 (carte + fiche sanitaire) pas encore construits : selecteur
  // provisoire pour pouvoir exercer le Lot 5 des maintenant. A retirer
  // quand la carte permettra de choisir un vrai lieu.
  let ubIdSaisi = $state('UB-012975')
  let ubIdOuvert = $state(null)
  let enAttente = $state(0)

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

  function fermerFormulaire() {
    ubIdOuvert = null
    enAttente = nombreEnAttente()
  }
</script>

{#if chargement}
  <p class="etat">Chargement…</p>
{:else if erreurInit}
  <p class="etat erreur">{erreurInit}</p>
{:else if !profil}
  <Inscription onValide={surInscriptionValidee} />
{:else if ubIdOuvert}
  <FormulaireAvis {userId} ubId={ubIdOuvert} onFerme={fermerFormulaire} />
{:else}
  <BandeauEntete {profil} onSupprimer={surSuppression} />

  <main>
    <h1>SpotSan V2</h1>
    <p class="sous-titre">Lot 5 (formulaire "Donner son avis") en cours.</p>
    {#if enAttente > 0}
      <p class="badge-attente">{enAttente} avis en attente d'envoi (pas de réseau au moment de la sauvegarde).</p>
    {/if}

    <section class="selecteur-provisoire">
      <p class="note">
        Sélecteur provisoire — la carte (Lot 2/3) permettra de choisir un vrai lieu plus tard.
      </p>
      <label class="champ">
        <span>UB_id du sanitaire</span>
        <input type="text" bind:value={ubIdSaisi} />
      </label>
      <button type="button" class="ouvrir" onclick={() => (ubIdOuvert = ubIdSaisi.trim())}>
        Donner mon avis sur ce sanitaire
      </button>
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

  .badge-attente {
    background: #ddd5cb;
    color: #1a1414;
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }

  .selecteur-provisoire {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1rem;
    border: 1px dashed #ccc;
    border-radius: 10px;
  }

  .note {
    font-size: 0.78rem;
    color: #888;
    margin: 0;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .champ input {
    min-height: 44px;
    padding: 0 0.7rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 1rem;
    color: #1a1414;
    background: #fff;
  }

  .ouvrir {
    min-height: 48px;
    border-radius: 999px;
    border: none;
    background: #540e28;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }
</style>
