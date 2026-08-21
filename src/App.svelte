<script>
  import EchelleEtat from './lib/components/EchelleEtat.svelte'

  let avisGeneral = $state(null)
  let etatLaveMain = $state('Abs')
  let etatPoubelle = $state('Abs')
</script>

<main>
  <h1>SpotSan V2</h1>
  <p class="sous-titre">Socle Vite + Svelte — Lot 0bis en cours.</p>

  <section>
    <h2>Démo du composant réutilisable — échelle d'état standard (§3.1)</h2>

    <EchelleEtat label="Avis général" bind:value={avisGeneral} />

    <EchelleEtat
      label="Lave-main"
      bind:value={etatLaveMain}
      extensions={['Abs', 'HS']}
    />

    <EchelleEtat
      label="Poubelle"
      bind:value={etatPoubelle}
      extensions={['Abs', 'Débordante']}
    />

    <p class="debug">
      avisGeneral = {avisGeneral ?? 'null'} · lave-main = {etatLaveMain} · poubelle = {etatPoubelle}
    </p>
  </section>
</main>

<style>
  main {
    max-width: 480px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .sous-titre {
    color: #666;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .debug {
    font-size: 0.8rem;
    color: #888;
  }
</style>
