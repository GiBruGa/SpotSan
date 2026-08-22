<script>
  // Bandeau d'en-tete (plan V2-PLAN.md §5.1, etendu le 2026-08-22 suite
  // au retour utilisateur : menu trop pauvre -- ajoute edition des infos,
  // deconnexion, QR code d'installation, bascule clair/sombre, a propos).

  import { APP_VERSION } from '../version.js'
  import { themeActuel, definirTheme } from '../theme.js'
  import { seDeconnecter } from '../profil.js'
  import MesInformations from './MesInformations.svelte'
  import InstallationQR from './InstallationQR.svelte'
  import AProposPanel from './AProposPanel.svelte'

  let { userId, profil, onProfilMisAJour, onSupprimer, onDeconnexion } = $props()

  let menuOuvert = $state(false)
  // 'accueil' | 'infos' | 'installation' | 'apropos' | 'suppression'
  let vue = $state('accueil')
  let suppressionEnCours = $state(false)
  let theme = $state(themeActuel())

  function toggleMenu() {
    menuOuvert = !menuOuvert
    vue = 'accueil'
  }

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
</script>

<header class="bandeau">
  <span class="marque">SpotSan <span class="version">{APP_VERSION}</span></span>

  <button type="button" class="profil-bouton" onclick={toggleMenu} aria-expanded={menuOuvert}>
    {#if profil.avatar_url?.startsWith('http')}
      <img class="avatar-photo" src={profil.avatar_url} alt="" />
    {:else}
      <img class="avatar-photo" src="{import.meta.env.BASE_URL}icon-192.png" alt="" />
    {/if}
    <span class="pseudo">{profil.pseudo}</span>
  </button>

  {#if menuOuvert}
    <div class="menu">
      {#if vue === 'accueil'}
        <div class="menu-infos">
          <p><strong>Pseudo</strong> {profil.pseudo}</p>
          <p><strong>Téléphone</strong> {profil.Phone}</p>
        </div>

        <button type="button" class="menu-action" onclick={() => (vue = 'infos')}>Mes informations</button>
        <button type="button" class="menu-action" onclick={() => (vue = 'installation')}>Installer l'application (QR code)</button>

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
          <p>Supprimer définitivement ton compte et toutes tes données personnelles ?</p>
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

  .version {
    font-weight: 400;
    font-size: 0.7rem;
    opacity: 0.75;
  }

  .profil-bouton {
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

  .avatar-photo {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
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

  .menu-action.danger {
    border-color: #c55a7a;
    background: #c55a7a;
    color: #fff;
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
