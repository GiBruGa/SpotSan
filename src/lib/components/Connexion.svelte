<script>
  // Ecran de connexion a un compte existant, par telephone + mot de passe
  // reel (remplace la connexion declarative du 2026-08-24 -- decision de
  // Gilles le 2026-08-29). Le cas "pas encore de mot de passe" (compte
  // Usager cree avant ce changement, ou mot de passe oublie) est gere par
  // SecuriserCompte.svelte, atteint via le lien ci-dessous plutot que
  // devine automatiquement -- Supabase ne distingue pas "mauvais mot de
  // passe" de "compte pas encore migre" cote client, donc pas de detection
  // fiable possible ici.

  import { supabase } from '../supabaseClient.js'
  import { formaterTelephone } from '../auth.js'

  let { onValide, onRetour, onSansMotDePasse } = $props()

  let indicatif = $state('+33')
  let numeroLocal = $state('')
  let motDePasse = $state('')
  let motDePasseVisible = $state(false)
  let erreur = $state('')
  let enCours = $state(false)

  async function valider() {
    erreur = ''
    if (!numeroLocal.trim() || !motDePasse) {
      erreur = 'Entrez votre numéro de portable et votre mot de passe.'
      return
    }

    enCours = true
    try {
      const telephone = formaterTelephone(indicatif, numeroLocal)
      const { error } = await supabase.auth.signInWithPassword({ phone: telephone, password: motDePasse })
      if (error) throw error
      await onValide?.()
    } catch (e) {
      erreur = 'Numéro ou mot de passe incorrect.'
      console.error(e)
    } finally {
      enCours = false
    }
  }
</script>

<div class="connexion">
  <h1>Se connecter</h1>
  <p class="aide">Retrouvez votre compte avec votre numéro de portable et votre mot de passe.</p>

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
  </label>

  <label class="champ">
    <span>Mot de passe</span>
    <input type={motDePasseVisible ? 'text' : 'password'} bind:value={motDePasse} autocomplete="current-password" />
  </label>

  <label class="case-visible">
    <input type="checkbox" bind:checked={motDePasseVisible} />
    <span>Afficher le mot de passe</span>
  </label>

  {#if erreur}<p class="erreur">{erreur}</p>{/if}

  <button type="button" class="valider" onclick={valider} disabled={enCours}>
    {enCours ? 'Connexion…' : 'Se connecter'}
  </button>
  <button type="button" class="lien" onclick={onSansMotDePasse}>Pas encore de mot de passe, ou mot de passe oublié ?</button>
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
    color: var(--accent-texte);
  }

  .aide {
    margin: 0;
    color: var(--texte-attenue);
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
  input[type='tel'],
  input[type='password'] {
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

  .case-visible {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--texte-attenue);
  }

  .erreur {
    color: var(--danger-texte);
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

  .lien {
    border: none;
    background: transparent;
    color: var(--accent-texte);
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .retour {
    min-height: 44px;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: transparent;
    color: var(--texte);
    cursor: pointer;
  }
</style>
