<script>
  // Ecran d'accueil institutionnel (retour du 2026-08-24 : l'app
  // demarrait directement sur la creation de compte, sans presenter le nom
  // et l'objectif de l'outil -- inspire de l'ecran de bienvenue v1, avec
  // en plus le choix connexion/creation puisque V2, contrairement a v1, a
  // de vrais comptes).
  import { chargerIconeSvg, svgVersDataUri } from '../identiteVisuelle.js'

  let { onConnexion, onInscription } = $props()

  let logo = $state(null)
  $effect(() => {
    chargerIconeSvg('SpotSan').then((svg) => {
      if (svg) logo = svgVersDataUri(svg)
    })
  })
</script>

<div class="accueil">
  {#if logo}
    <img class="logo" src={logo} alt="" />
  {/if}
  <h1>SpotSan</h1>
  <p class="objectif">
    Trouvez rapidement un sanitaire adapté. Géolocalisez, constatez, donnez une note…
    et aidez à repérer les incivilités et dégradations pour améliorer les sanitaires publics.
  </p>

  <div class="boutons">
    <button type="button" class="principal" onclick={onInscription}>Créer un compte</button>
    <button type="button" class="secondaire" onclick={onConnexion}>J'ai déjà un compte</button>
  </div>
</div>

<style>
  .accueil {
    max-width: 440px;
    margin: 0 auto;
    min-height: 100dvh;
    padding: 3rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .logo {
    width: 96px;
    height: 96px;
    margin-bottom: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #540e28;
  }

  .objectif {
    margin: 0;
    color: #555;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .boutons {
    margin-top: 2rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .boutons button {
    min-height: 48px;
    border-radius: 999px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .principal {
    border: none;
    background: #540e28;
    color: #fff;
  }

  .secondaire {
    border: 1px solid #540e28;
    background: transparent;
    color: #540e28;
  }
</style>
