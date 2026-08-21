<script>
  // Bouton de capture photo (Lot 6, plan V2-PLAN.md). Remplace la barre
  // fine de v1, jugee pas assez identifiable ("le bouton prendre une
  // photo est une barre trop petite") -- gros bouton rond, style
  // obturateur d'appareil photo natif.

  import { televerserPhoto } from '../photos.js'

  // capture='environment' (par defaut) : biaise vers l'appareil photo
  // arriere, adapte aux photos de terrain. capture=null : laisse le
  // choix natif complet (appareil photo OU galerie) -- utilise pour
  // l'avatar, ou choisir une photo existante a du sens.
  let { consigne = '', bucket = 'PointSan-Photos', dossier = '', capture = 'environment', valeur = $bindable(null), onTermine } = $props()

  let input
  let enCours = $state(false)
  let erreur = $state('')

  async function surChangement(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    erreur = ''
    enCours = true
    try {
      const url = await televerserPhoto(fichier, { bucket, dossier })
      valeur = url
      onTermine?.(url)
    } catch (err) {
      console.error(err)
      erreur = 'Envoi impossible, réessaie.'
    } finally {
      enCours = false
      e.target.value = ''
    }
  }
</script>

<div class="bouton-photo-bloc">
  {#if consigne}<p class="consigne">{consigne}</p>{/if}

  <button
    type="button"
    class="obturateur"
    class:pris={!!valeur}
    disabled={enCours}
    onclick={() => input.click()}
    aria-label={valeur ? 'Reprendre la photo' : 'Prendre une photo'}
  >
    {#if enCours}
      <span class="anneau chargement"></span>
    {:else if valeur}
      <img src={valeur} alt="" class="miniature" />
    {:else}
      <span class="anneau"></span>
    {/if}
  </button>

  <input
    bind:this={input}
    type="file"
    accept="image/*"
    {capture}
    class="entree-cachee"
    onchange={surChangement}
  />

  {#if erreur}<p class="erreur">{erreur}</p>{/if}
</div>

<style>
  .bouton-photo-bloc {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .consigne {
    font-size: 0.82rem;
    color: #666;
    text-align: center;
    margin: 0;
    max-width: 22rem;
  }

  .obturateur {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 4px solid #540e28;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    overflow: hidden;
  }

  .obturateur:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .anneau {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: #540e28;
  }

  .anneau.chargement {
    background: #ddd5cb;
    animation: pulse 1s ease-in-out infinite;
  }

  .obturateur.pris {
    border-color: #8fd99a;
  }

  .miniature {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .entree-cachee {
    display: none;
  }

  .erreur {
    color: #c55a7a;
    font-size: 0.8rem;
    margin: 0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
