<script>
  // QR code d'installation (retour utilisateur du 2026-08-22) : permet de
  // partager/installer l'app sur un autre appareil sans taper l'URL.
  // Genere localement (npm `qrcode`), pas de service tiers.

  import { onMount } from 'svelte'

  let { onFerme } = $props()

  let canvas
  const url = window.location.origin + import.meta.env.BASE_URL

  onMount(async () => {
    const QRCode = await import('qrcode')
    QRCode.toCanvas(canvas, url, { width: 200, margin: 1 })
  })
</script>

<div class="installation">
  <h2>Installer SpotSan</h2>
  <canvas bind:this={canvas}></canvas>
  <p class="url">{url}</p>
  <p class="astuce">
    Scanne ce code avec un autre téléphone, ou utilise le menu de ton navigateur ("Ajouter à
    l'écran d'accueil" / "Installer l'application").
  </p>
  <button type="button" class="fermer" onclick={() => onFerme?.()}>Fermer</button>
</div>

<style>
  .installation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    text-align: center;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  canvas {
    border-radius: 8px;
  }

  .url {
    font-size: 0.75rem;
    color: #666;
    word-break: break-all;
    margin: 0;
  }

  .astuce {
    font-size: 0.8rem;
    color: #444;
    margin: 0;
  }

  .fermer {
    min-height: 42px;
    width: 100%;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    font-weight: 600;
    cursor: pointer;
  }
</style>
