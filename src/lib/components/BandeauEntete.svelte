<script>
  // Bandeau d'en-tete (plan V2-PLAN.md §5.1) : avatar + pseudo + menu
  // utilisateur (infos personnelles, suppression du compte).

  let { profil, onSupprimer } = $props()

  let menuOuvert = $state(false)
  let confirmationSuppression = $state(false)
  let suppressionEnCours = $state(false)

  function toggleMenu() {
    menuOuvert = !menuOuvert
    confirmationSuppression = false
  }

  async function confirmerSuppression() {
    suppressionEnCours = true
    try {
      await onSupprimer()
    } finally {
      suppressionEnCours = false
    }
  }
</script>

<header class="bandeau">
  <span class="marque">SpotSan</span>

  <button type="button" class="profil-bouton" onclick={toggleMenu} aria-expanded={menuOuvert}>
    <span class="avatar">{profil.avatar_url ?? '🙂'}</span>
    <span class="pseudo">{profil.pseudo}</span>
  </button>

  {#if menuOuvert}
    <div class="menu">
      <div class="menu-infos">
        <p><strong>Pseudo</strong> {profil.pseudo}</p>
        <p><strong>Téléphone</strong> {profil.Phone}</p>
        {#if profil.Sexe_Declare}<p><strong>Sexe</strong> {profil.Sexe_Declare}</p>{/if}
        {#if profil.Birthdate}<p><strong>Année de naissance</strong> {profil.Birthdate.slice(0, 4)}</p>{/if}
        {#if profil.handicaps?.length}<p><strong>Handicaps</strong> {profil.handicaps.join(', ')}</p>{/if}
      </div>

      {#if !confirmationSuppression}
        <button type="button" class="menu-action danger" onclick={() => (confirmationSuppression = true)}>
          Supprimer mon compte
        </button>
      {:else}
        <div class="confirmation">
          <p>Supprimer définitivement ton compte et toutes tes données personnelles ?</p>
          <div class="confirmation-boutons">
            <button type="button" onclick={() => (confirmationSuppression = false)}>Annuler</button>
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
    background: #540e28;
    color: #fff;
    position: relative;
  }

  .marque {
    font-weight: 700;
    font-size: 1.1rem;
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

  .avatar {
    font-size: 1.3rem;
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
    background: #fff;
    color: #1a1414;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    padding: 0.9rem;
    width: min(20rem, 90vw);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    z-index: 20;
  }

  .menu-infos p {
    margin: 0.2rem 0;
    font-size: 0.85rem;
  }

  .menu-action {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #fff;
    cursor: pointer;
  }

  .menu-action.danger,
  .confirmation-boutons .danger {
    border-color: #c55a7a;
    background: #c55a7a;
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
    border: 1px solid #ccc;
    background: #fff;
    cursor: pointer;
  }
</style>
