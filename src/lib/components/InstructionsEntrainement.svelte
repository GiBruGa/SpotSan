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

  <h1>S'entraîner sur SpotSan</h1>
  <p class="intro">
    Avant de donner un vrai avis, essayez tranquillement sur un sanitaire fictif —
    rien de ce que vous ferez ici ne sera enregistré, vous pouvez tout essayer sans risque.
  </p>

  <ul class="points">
    <li>Vous n'êtes pas obligé·e de tout remplir, mais plus vous en dites, plus vous aidez la communauté.</li>
    <li>
      Il n'y a qu'une photo possible par situation, prestation ou équipement, pour laisser de la place
      aux contributions des autres — mais tout ce que vous ajoutez sera visible par tout le monde.
    </li>
    <li>
      Nous vous encourageons à signaler les incivilités et vandalismes : le but est de faire remonter
      ces informations et vos avis aux services qui entretiennent les sanitaires, et de faire en sorte
      que les choses changent !
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
