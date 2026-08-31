<script>
  // Ecran d'aide a l'installation, public (aucun compte requis) --
  // destination du QR code (InstallationQR.svelte) depuis le 2026-08-31.
  // Avant ce changement, le QR menait directement a l'ecran de connexion,
  // ce qui forcait un nouvel arrivant a generer un premier SMS juste pour
  // *voir* comment installer, puis un second pour se connecter une fois
  // l'app installee -- retour de Gilles, cf. V2-PLAN.md §8 (2026-08-31).
  //
  // Instructions Android + iOS affichees ensemble (pas de detection par
  // user-agent) : plus simple et plus robuste qu'un sniffing fragile, et
  // ca reste lisible pour quelqu'un qui regarde l'ecran d'un proche.

  import { chargerIconeSvg, svgVersDataUri } from '../identiteVisuelle.js'

  let { onContinuer } = $props()

  let logo = $state(null)
  $effect(() => {
    chargerIconeSvg('SpotSan').then((svg) => {
      if (svg) logo = svgVersDataUri(svg)
    })
  })
</script>

<div class="aide-installation">
  <div class="logo">
    {#if logo}
      <img src={logo} alt="" />
    {/if}
  </div>
  <h1><span class="wm-strong">Spot</span><span class="wm-soft">San</span></h1>
  <p class="intro">Installez l'application sur votre téléphone pour l'avoir comme une vraie appli, avec son icône.</p>

  <section class="etapes">
    <h2>Sur Android (Chrome)</h2>
    <ol>
      <li>Ouvrez le menu ⋮ en haut à droite du navigateur.</li>
      <li>Choisissez « Installer l'application » (ou « Ajouter à l'écran d'accueil »).</li>
      <li>Confirmez — l'icône SpotSan apparaît sur votre écran d'accueil.</li>
    </ol>
  </section>

  <section class="etapes">
    <h2>Sur iPhone (Safari)</h2>
    <ol>
      <li>Appuyez sur le bouton Partager <span class="icone-partage">⬆</span> en bas de l'écran.</li>
      <li>Choisissez « Sur l'écran d'accueil ».</li>
      <li>Confirmez — l'icône SpotSan apparaît sur votre écran d'accueil.</li>
    </ol>
  </section>

  <button type="button" class="continuer" onclick={() => onContinuer?.()}>
    J'ai déjà installé — se connecter
  </button>

  <p class="rights">© 2026 UrBizia — Tous droits réservés.</p>
</div>

<style>
  .aide-installation {
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
    width: 160px;
    height: 160px;
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

  .intro {
    margin: 0;
    color: var(--texte-attenue);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .etapes {
    width: 100%;
    text-align: left;
    background: var(--fond-carte);
    border-radius: 10px;
    padding: 1rem 1.2rem;
  }

  .etapes h2 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
    color: var(--accent-texte);
  }

  .etapes ol {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.88rem;
    color: var(--texte);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .icone-partage {
    display: inline-block;
    font-weight: 700;
  }

  .continuer {
    margin-top: 1rem;
    min-height: 48px;
    width: 100%;
    border-radius: 999px;
    border: 1px solid var(--accent-texte);
    background: transparent;
    color: var(--accent-texte);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .rights {
    margin: 1.5rem 0 0;
    color: var(--texte-attenue);
    font-size: 0.78rem;
  }
</style>
