<script>
  // Ecran de creation de compte (plan V2-PLAN.md §5.1).
  // Telephone declaratif (pas d'OTP, voir §4.1), pseudo + avatar (vraie
  // photo prise ou choisie sur le telephone, cf. demande du 2026-08-21 --
  // remplace l'ancienne liste fermee d'emoji), champs facultatifs, texte
  // legal et rappel du droit a la suppression.

  import BoutonPhoto from './BoutonPhoto.svelte'

  let { onValide } = $props()

  let indicatif = $state('+33')
  let numeroLocal = $state('')
  let nom = $state('')
  let prenom = $state('')
  let pseudo = $state('')
  let avatar = $state(null)
  let sexe = $state(null) // 'Homme' | 'Femme' | null (= non precise)
  let anneeNaissance = $state('')
  let adresse = $state('')
  let handicaps = $state([])
  let accepteConditions = $state(false)
  let erreur = $state('')
  let enCours = $state(false)

  // "Surdité" retire de la liste le 2026-08-21 (demande explicite).
  const HANDICAPS_POSSIBLES = ['Visuel', 'Moteur']

  function toggleHandicap(h) {
    handicaps = handicaps.includes(h) ? handicaps.filter((x) => x !== h) : [...handicaps, h]
  }

  async function valider() {
    erreur = ''
    if (!numeroLocal.trim()) {
      erreur = 'Le numéro de portable est obligatoire.'
      return
    }
    if (!nom.trim() || !prenom.trim()) {
      erreur = 'Le nom et le prénom sont obligatoires.'
      return
    }
    if (!pseudo.trim()) {
      erreur = 'Choisis un pseudo.'
      return
    }
    if (!accepteConditions) {
      erreur = 'Il faut accepter les conditions de collecte de données pour continuer.'
      return
    }

    enCours = true
    try {
      // Format standard §3.2 : indicatif + 3 groupes de 3 chiffres.
      const chiffres = numeroLocal.replace(/\D/g, '')
      const telephone = `${indicatif} ${chiffres.slice(0, 3)} ${chiffres.slice(3, 6)} ${chiffres.slice(6, 9)}`.trim()

      await onValide({
        telephone,
        nom: nom.trim(),
        prenom: prenom.trim(),
        pseudo: pseudo.trim(),
        avatar,
        sexe,
        anneeNaissance: anneeNaissance ? Number(anneeNaissance) : null,
        adresse: adresse.trim() || null,
        handicaps,
      })
    } catch (e) {
      erreur = "Impossible de créer le compte pour l'instant. Réessaie dans un instant."
      console.error(e)
    } finally {
      enCours = false
    }
  }
</script>

<div class="inscription">
  <h1>Créer mon compte SpotSan</h1>

  <label class="champ">
    <span>Numéro de portable *</span>
    <div class="tel">
      <input type="text" bind:value={indicatif} class="indicatif" aria-label="Indicatif pays" />
      <input
        type="tel"
        bind:value={numeroLocal}
        placeholder="6 12 34 56 78"
        aria-label="Numéro de portable"
      />
    </div>
    <small>Déclaratif pour l'instant, pas de code envoyé par SMS.</small>
  </label>

  <label class="champ">
    <span>Nom *</span>
    <input type="text" bind:value={nom} maxlength="80" />
  </label>

  <label class="champ">
    <span>Prénom *</span>
    <input type="text" bind:value={prenom} maxlength="80" />
  </label>

  <label class="champ">
    <span>Pseudo *</span>
    <input type="text" bind:value={pseudo} maxlength="30" />
  </label>

  <div class="champ">
    <span>Avatar (facultatif)</span>
    <!-- anonymiser=false : montrer son visage est justement le but d'un avatar. -->
    <BoutonPhoto capture={null} anonymiser={false} bind:valeur={avatar} />
    <small>Prends une photo ou choisis-en une dans tes photos.</small>
  </div>

  <div class="champ">
    <span>Sexe (facultatif)</span>
    <div class="chips">
      <button type="button" class:selected={sexe === 'Homme'} onclick={() => (sexe = sexe === 'Homme' ? null : 'Homme')}>Homme</button>
      <button type="button" class:selected={sexe === 'Femme'} onclick={() => (sexe = sexe === 'Femme' ? null : 'Femme')}>Femme</button>
    </div>
    <small>Rien de coché = non précisé.</small>
  </div>

  <label class="champ">
    <span>Année de naissance (facultatif)</span>
    <input type="number" bind:value={anneeNaissance} min="1900" max="2026" placeholder="1990" />
  </label>

  <label class="champ">
    <span>Adresse (facultatif)</span>
    <input type="text" bind:value={adresse} maxlength="200" />
  </label>

  <div class="champ">
    <span>Handicap(s) déclarés (facultatif)</span>
    <div class="chips">
      {#each HANDICAPS_POSSIBLES as h (h)}
        <button
          type="button"
          class:selected={handicaps.includes(h)}
          onclick={() => toggleHandicap(h)}
        >{h}</button>
      {/each}
    </div>
  </div>

  <div class="legal">
    <p>
      Les informations que tu fournis (numéro de portable, nom, prénom, pseudo, avatar, et les
      champs facultatifs ci-dessus) sont utilisées uniquement pour te reconnaître d'un avis à
      l'autre et éviter les doublons. Elles ne sont ni vendues ni partagées avec un tiers.
    </p>
    <p>
      <strong>Tu peux à tout moment demander la suppression de ton compte et de toutes tes
      données personnelles</strong>, depuis le menu du bandeau une fois connecté.
    </p>
    <label class="case">
      <input type="checkbox" bind:checked={accepteConditions} />
      <span>J'ai lu et j'accepte la collecte de ces informations.</span>
    </label>
  </div>

  {#if erreur}<p class="erreur">{erreur}</p>{/if}

  <button type="button" class="valider" onclick={valider} disabled={enCours}>
    {enCours ? 'Création…' : 'Créer mon compte'}
  </button>
</div>

<style>
  .inscription {
    max-width: 480px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.9rem;
  }

  input[type='text'],
  input[type='tel'],
  input[type='number'] {
    min-height: 44px;
    padding: 0 0.7rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 1rem;
    color: #1a1414;
    background: #fff;
  }

  .tel {
    display: flex;
    gap: 0.4rem;
  }

  .indicatif {
    width: 4rem;
    text-align: center;
  }

  small {
    color: #777;
    font-size: 0.78rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips button {
    min-height: 44px;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    cursor: pointer;
  }

  /* Fond plein + texte blanc plutot qu'une teinte pale peu visible
     (retour du 2026-08-21 : contraste insuffisant a la selection). */
  .chips button.selected {
    border-color: #540e28;
    background: #540e28;
    color: #fff;
    font-weight: 600;
  }

  .legal {
    background: #f5f0eb;
    border-radius: 10px;
    padding: 0.9rem 1rem;
    font-size: 0.85rem;
    color: #333;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .case {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .erreur {
    color: #c55a7a;
    font-weight: 600;
  }

  .valider {
    min-height: 48px;
    border-radius: 999px;
    border: none;
    background: #540e28;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .valider:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
