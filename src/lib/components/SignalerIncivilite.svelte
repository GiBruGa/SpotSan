<script>
  // Signaler des Incivilites et Vandalismes (Lot 6, §5.6.3) --
  // l'OBJET PRINCIPAL DE L'OUTIL pour UrBizia (voir bandeau en tete du
  // plan) : ces photos alimentent une base d'entrainement pour une IA de
  // detection. Photo et tag obligatoires -- le tag est un label
  // d'entrainement, pas un confort de navigation.

  import BoutonPhoto from './BoutonPhoto.svelte'
  import { signalerIncivilite, chargerTaxonomieIncivilites } from '../incidents.js'
  import { obtenirPosition } from '../geolocalisation.js'
  import { onMount } from 'svelte'

  // entrainement=true (module "S'entrainer", 2026-09-02) : le vrai
  // formulaire, mais rien n'est envoye -- ni geolocalisation, ni ecriture
  // en base, ni photo televersee (voir BoutonPhoto).
  let { ubId, entrainement = false, onFerme } = $props()

  let photoUrl = $state(null)
  let tags = $state([])
  let taxonomie = $state([])
  let description = $state('')
  let enCours = $state(false)
  let erreur = $state('')
  let messageEntrainement = $state('')

  onMount(async () => {
    try {
      taxonomie = await chargerTaxonomieIncivilites()
    } catch (e) {
      console.error(e)
      erreur = 'Impossible de charger la liste des problèmes, réessayez.'
    }
  })

  function basculer(t) {
    tags = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]
  }

  async function envoyer() {
    erreur = ''
    if (!photoUrl) {
      erreur = 'Une photo est obligatoire pour signaler des Incivilités et Vandalismes.'
      return
    }
    if (!tags.length) {
      erreur = 'Choisissez au moins un type de problème constaté.'
      return
    }
    enCours = true
    if (entrainement) {
      await new Promise((r) => setTimeout(r, 500))
      erreur = ''
      messageEntrainement = 'Entraînement terminé — rien n\'a été enregistré. Merci pour votre vigilance, ça compte pour de vrai !'
      enCours = false
      setTimeout(() => onFerme?.(), 1400)
      return
    }
    try {
      const { lat, lon } = await obtenirPosition()
      await signalerIncivilite({ ubId, photoUrl, tags, description, lat, lon })
      onFerme?.()
    } catch (e) {
      console.error(e)
      if (e.message === 'geolocalisation_indisponible' || e.message === 'geolocalisation_refusee') {
        erreur = 'Activez la localisation pour signaler — il faut être sur place, près du sanitaire.'
      } else if (e.message?.includes('trop_loin')) {
        erreur = 'Vous devez être à proximité du sanitaire pour signaler.'
      } else {
        erreur = 'Envoi impossible, réessayez.'
      }
    } finally {
      enCours = false
    }
  }
</script>

<div class="signaler">
  {#if entrainement}<p class="banniere-entrainement">Mode entraînement — rien ne sera enregistré</p>{/if}
  <header>
    <h1>Signaler des Incivilités et Vandalismes</h1>
    <div class="but-groupe">
      <p class="but">
        Nous mettons au point un système de remontée de vos informations vers les services de
        nettoyage et les exploitants de ces sanitaires.
      </p>
      <p class="but">Il reste du travail pour les identifier et les convaincre.</p>
      <p class="but">Mais plus vous contribuez, plus nous sommes écoutés !</p>
      <p class="but">Merci d'avance.</p>
    </div>
  </header>

  <section class="champ">
    <span>Photo *</span>
    <BoutonPhoto bucket="PointSan-Incidents" dossier={ubId} {entrainement} bind:valeur={photoUrl} />
  </section>

  <section class="champ">
    <span>Type de problème * <span class="hint">(plusieurs choix possibles)</span></span>
    <div class="chips">
      {#each taxonomie as t (t)}
        <button type="button" class:selected={tags.includes(t)} onclick={() => basculer(t)}>{t}</button>
      {/each}
    </div>
  </section>

  <label class="champ">
    <span>Description (facultatif)</span>
    <textarea bind:value={description} rows="3" maxlength="500"></textarea>
  </label>

  {#if erreur}<p class="erreur">{erreur}</p>{/if}
  {#if messageEntrainement}<p class="message-entrainement">{messageEntrainement}</p>{/if}

  <div class="boutons-flottants">
    <button type="button" class="annuler" onclick={() => onFerme?.()}>Annuler</button>
    <button type="button" class="envoyer" disabled={enCours} onclick={envoyer}>
      {enCours ? 'Envoi…' : 'Signaler'}
    </button>
  </div>
</div>

<style>
  .signaler {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem 1rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    color: var(--texte);
  }

  header h1 {
    font-size: 1.15rem;
    margin: 0 0 0.4rem;
    color: var(--danger-texte);
  }

  .but-groupe {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .but {
    font-size: 0.82rem;
    color: var(--texte-attenue);
    margin: 0;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .champ .hint {
    font-weight: 400;
    color: var(--texte-attenue);
    font-size: 0.78rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips button {
    min-height: 40px;
    padding: 0 0.7rem;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .chips button.selected {
    border-color: #c55a7a;
    background: #c55a7a;
    color: #fff;
    font-weight: 600;
  }

  textarea {
    border-radius: 8px;
    border: 1px solid #ccc;
    padding: 0.6rem;
    font: inherit;
    color: #1a1414;
    background: #fff;
    resize: vertical;
  }

  .erreur {
    color: var(--danger-texte);
    font-weight: 600;
    font-size: 0.85rem;
  }

  .banniere-entrainement {
    margin: 0 0 0.2rem;
    padding: 0.5rem 0.8rem;
    border-radius: 8px;
    background: var(--accent-fond);
    color: var(--accent-texte);
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
  }

  .message-entrainement {
    color: var(--accent-texte);
    font-weight: 600;
    font-size: 0.85rem;
    text-align: center;
  }

  .boutons-flottants {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 1rem calc(0.8rem + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  }

  .boutons-flottants button {
    flex: 1;
    min-height: 48px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .annuler {
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
  }

  .envoyer {
    border: none;
    background: #c55a7a;
    color: #fff;
  }

  .envoyer:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
