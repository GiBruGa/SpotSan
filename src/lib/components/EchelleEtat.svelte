<script>
  // Echelle d'etat standard SpotSan V2 (plan V2-PLAN.md, section 3.1).
  // Un seul composant reutilise partout ou on note un etat : avis general
  // comme etat de chaque cellule/equipement. `extensions` ajoute des choix
  // hors echelle (ex: ['Abs', 'HS'] ou ['Abs', 'Debordante'] pour la poubelle) --
  // "Abs" (absent) est la valeur par defaut attendue partout sauf l'avis general.

  let {
    value = $bindable(null),
    extensions = [],
    label = '',
  } = $props()

  const NIVEAUX = [
    { v: 1, emoji: '👎', libelle: 'Pouce baissé' },
    { v: 2, emoji: '🙁', libelle: 'Triste' },
    { v: 3, emoji: '😐', libelle: 'Neutre' },
    { v: 4, emoji: '🙂', libelle: 'Souriant' },
    { v: 5, emoji: '👍', libelle: 'Pouce levé' },
  ]
</script>

<div class="echelle-etat" role="group" aria-label={label || 'Échelle d’état'}>
  {#if label}<span class="echelle-etat__label">{label}</span>{/if}
  <div class="echelle-etat__niveaux">
    {#each NIVEAUX as n (n.v)}
      <button
        type="button"
        class="echelle-etat__bouton"
        class:selected={value === n.v}
        aria-pressed={value === n.v}
        aria-label={n.libelle}
        onclick={() => (value = n.v)}
      >{n.emoji}</button>
    {/each}
  </div>
  {#if extensions.length}
    <div class="echelle-etat__extensions">
      {#each extensions as ext (ext)}
        <button
          type="button"
          class="echelle-etat__chip"
          class:selected={value === ext}
          aria-pressed={value === ext}
          onclick={() => (value = ext)}
        >{ext}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .echelle-etat {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .echelle-etat__label {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .echelle-etat__niveaux,
  .echelle-etat__extensions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .echelle-etat__bouton {
    min-width: 44px;
    min-height: 44px;
    font-size: 1.3rem;
    line-height: 1;
    border-radius: 999px;
    border: 1px solid var(--echelle-border, #ccc);
    background: var(--echelle-bg, #fff);
    cursor: pointer;
  }

  .echelle-etat__bouton.selected {
    border-color: var(--echelle-accent, #540e28);
    background: var(--echelle-accent-bg, #f6dde3);
  }

  .echelle-etat__chip {
    min-height: 44px;
    padding: 0 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--echelle-border, #ccc);
    background: var(--echelle-bg, #fff);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .echelle-etat__chip.selected {
    border-color: var(--echelle-accent, #540e28);
    background: var(--echelle-accent-bg, #f6dde3);
    font-weight: 600;
  }
</style>
