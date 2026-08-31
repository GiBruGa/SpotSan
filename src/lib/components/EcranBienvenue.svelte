<script>
  // Ecran de bienvenue au (re)lancement de l'appli quand un compte est deja
  // connecte (retour Gilles du 2026-08-31 : l'app allait direct sur la
  // carte sans jamais presenter l'outil, contrairement au premier lancement
  // ou Accueil.svelte le fait) -- reprend la meme structure/identite
  // visuelle qu'Accueil.svelte (logo, nom, slogan, droits UrBizia), avec
  // "Bienvenu.e !" et un unique bouton vers la carte a la place du choix
  // connexion/creation. Affiche une seule fois par ouverture d'appli, pas
  // apres une connexion/inscription qui vient d'avoir lieu dans la meme
  // session (App.svelte ne l'active que sur la session deja authentifiee
  // trouvee au demarrage).

  import { chargerIconeSvg, svgVersDataUri } from '../identiteVisuelle.js'

  let { onContinuer } = $props()

  let logo = $state(null)
  $effect(() => {
    chargerIconeSvg('SpotSan').then((svg) => {
      if (svg) logo = svgVersDataUri(svg)
    })
  })
</script>

<div class="bienvenue">
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

  <p class="salutation">Bienvenu·e !</p>

  <p class="rights">Un service conçu par UrBizia — © 2026 UrBizia — Tous droits réservés.</p>

  <button type="button" class="continuer" onclick={() => onContinuer?.()}>Continuer vers la carte</button>
</div>

<style>
  .bienvenue {
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

  .wm-strong {
    color: var(--accent-texte);
  }

  .wm-soft {
    color: var(--danger-texte);
  }

  .objectif {
    margin: 0;
    color: var(--texte-attenue);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .salutation {
    margin: 1.2rem 0 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .rights {
    margin: 1.5rem 0 0;
    color: var(--texte-attenue);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .continuer {
    margin-top: 2rem;
    min-height: 48px;
    width: 100%;
    border-radius: 999px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
