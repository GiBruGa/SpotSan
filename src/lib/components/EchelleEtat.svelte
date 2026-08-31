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
    { v: 1, emoji: '👎', libelle: 'Pouce baissé', polarite: 'negatif' },
    { v: 2, emoji: '🙁', libelle: 'Triste', polarite: 'negatif' },
    { v: 3, emoji: '😐', libelle: 'Neutre', polarite: 'neutre' },
    { v: 4, emoji: '🙂', libelle: 'Souriant', polarite: 'positif' },
    { v: 5, emoji: '👍', libelle: 'Pouce levé', polarite: 'positif' },
  ]

  // "Abs" (absent/sans objet) est neutre -- les autres extensions (HS, Vide,
  // Débordante...) signalent toutes un probleme, donc meme code couleur
  // "negatif" que le bas de l'echelle.
  function polariteExtension(ext) {
    return ext === 'Abs' ? 'neutre' : 'negatif'
  }
</script>

<div class="echelle-etat" role="group" aria-label={label || 'Échelle d’état'}>
  {#if label}<span class="echelle-etat__label">{label}</span>{/if}
  <!-- Niveaux + extensions sur une seule ligne commune (retour Gilles du
       2026-08-31 : HS/Abs doivent tenir sur la meme ligne que les smileys). -->
  <div class="echelle-etat__ligne">
    {#each NIVEAUX as n (n.v)}
      <button
        type="button"
        class="echelle-etat__bouton {n.polarite}"
        class:selected={value === n.v}
        aria-pressed={value === n.v}
        aria-label={n.libelle}
        onclick={() => (value = n.v)}
      >{n.emoji}</button>
    {/each}
    {#each extensions as ext (ext)}
      <button
        type="button"
        class="echelle-etat__chip {polariteExtension(ext)}"
        class:selected={value === ext}
        aria-pressed={value === ext}
        onclick={() => (value = ext)}
      >{ext}</button>
    {/each}
  </div>
</div>

<style>
  /* Boutons a fond volontairement clair/colore quel que soit le theme
     (clair ou sombre) de l'appareil -- le texte doit donc rester fixe
     lui aussi, jamais herite d'une couleur qui suivrait le theme, sinon
     du texte clair sur fond clair devient illisible en mode sombre. */
  .echelle-etat {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    color: var(--texte, inherit);
  }

  .echelle-etat__label {
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* Une seule ligne, jamais de retour (demande Gilles du 2026-08-31, plus
     compact) -- overflow-x en filet de securite sur les tres petits ecrans
     ou avec une taille de police systeme agrandie. */
  .echelle-etat__ligne {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.35rem;
    overflow-x: auto;
  }

  .echelle-etat__bouton {
    min-width: 38px;
    min-height: 38px;
    font-size: 1.1rem;
    line-height: 1;
    border-radius: 999px;
    border: 1px solid var(--bordure, #ccc);
    background: var(--fond, #fff);
    color: var(--texte, #1a1414);
    cursor: pointer;
  }

  /* Selection : fond colore selon la polarite du niveau (demande 2026-08-21). */
  .echelle-etat__bouton.negatif.selected {
    border-color: #c55a7a;
    background: #c55a7a;
    color: #fff;
  }

  .echelle-etat__bouton.neutre.selected {
    border-color: #b9ad9c;
    background: #ddd5cb;
    color: #1a1414;
  }

  .echelle-etat__bouton.positif.selected {
    border-color: #8fd99a;
    background: #c9ffc3;
    color: #1a1414;
  }

  .echelle-etat__chip {
    min-height: 38px;
    padding: 0 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--bordure, #ccc);
    background: var(--fond, #fff);
    color: var(--texte, #1a1414);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .echelle-etat__chip.neutre.selected {
    border-color: #b9ad9c;
    background: #ddd5cb;
    color: #1a1414;
    font-weight: 600;
  }

  .echelle-etat__chip.negatif.selected {
    border-color: #c55a7a;
    background: #c55a7a;
    color: #fff;
    font-weight: 600;
  }
</style>
