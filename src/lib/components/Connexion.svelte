<script>
  // Ecran de connexion a un compte existant, par numero de telephone
  // (declaratif, pas d'OTP -- meme principe que l'inscription, decision
  // actee le 2026-08-24). Complement d'Accueil.svelte.

  let { onValide, onRetour } = $props()

  let indicatif = $state('+33')
  let numeroLocal = $state('')
  let erreur = $state('')
  let enCours = $state(false)

  async function valider() {
    erreur = ''
    if (!numeroLocal.trim()) {
      erreur = 'Entre ton numéro de portable.'
      return
    }

    enCours = true
    try {
      const chiffres = numeroLocal.replace(/\D/g, '')
      const telephone = `${indicatif} ${chiffres.slice(0, 3)} ${chiffres.slice(3, 6)} ${chiffres.slice(6, 9)}`.trim()
      await onValide(telephone)
    } catch (e) {
      erreur = e.message === 'compte_introuvable'
        ? "Aucun compte n'est associé à ce numéro."
        : 'Connexion impossible pour le moment. Réessaie dans un instant.'
      console.error(e)
    } finally {
      enCours = false
    }
  }
</script>

<div class="connexion">
  <h1>Se connecter</h1>
  <p class="aide">Retrouve ton compte avec le numéro de portable utilisé à l'inscription.</p>

  <label class="champ">
    <span>Numéro de portable</span>
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

  {#if erreur}<p class="erreur">{erreur}</p>{/if}

  <button type="button" class="valider" onclick={valider} disabled={enCours}>
    {enCours ? 'Connexion…' : 'Se connecter'}
  </button>
  <button type="button" class="retour" onclick={onRetour}>Retour</button>
</div>

<style>
  .connexion {
    max-width: 440px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
    color: #540e28;
  }

  .aide {
    margin: 0;
    color: #555;
    font-size: 0.9rem;
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

  .tel {
    display: flex;
    gap: 0.4rem;
  }

  input[type='text'],
  input[type='tel'] {
    min-height: 44px;
    padding: 0 0.7rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 1rem;
    color: #1a1414;
    background: #fff;
  }

  .indicatif {
    width: 4rem;
    text-align: center;
  }

  small {
    color: #777;
    font-size: 0.78rem;
  }

  .erreur {
    color: #c55a7a;
    font-weight: 600;
    margin: 0;
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

  .retour {
    min-height: 44px;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: transparent;
    color: #555;
    cursor: pointer;
  }
</style>
