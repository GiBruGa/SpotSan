<script>
  // Echelle de comptage (etape "Configuration" du formulaire d'avis) --
  // distincte de EchelleEtat (smileys) : "Configuration" est un compte de
  // services disponibles (combien de toilettes PMR, etc.), "Equipements"
  // une qualification (siege present et en bon etat ?) -- l'un se compte,
  // l'autre se juge (retour Gilles du 2026-08-31, precise le 2026-08-31).

  let { value = $bindable(null), label = '' } = $props()

  const CHOIX = ['1', '2', '3', '4', 'plus de 4', 'HS', 'Abs']
</script>

<div class="echelle-compte" role="group" aria-label={label || 'Nombre'}>
  {#if label}<span class="echelle-compte__label">{label}</span>{/if}
  <div class="echelle-compte__choix">
    {#each CHOIX as c (c)}
      <button
        type="button"
        class="echelle-compte__bouton"
        class:selected={value === c}
        aria-pressed={value === c}
        onclick={() => (value = value === c ? null : c)}
      >{c}</button>
    {/each}
  </div>
</div>

<style>
  .echelle-compte {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .echelle-compte__label {
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* Une seule ligne (demande explicite) -- overflow-x en filet de securite. */
  .echelle-compte__choix {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.3rem;
    overflow-x: auto;
  }

  .echelle-compte__bouton {
    min-width: 40px;
    min-height: 40px;
    padding: 0 0.5rem;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .echelle-compte__bouton.selected {
    border-color: #540e28;
    background: #540e28;
    color: #fff;
    font-weight: 600;
  }
</style>
