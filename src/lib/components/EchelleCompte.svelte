<script>
  // Echelle de comptage (etape "Configuration" du formulaire d'avis) --
  // distincte de EchelleEtat (smileys) : "Configuration" est un compte de
  // services disponibles (combien de toilettes PMR, etc.), "Equipements"
  // une qualification (siege present et en bon etat ?) -- l'un se compte,
  // l'autre se juge (retour Gilles du 2026-08-31, precise le 2026-08-31).

  // couleur (2026-09-03) : teinte par genre (Mixte/Femmes/Hommes) demandee
  // par Gilles pour reperer d'un coup d'oeil a quelle ligne appartient
  // chaque bouton dans les groupes a plusieurs genres -- purement visuel,
  // aucun impact sur les valeurs possibles.
  let { value = $bindable(null), label = '', couleur = null } = $props()

  const CHOIX = ['1', '2', '3', '4', '>4', 'HS', 'Abs']
</script>

<div class="echelle-compte" role="group" aria-label={label || 'Nombre'}>
  {#if label}<span class="echelle-compte__label">{label}</span>{/if}
  <div class="echelle-compte__choix">
    {#each CHOIX as c (c)}
      <button
        type="button"
        class="echelle-compte__bouton"
        class:couleur-mixte={couleur === 'mixte'}
        class:couleur-femmes={couleur === 'femmes'}
        class:couleur-hommes={couleur === 'hommes'}
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
    min-width: 32px;
    min-height: 34px;
    padding: 0 0.4rem;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid var(--bordure, #ccc);
    background: var(--fond, #fff);
    color: var(--texte, #1a1414);
    font-size: 0.76rem;
    cursor: pointer;
  }

  .echelle-compte__bouton.selected {
    border-color: var(--accent, #540e28);
    background: var(--accent, #540e28);
    color: #fff;
    font-weight: 600;
  }

  /* Teintes fixes (pas theme-adaptive, meme logique que --accent) : le
     fond pastel identifie le genre au repos, la version saturee marque la
     selection -- couleurs choisies pour rester lisibles sur fond clair et
     sombre. */
  .echelle-compte__bouton.couleur-mixte {
    border-color: #7cc99a;
    background: #eafaf0;
    color: #1a1414;
  }
  .echelle-compte__bouton.couleur-mixte.selected {
    border-color: #4caf7d;
    background: #4caf7d;
    color: #fff;
  }
  .echelle-compte__bouton.couleur-femmes {
    border-color: #6ec9dc;
    background: #e6f7fb;
    color: #1a1414;
  }
  .echelle-compte__bouton.couleur-femmes.selected {
    border-color: #2fa8c4;
    background: #2fa8c4;
    color: #fff;
  }
  .echelle-compte__bouton.couleur-hommes {
    border-color: #e8b489;
    background: #fdf1e4;
    color: #1a1414;
  }
  .echelle-compte__bouton.couleur-hommes.selected {
    border-color: #e08a3e;
    background: #e08a3e;
    color: #fff;
  }
</style>
