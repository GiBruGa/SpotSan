<script>
  // Ecran unique couvrant 3 cas (2026-08-29, remplace la connexion
  // declarative par telephone+mot de passe reel) :
  //  - inscription d'un tout nouveau compte (verifie le telephone avant
  //    de laisser saisir le reste du profil)
  //  - migration d'un compte "Usager" existant, cree avant l'arrivee du
  //    mot de passe (session encore anonyme cote Auth malgre un profil
  //    SitInZen_Users deja rempli)
  //  - mot de passe oublie
  // Meme mecanique dans les 3 cas : signInWithOtp (cree le compte Auth
  // reel si besoin, sinon signe dans l'existant) -> verifyOtp -> nouveau
  // mot de passe -> retrouverCompteParTelephone (reattache les donnees
  // SitInZen_Users si elles vivaient encore sous un ancien user_id
  // anonyme). C'est le meme flux qu'une recuperation de mot de passe --
  // pas besoin d'un ecran separe pour ca.

  import { supabase } from '../supabaseClient.js'
  import { motDePasseValide, retrouverCompteParTelephone } from '../auth.js'

  // telephoneConnu : deja au format stocke (ex. "+33 6 12 34 56 78"),
  // fourni quand on force la migration d'un compte deja identifie
  // (App.svelte, cas session-encore-anonyme). Sinon null : l'etape
  // telephone est affichee et editable.
  let { telephoneConnu = null, onTermine, onRetour } = $props()

  let etape = $state(telephoneConnu ? 'code' : 'telephone') // 'telephone' | 'code' | 'motdepasse'
  let indicatif = $state('+33')
  let numeroLocal = $state('')
  let telephone = $state(telephoneConnu || '')
  let code = $state('')
  let motDePasse = $state('')
  let motDePasseConfirme = $state('')
  let motDePasseVisible = $state(false)
  let erreur = $state('')
  let enCours = $state(false)

  async function envoyerCode() {
    erreur = ''
    if (!telephoneConnu) {
      if (!numeroLocal.trim()) {
        erreur = 'Entre ton numéro de portable.'
        return
      }
      const chiffres = numeroLocal.replace(/\D/g, '')
      telephone = `${indicatif} ${chiffres.slice(0, 3)} ${chiffres.slice(3, 6)} ${chiffres.slice(6, 9)}`.trim()
    }
    enCours = true
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: telephone })
      if (error) throw error
      etape = 'code'
    } catch (e) {
      erreur = "Envoi du code impossible. Vérifie le numéro et réessaie."
      console.error(e)
    } finally {
      enCours = false
    }
  }

  async function verifierCode() {
    erreur = ''
    if (!code.trim()) {
      erreur = 'Entre le code reçu par SMS.'
      return
    }
    enCours = true
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: telephone, token: code.trim(), type: 'sms' })
      if (error) throw error
      etape = 'motdepasse'
    } catch (e) {
      erreur = 'Code incorrect ou expiré.'
      console.error(e)
    } finally {
      enCours = false
    }
  }

  async function validerMotDePasse() {
    erreur = ''
    if (!motDePasseValide(motDePasse)) {
      erreur = 'Le mot de passe doit faire au moins 6 caractères, avec 2 majuscules, 2 chiffres et 2 caractères spéciaux.'
      return
    }
    if (motDePasse !== motDePasseConfirme) {
      erreur = 'Les deux mots de passe ne correspondent pas.'
      return
    }
    enCours = true
    try {
      const { error: errMdp } = await supabase.auth.updateUser({ password: motDePasse })
      if (errMdp) throw errMdp
      const profil = await retrouverCompteParTelephone(telephone)
      onTermine?.({ profil, telephone })
    } catch (e) {
      erreur = "Impossible de finaliser pour l'instant. Réessaie."
      console.error(e)
    } finally {
      enCours = false
    }
  }
</script>

<div class="securiser">
  {#if etape === 'telephone'}
    <h1>Vérifie ton numéro</h1>
    <p class="aide">On t'envoie un code par SMS pour confirmer que ce numéro est bien le tien.</p>

    <label class="champ">
      <span>Numéro de portable</span>
      <div class="tel">
        <input type="text" bind:value={indicatif} class="indicatif" aria-label="Indicatif pays" />
        <input type="tel" bind:value={numeroLocal} placeholder="6 12 34 56 78" aria-label="Numéro de portable" />
      </div>
    </label>

    {#if erreur}<p class="erreur">{erreur}</p>{/if}

    <button type="button" class="valider" onclick={envoyerCode} disabled={enCours}>
      {enCours ? 'Envoi…' : 'Recevoir le code'}
    </button>
    {#if onRetour}<button type="button" class="retour" onclick={onRetour}>Retour</button>{/if}
  {:else if etape === 'code'}
    <h1>Entre le code reçu</h1>
    <p class="aide">
      Un SMS vient d'être envoyé au {telephone}.
      Ignore la mention sur l'expéditeur si elle apparaît ("ne peut pas recevoir de réponse") — c'est normal, ne réponds pas au SMS, utilise juste le code.
    </p>

    <label class="champ">
      <span>Code reçu par SMS</span>
      <input type="text" inputmode="numeric" bind:value={code} maxlength="10" placeholder="123456" />
    </label>

    {#if erreur}<p class="erreur">{erreur}</p>{/if}

    <button type="button" class="valider" onclick={verifierCode} disabled={enCours}>
      {enCours ? 'Vérification…' : 'Valider le code'}
    </button>
    <button type="button" class="retour" onclick={envoyerCode} disabled={enCours}>Renvoyer un code</button>
  {:else}
    <h1>Choisis un mot de passe</h1>
    <p class="aide">Au moins 6 caractères, avec 2 majuscules, 2 chiffres et 2 caractères spéciaux.</p>

    <label class="champ">
      <span>Mot de passe</span>
      <input type={motDePasseVisible ? 'text' : 'password'} bind:value={motDePasse} autocomplete="new-password" />
    </label>

    <label class="champ">
      <span>Confirme le mot de passe</span>
      <input type={motDePasseVisible ? 'text' : 'password'} bind:value={motDePasseConfirme} autocomplete="new-password" />
    </label>

    <label class="case-visible">
      <input type="checkbox" bind:checked={motDePasseVisible} />
      <span>Afficher les mots de passe</span>
    </label>

    {#if erreur}<p class="erreur">{erreur}</p>{/if}

    <button type="button" class="valider" onclick={validerMotDePasse} disabled={enCours}>
      {enCours ? 'Enregistrement…' : 'Valider'}
    </button>
  {/if}
</div>

<style>
  .securiser {
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
    color: #555;
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
