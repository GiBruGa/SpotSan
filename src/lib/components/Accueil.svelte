<script>
  // Ecran d'accueil institutionnel (retour du 2026-08-24 : l'app
  // demarrait directement sur la creation de compte, sans presenter le nom
  // et l'objectif de l'outil -- inspire de l'ecran de bienvenue v1, avec
  // en plus le choix connexion/creation puisque V2, contrairement a v1, a
  // de vrais comptes).
  import { chargerIconeSvg, svgVersDataUri } from '../identiteVisuelle.js'
  import AProposPanel from './AProposPanel.svelte'

  let { onConnexion, onInscription } = $props()

  let logo = $state(null)
  let apropos = $state(false)
  $effect(() => {
    chargerIconeSvg('SpotSan').then((svg) => {
      if (svg) logo = svgVersDataUri(svg)
    })
  })
</script>

<div class="accueil">
  <div class="logo">
    {#if logo}
      <img src={logo} alt="" />
    {/if}
  </div>
  <h1><span class="wm-strong">Spot</span><span class="wm-soft">San</span></h1>
  <p class="objectif">
    Trouvez rapidement un sanitaire adapté. Géolocalisez, constatez, donnez une note…
    et aidez à repérer les incivilités et dégradations pour améliorer les sanitaires publics.
  </p>

  <div class="boutons">
    <button type="button" class="principal" onclick={onInscription}>Créer un compte</button>
    <button type="button" class="secondaire" onclick={onConnexion}>J'ai déjà un compte</button>
  </div>

  <p class="rights">© 2026 UrBizia — Tous droits réservés.</p>
  {#if apropos}
    <div class="apropos-overlay">
      <div class="apropos-box">
        <AProposPanel onFerme={() => (apropos = false)} />
      </div>
    </div>
  {:else}
    <button type="button" class="apropos-lien" onclick={() => (apropos = true)}>ⓘ À propos</button>
  {/if}
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

  /* Logo "usage general" (Charte Graphique UrBizia.md §4, revu le 2026-08-29) : affiche tel
     quel, carre, sans rognage ni zoom -- seuls l'icone OS/PWA (gabarit dedie, pas affiche ici)
     et l'avatar (cercle delibere de l'UI, cf. BandeauEntete.svelte) gardent un cadre circulaire. */
  .logo {
    width: 216px;
    height: 216px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.5rem;
    background: #f4f1ee;
  }

  .logo img {
    width: 100%;
    height: 100%;
    display: block;
    flex-shrink: 0;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
  }

  /* Nom en deux couleurs (Charte Graphique UrBizia.md §1). Cet ecran est
     encore light-only (pas de couverture theme sombre ici, cf. le "reste"
     deja note ailleurs) -- valeurs mode clair uniquement pour l'instant.
     Corrige 2026-08-24, 2e fois (1ere correction utilisait a tort #81093C
     pour le 1er segment -- erreur de recopie des hex, corrigee le meme jour). */
  .wm-strong {
    color: #540e28;
  }

  .wm-soft {
    color: #c55a7a;
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

  .rights {
    margin: 1.5rem 0 0;
    color: #888;
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .apropos-lien {
    margin-top: 0.4rem;
    background: none;
    border: none;
    color: #888;
    font-size: 0.78rem;
    text-decoration: underline;
    cursor: pointer;
  }

  .apropos-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26, 20, 20, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 100;
  }

  .apropos-box {
    max-width: 380px;
    width: 100%;
    background: #fff;
    border-radius: 14px;
    padding: 1.3rem;
  }
</style>
