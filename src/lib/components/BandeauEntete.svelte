<script>
  // Bandeau d'en-tete (plan V2-PLAN.md §5.1, etendu le 2026-08-22 suite
  // au retour utilisateur : menu trop pauvre -- ajoute edition des infos,
  // deconnexion, QR code d'installation, bascule clair/sombre, a propos).

  import { onDestroy } from 'svelte'
  import { APP_VERSION } from '../version.js'
  import { themeActuel, definirTheme } from '../theme.js'
  import { seDeconnecter } from '../profil.js'
  import { chargerAvatarParDefaut } from '../identiteVisuelle.js'
  import { obtenirPosition } from '../geolocalisation.js'
  import { ouvrirAvecRetour } from '../retourFerme.js'
  import MesInformations from './MesInformations.svelte'
  import InstallationQR from './InstallationQR.svelte'
  import AProposPanel from './AProposPanel.svelte'

  let { userId, profil, needRefresh = false, onMettreAJour, onProfilMisAJour, onSupprimer, onDeconnexion } = $props()

  let menuOuvert = $state(false)
  // 'accueil' | 'infos' | 'installation' | 'apropos' | 'suppression'
  let vue = $state('accueil')
  let suppressionEnCours = $state(false)
  let theme = $state(themeActuel())

  // Retour materiel/geste telephone ferme le menu au lieu de quitter
  // l'appli (retour Gilles du 2026-08-31) -- voir retourFerme.js.
  let fermerMenuViaRetour = null

  function toggleMenu() {
    if (menuOuvert) {
      fermerMenuViaRetour?.()
      fermerMenuViaRetour = null
      menuOuvert = false
    } else {
      menuOuvert = true
      vue = 'accueil'
      fermerMenuViaRetour = ouvrirAvecRetour(() => {
        menuOuvert = false
        fermerMenuViaRetour = null
      })
    }
  }

  onDestroy(() => fermerMenuViaRetour?.())

  // Avatar par defaut (aucune photo choisie) : icone dynamique depuis
  // acronymes, conditionnee par le sexe declare (demande du 2026-08-22)
  // puis par le statut PMR, prioritaire (demande du 2026-08-24) -- remplace
  // l'ancien .png statique fige (qui ne suivait plus l'evolution de la
  // marque, cf. memoire "shared visual identity").
  let avatarParDefaut = $state(null)
  $effect(() => {
    const estPMR = profil.Is_PMR || profil.handicaps?.includes('Moteur')
    chargerAvatarParDefaut(profil.Sexe_Declare, estPMR).then((url) => (avatarParDefaut = url))
  })

  function choisirTheme(t) {
    theme = t
    definirTheme(t)
  }

  async function confirmerSuppression() {
    suppressionEnCours = true
    try {
      await onSupprimer()
    } finally {
      suppressionEnCours = false
    }
  }

  async function deconnecter() {
    await seDeconnecter()
    onDeconnexion?.()
  }

  // Provoque l'invite systeme de localisation depuis le menu, sans
  // attendre l'ouverture de la carte (demande Gilles 2026-08-31) --
  // pratique pour l'autoriser a l'avance, avant d'en avoir besoin sur le
  // terrain. Le resultat lui-meme n'est pas utilise, seul l'effet de bord
  // (invite navigateur, puis permission memorisee) nous interesse ici.
  let statutLocalisation = $state('')
  let demandeLocalisationEnCours = $state(false)
  async function demanderLocalisation() {
    demandeLocalisationEnCours = true
    statutLocalisation = ''
    try {
      await obtenirPosition()
      statutLocalisation = 'Localisation autorisée.'
    } catch (e) {
      statutLocalisation =
        e.message === 'geolocalisation_indisponible'
          ? "Votre appareil ne propose pas de localisation."
          : "Localisation refusée — activez-la dans les réglages de votre navigateur si vous changez d'avis."
    } finally {
      demandeLocalisationEnCours = false
    }
  }
</script>

<header class="bandeau">
  <span class="marque"><span class="wm-strong">Spot</span><span class="wm-soft">San</span> <span class="version">{APP_VERSION}</span></span>

  <button type="button" class="profil-bouton" onclick={toggleMenu} aria-expanded={menuOuvert}>
    {#if profil.avatar_url?.startsWith('http')}
      <img class="avatar-photo" src={profil.avatar_url} alt="" />
    {:else if avatarParDefaut}
      <span class="avatar-defaut"><img src={avatarParDefaut} alt="" /></span>
    {/if}
    <span class="pseudo">{profil.pseudo}</span>
    {#if needRefresh}<span class="pastille-maj" title="Mise à jour disponible"></span>{/if}
  </button>

  {#if menuOuvert}
    <div class="menu">
      {#if vue === 'accueil'}
        <div class="menu-infos">
          <p><strong>Pseudo</strong> {profil.pseudo}</p>
          <p><strong>Téléphone</strong> {profil.Phone}</p>
        </div>

        {#if needRefresh}
          <button type="button" class="menu-action maj" onclick={onMettreAJour}>Nouvelle version disponible — Mettre à jour</button>
        {/if}

        <button type="button" class="menu-action" onclick={() => (vue = 'infos')}>Mes informations</button>
        <button type="button" class="menu-action" onclick={() => (vue = 'installation')}>QR code SpotSan</button>

        <button type="button" class="menu-action" disabled={demandeLocalisationEnCours} onclick={demanderLocalisation}>
          {demandeLocalisationEnCours ? 'Demande en cours…' : 'Autoriser la localisation'}
        </button>
        {#if statutLocalisation}<p class="note-localisation">{statutLocalisation}</p>{/if}

        <div class="theme-choix">
          <span>Affichage</span>
          <div class="chips">
            <button type="button" class:selected={theme === 'systeme'} onclick={() => choisirTheme('systeme')}>Auto</button>
            <button type="button" class:selected={theme === 'clair'} onclick={() => choisirTheme('clair')}>Clair</button>
            <button type="button" class:selected={theme === 'sombre'} onclick={() => choisirTheme('sombre')}>Sombre</button>
          </div>
        </div>

        <button type="button" class="menu-action" onclick={() => (vue = 'apropos')}>À propos</button>
        <button type="button" class="menu-action" onclick={deconnecter}>Se déconnecter</button>
        <button type="button" class="menu-action danger" onclick={() => (vue = 'suppression')}>Supprimer mon compte</button>
      {:else if vue === 'infos'}
        <MesInformations
          {userId}
          {profil}
          onEnregistre={(p) => {
            onProfilMisAJour?.(p)
            vue = 'accueil'
          }}
          onFerme={() => (vue = 'accueil')}
        />
      {:else if vue === 'installation'}
        <InstallationQR onFerme={() => (vue = 'accueil')} />
      {:else if vue === 'apropos'}
        <AProposPanel onFerme={() => (vue = 'accueil')} />
      {:else if vue === 'suppression'}
        <div class="confirmation">
          <p>Supprimer définitivement votre compte et toutes vos données personnelles ?</p>
          <div class="confirmation-boutons">
            <button type="button" onclick={() => (vue = 'accueil')}>Annuler</button>
            <button type="button" class="danger" disabled={suppressionEnCours} onclick={confirmerSuppression}>
              {suppressionEnCours ? 'Suppression…' : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</header>

<style>
  .bandeau {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    background: var(--accent);
    color: #fff;
    position: relative;
  }

  .marque {
    font-weight: 700;
    font-size: 1.1rem;
  }

  /* Wordmark deux couleurs (Charte Graphique UrBizia.md §1). Le fond du bandeau est --accent
     (#540e28) en permanence, quel que soit le theme clair/sombre de l'app (--accent n'est pas
     redefini par le theme dans app.css) -- donc on utilise toujours les valeurs "mode sombre"
     de la regle ici : elles contrastent correctement sur ce fond fixe, contrairement aux valeurs
     mode clair (#540E28 serait invisible sur un fond #540E28) ou aux premieres valeurs #81093C
     essayees avant correction (contraste insuffisant, cf. memoire "charte graphique"). */
  .wm-strong {
    color: #c55a7a;
  }

  .wm-soft {
    color: #ffc3d5;
  }

  .version {
    font-weight: 400;
    font-size: 0.7rem;
    opacity: 0.75;
  }

  .profil-bouton {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
  }

  /* Signale une mise a jour disponible sans bandeau flottant (celui-ci
     pouvait recouvrir ce bouton -- bug du 2026-08-31) : le detail est
     dans le menu, ici juste un point d'appel. */
  .pastille-maj {
    position: absolute;
    top: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffc3d5;
    border: 2px solid #540e28;
  }

  .avatar-photo {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
  }

  /* Icone par defaut (pas de vraie photo) : dessinee sur le gabarit
     avatar (cercle de securite a 90%), zoom 111% (1/0.9) pour caler ce
     cercle sur le cadre visible -- voir Charte Graphique UrBizia.md §4. */
  .avatar-defaut {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .avatar-defaut img {
    width: 111%;
    height: 111%;
    display: block;
    flex-shrink: 0;
  }

  .pseudo {
    font-weight: 600;
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 1rem;
    background: var(--fond);
    color: var(--texte);
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    padding: 0.9rem;
    width: min(20rem, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    z-index: 20;
  }

  .menu-infos p {
    margin: 0.2rem 0;
    font-size: 0.85rem;
  }

  .note-localisation {
    margin: -0.3rem 0 0;
    font-size: 0.78rem;
    color: var(--texte);
    opacity: 0.75;
  }

  .menu-action {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    text-align: left;
    padding: 0 0.8rem;
    cursor: pointer;
  }

  .menu-action.maj {
    border-color: var(--accent);
    color: var(--accent-texte);
    font-weight: 600;
  }

  /* Bordure/texte rouges mais fond neutre comme les autres items -- un
     fond plein donnait l'impression d'un item deja selectionne (meme
     traitement visuel que .chips button.selected), trompeur pour une
     simple entree de menu (retour Gilles du 2026-08-31). Le remplissage
     plein reste reserve au vrai bouton de confirmation ci-dessous. */
  .menu-action.danger {
    border-color: var(--danger-texte);
    background: var(--fond);
    color: var(--danger-texte);
    font-weight: 600;
    text-align: center;
  }

  .theme-choix {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .theme-choix span {
    font-weight: 600;
    font-size: 0.82rem;
  }

  .chips {
    display: flex;
    gap: 0.4rem;
  }

  .chips button {
    flex: 1;
    min-height: 38px;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .chips button.selected {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .confirmation {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    font-size: 0.85rem;
  }

  .confirmation-boutons {
    display: flex;
    gap: 0.5rem;
  }

  .confirmation-boutons button {
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    cursor: pointer;
  }

  .confirmation-boutons .danger {
    border-color: #c55a7a;
    background: #c55a7a;
    color: #fff;
    font-weight: 600;
  }
</style>
