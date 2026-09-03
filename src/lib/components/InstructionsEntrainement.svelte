<script>
  // Module "S'entrainer" (demande de Gilles le 2026-09-02, pour ses
  // proches ages peu a l'aise avec les applis) : ecran d'instructions
  // avant de decouvrir un vrai parcours (fiche + avis + signalement) sur
  // un sanitaire fictif (UB-ENTRAINEMENT, exclu de la vraie carte, voir
  // sanitaires.js). Rien de ce qui est fait dans ce mode n'est enregistre
  // -- voir FormulaireAvis/SignalerIncivilite/BoutonPhoto (prop
  // entrainement).

  let { onCommencer, onFermer } = $props()
</script>

<div class="instructions">
  <header>
    <button type="button" class="retour" onclick={() => onFermer?.()}>← Menu</button>
  </header>

  <h1>Votre avis peut compter !</h1>
  <p class="sous-titre">Essayez d'abord ici, sur un sanitaire fictif : rien de ce que vous ferez ne sera enregistré.</p>
  <p class="intro">
    Remplissez ce formulaire en fonction de votre temps disponible et de votre envie de faire changer
    les choses : plus vous en dites, plus l'impact est grand.
  </p>

  <ul class="points">
    <li><strong>Photos de la configuration et des équipements :</strong> limitées à 1 par catégorie pour que tout le monde puisse participer.</li>
    <li>
      <strong>Incivilités et vandalismes :</strong> arrêtez de faire avec, en vous bouchant le nez ! Le but de
      notre application est de remonter vos signalements aux équipes d'entretien et aux exploitants pour
      qu'ils agissent rapidement.
    </li>
  </ul>

  <button type="button" class="commencer" onclick={() => onCommencer?.()}>Commencer l'entraînement</button>
</div>

<style>
  .instructions {
    max-width: 480px;
    margin: 0 auto;
    padding: 1rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--texte);
  }

  header {
    display: flex;
  }

  .retour {
    min-height: 40px;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    cursor: pointer;
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--accent-texte);
    text-align: center;
  }

  .sous-titre {
    margin: 0;
    color: var(--texte-attenue);
    font-size: 0.82rem;
    line-height: 1.5;
    text-align: center;
  }

  .intro {
    margin: 0;
    color: var(--texte);
    font-size: 0.95rem;
    line-height: 1.6;
    text-align: center;
  }

  .points {
    margin: 0;
    padding: 1rem 1.2rem 1rem 2rem;
    background: var(--fond-carte);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .commencer {
    margin-top: 0.5rem;
    min-height: 50px;
    width: 100%;
    border-radius: 999px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
