<script>
  // Edition des informations personnelles depuis le menu du bandeau
  // (retour utilisateur du 2026-08-22 : le menu n'avait que l'affichage
  // en lecture + la suppression, pas de modification possible).

  import BoutonPhoto from './BoutonPhoto.svelte'
  import { mettreAJourProfil } from '../profil.js'

  let { userId, profil, onEnregistre, onFerme } = $props()

  const HANDICAPS_POSSIBLES = ['Visuel', 'Moteur']

  // Le telephone n'est plus modifiable ici depuis le 2026-08-29 : c'est
  // desormais l'identifiant Auth verifie (telephone+mot de passe), le
  // changer necessite une nouvelle verification par SMS -- hors perimetre
  // de cet ecran, pas de UI de changement de numero pour l'instant.
  let nom = $state(profil.Nom ?? '')
  let prenom = $state(profil.Prenom ?? '')
  let pseudo = $state(profil.pseudo ?? '')
  let email = $state(profil.Email ?? '')
  let avatar = $state(profil.avatar_url ?? null)
  let sexe = $state(profil.Sexe_Declare ?? null)
  let anneeNaissance = $state(profil.Birthdate ? Number(profil.Birthdate.slice(0, 4)) : '')
  let adresse = $state(profil.Adresse ?? '')
  let handicaps = $state(profil.handicaps ?? [])
  let enCours = $state(false)
  let erreur = $state('')

  function toggleHandicap(h) {
    handicaps = handicaps.includes(h) ? handicaps.filter((x) => x !== h) : [...handicaps, h]
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
      const nouveauProfil = await mettreAJourProfil(userId, {
        telephone: profil.Phone,
        nom: nom.trim(),
        prenom: prenom.trim(),
        pseudo: pseudo.trim(),
        avatar,
        sexe,
        anneeNaissance: anneeNaissance ? Number(anneeNaissance) : null,
        adresse: adresse.trim() || null,
        email: email.trim() || null,
        handicaps,
      })
      onEnregistre?.(nouveauProfil)
    } catch (e) {
      console.error(e)
      erreur = "Erreur, réessayez."
    } finally {
      enCours = false
    }
  }
</script>

<div class="mes-infos">
  <h2>Mes informations</h2>

  <div class="champ">
    <span>Numéro de portable</span>
    <p class="valeur-figee">{profil.Phone}</p>
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

  <label class="champ">
    <span>Adresse (facultatif)</span>
    <input type="text" bind:value={adresse} maxlength="200" />
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
