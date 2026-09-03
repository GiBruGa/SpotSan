<script>
  // Edition des informations personnelles depuis le menu du bandeau
  // (retour utilisateur du 2026-08-22 : le menu n'avait que l'affichage
  // en lecture + la suppression, pas de modification possible).

  import BoutonPhoto from './BoutonPhoto.svelte'
  import { supabase } from '../supabaseClient.js'
  import { mettreAJourProfil } from '../profil.js'
  import { formaterTelephone } from '../auth.js'

  let { userId, profil, onEnregistre, onFerme } = $props()

  const HANDICAPS_POSSIBLES = ['Visuel', 'Moteur']

  let nom = $state(profil.Nom ?? '')
  let prenom = $state(profil.Prenom ?? '')
  let pseudo = $state(profil.pseudo ?? '')
  let email = $state(profil.Email ?? '')
  let avatar = $state(profil.avatar_url ?? null)
  let sexe = $state(profil.Sexe_Declare ?? null)
  let anneeNaissance = $state(profil.Birthdate ? Number(profil.Birthdate.slice(0, 4)) : '')
  let handicaps = $state(profil.handicaps ?? [])
  let enCours = $state(false)
  let erreur = $state('')

  function toggleHandicap(h) {
    handicaps = handicaps.includes(h) ? handicaps.filter((x) => x !== h) : [...handicaps, h]
  }

  async function enregistrerChamps(telephone) {
    return mettreAJourProfil(userId, {
      telephone,
      nom: nom.trim(),
      prenom: prenom.trim(),
      pseudo: pseudo.trim(),
      avatar,
      sexe,
      anneeNaissance: anneeNaissance ? Number(anneeNaissance) : null,
      email: email.trim() || null,
      handicaps,
    })
  }

  async function enregistrer() {
    erreur = ''
    if (!pseudo.trim()) {
      erreur = 'Le pseudo est obligatoire.'
      return
    }
    if (!nom.trim() || !prenom.trim()) {
      erreur = 'Le nom et le prénom sont obligatoires.'
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      erreur = 'Adresse email invalide.'
      return
    }
    enCours = true
    try {
      const nouveauProfil = await enregistrerChamps(profil.Phone)
      onEnregistre?.(nouveauProfil)
    } catch (e) {
      console.error(e)
      erreur = "Erreur, réessayez."
    } finally {
      enCours = false
    }
  }

  // Changement de numero de portable (demande de Gilles du 2026-08-31,
  // "au cas ou" -- il n'y avait aucun moyen de corriger un numero apres
  // coup). Reutilise le flux de changement de telephone natif de Supabase
  // Auth (verification SMS obligatoire, type 'phone_change') plutot que de
  // toucher directement SitInZen_Users.Phone : c'est l'identifiant Auth
  // reel utilise pour se connecter (signInWithPassword({phone,...})), pas
  // seulement une donnee de profil -- le desynchroniser casserait la
  // connexion avec l'ancien mot de passe.
  let modeChangementTel = $state(false)
  let etapeTel = $state('numero') // 'numero' | 'code'
  let indicatifTel = $state('+33')
  let numeroTel = $state('')
  let telephoneEnAttente = $state('')
  let codeTel = $state('')
  let enCoursTel = $state(false)
  let erreurTel = $state('')

  function ouvrirChangementTel() {
    modeChangementTel = true
    etapeTel = 'numero'
    numeroTel = ''
    codeTel = ''
    erreurTel = ''
  }

  async function envoyerCodeTel() {
    erreurTel = ''
    if (!numeroTel.trim()) {
      erreurTel = 'Entrez le nouveau numéro de portable.'
      return
    }
    enCoursTel = true
    try {
      telephoneEnAttente = formaterTelephone(indicatifTel, numeroTel)
      const { error } = await supabase.auth.updateUser({ phone: telephoneEnAttente })
      if (error) throw error
      etapeTel = 'code'
    } catch (e) {
      erreurTel = "Envoi du code impossible. Vérifiez le numéro et réessayez."
      console.error(e)
    } finally {
      enCoursTel = false
    }
  }

  async function validerCodeTel() {
    erreurTel = ''
    if (!codeTel.trim()) {
      erreurTel = 'Entrez le code reçu par SMS.'
      return
    }
    enCoursTel = true
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: telephoneEnAttente, token: codeTel.trim(), type: 'phone_change' })
      if (error) throw error
      const nouveauProfil = await enregistrerChamps(telephoneEnAttente)
      onEnregistre?.(nouveauProfil)
      modeChangementTel = false
    } catch (e) {
      erreurTel = 'Code incorrect ou expiré.'
      console.error(e)
    } finally {
      enCoursTel = false
    }
  }
</script>

<div class="mes-infos">
  <h2>Mes informations</h2>

  <div class="champ">
    <span>Numéro de portable</span>
    {#if !modeChangementTel}
      <div class="ligne-tel">
        <p class="valeur-figee">{profil.Phone}</p>
        <button type="button" class="lien-tel" onclick={ouvrirChangementTel}>Changer de numéro</button>
      </div>
    {:else if etapeTel === 'numero'}
      <div class="tel">
        <input type="text" bind:value={indicatifTel} class="indicatif" aria-label="Indicatif pays" />
        <input type="tel" bind:value={numeroTel} placeholder="6 12 34 56 78" aria-label="Nouveau numéro de portable" />
      </div>
      {#if erreurTel}<p class="erreur">{erreurTel}</p>{/if}
      <div class="boutons-tel">
        <button type="button" class="annuler" onclick={() => (modeChangementTel = false)}>Annuler</button>
        <button type="button" class="enregistrer" disabled={enCoursTel} onclick={envoyerCodeTel}>
          {enCoursTel ? 'Envoi…' : 'Recevoir le code'}
        </button>
      </div>
    {:else}
      <p class="note-tel">Un SMS vient d'être envoyé au {telephoneEnAttente}.</p>
      <input type="text" inputmode="numeric" bind:value={codeTel} maxlength="10" placeholder="Code reçu par SMS" />
      {#if erreurTel}<p class="erreur">{erreurTel}</p>{/if}
      <div class="boutons-tel">
        <button type="button" class="annuler" onclick={() => (modeChangementTel = false)}>Annuler</button>
        <button type="button" class="enregistrer" disabled={enCoursTel} onclick={validerCodeTel}>
          {enCoursTel ? 'Vérification…' : 'Valider le code'}
        </button>
      </div>
    {/if}
  </div>

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

  <label class="champ">
    <span>Email (facultatif)</span>
    <input type="email" bind:value={email} maxlength="200" placeholder="vous@exemple.com" />
  </label>

  <div class="champ">
    <span>Avatar</span>
    <BoutonPhoto capture={null} anonymiser={false} bind:valeur={avatar} />
  </div>

  <div class="champ">
    <span>Sexe (facultatif)</span>
    <div class="chips">
      <button type="button" class:selected={sexe === 'Homme'} onclick={() => (sexe = sexe === 'Homme' ? null : 'Homme')}>Homme</button>
      <button type="button" class:selected={sexe === 'Femme'} onclick={() => (sexe = sexe === 'Femme' ? null : 'Femme')}>Femme</button>
    </div>
  </div>

  <label class="champ">
    <span>Année de naissance (facultatif)</span>
    <input type="number" bind:value={anneeNaissance} min="1900" max="2026" />
  </label>

  <div class="champ">
    <span>Handicap(s) déclarés (facultatif)</span>
    <div class="chips">
      {#each HANDICAPS_POSSIBLES as h (h)}
        <button type="button" class:selected={handicaps.includes(h)} onclick={() => toggleHandicap(h)}>{h}</button>
      {/each}
    </div>
  </div>

  {#if erreur}<p class="erreur">{erreur}</p>{/if}

  <div class="boutons">
    <button type="button" class="annuler" onclick={() => onFerme?.()}>Annuler</button>
    <button type="button" class="enregistrer" disabled={enCours} onclick={enregistrer}>
      {enCours ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  </div>
</div>

<style>
  .mes-infos {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.82rem;
  }

  input[type='text'],
  input[type='tel'],
  input[type='email'],
  input[type='number'] {
    min-height: 40px;
    padding: 0 0.6rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 0.9rem;
    color: #1a1414;
    background: #fff;
  }

  .valeur-figee {
    margin: 0;
    padding: 0 0.6rem;
    min-height: 40px;
    display: flex;
    align-items: center;
    color: var(--texte-attenue);
    font-size: 0.9rem;
    background: var(--fond-carte);
    border-radius: 8px;
    flex: 1;
  }

  .ligne-tel {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lien-tel {
    flex-shrink: 0;
    border: none;
    background: none;
    color: var(--accent-texte);
    font-size: 0.78rem;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .tel {
    display: flex;
    gap: 0.4rem;
  }

  .indicatif {
    width: 3.5rem;
    text-align: center;
  }

  .note-tel {
    font-size: 0.8rem;
    color: var(--texte-attenue);
    margin: 0;
  }

  .boutons-tel {
    display: flex;
    gap: 0.5rem;
  }

  .boutons-tel button {
    flex: 1;
    min-height: 40px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
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
    font-size: 0.8rem;
    cursor: pointer;
  }

  .chips button.selected {
    border-color: #540e28;
    background: #540e28;
    color: #fff;
    font-weight: 600;
  }

  .erreur {
    color: var(--danger-texte);
    font-weight: 600;
    font-size: 0.82rem;
    margin: 0;
  }

  .boutons {
    display: flex;
    gap: 0.5rem;
  }

  .boutons button {
    flex: 1;
    min-height: 42px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .annuler {
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
  }

  .enregistrer {
    border: none;
    background: #540e28;
    color: #fff;
  }

  .enregistrer:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
