<script>
  // Panneau "A propos" (retour utilisateur du 2026-08-22). Texte legal
  // repris tel quel de la convention deja en usage sur EkoMa/SpotSan v1
  // (voir memoire projet "centralized tool access").

  import { APP_VERSION, CHANGELOG } from '../version.js'

  let { onFerme } = $props()
  const dernier = CHANGELOG[0]
</script>

<div class="apropos">
  <h2>SpotSan {APP_VERSION}</h2>
  {#if dernier}
    <div class="changelog">
      <div class="titre">Nouveautés {dernier.version}</div>
      <ul>
        {#each dernier.items as i (i)}<li>{i}</li>{/each}
      </ul>
    </div>
  {/if}
  <p class="slogan">SpotSan est un service conçu par UrBizia.</p>
  <p class="legal">
    © 2026 UrBizia. Tous droits réservés. Cette application, son code source et les données
    qu'elle contient — hors données déjà issues du domaine public (OpenStreetMap, portails open
    data, INSEE/Etalab, etc.) — sont la propriété exclusive d'UrBizia. Toute reproduction,
    distribution, modification, extraction ou rétro-ingénierie, en tout ou partie, est
    strictement interdite sans autorisation écrite préalable d'UrBizia.
  </p>
  <p class="signature">Conception Gilles BRUN GAUTIER</p>
  <button type="button" class="fermer" onclick={() => onFerme?.()}>Fermer</button>
</div>

<style>
  .apropos {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  .slogan {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0;
  }

  .changelog {
    text-align: left;
    font-size: 0.78rem;
    color: var(--texte-attenue);
    line-height: 1.5;
  }

  .changelog .titre {
    font-weight: 700;
    color: var(--danger-texte);
    margin-bottom: 0.2rem;
  }

  .changelog ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  .legal {
    font-size: 0.72rem;
    color: var(--texte-attenue);
    line-height: 1.4;
    margin: 0;
  }

  .signature {
    font-size: 0.75rem;
    font-style: italic;
    color: var(--texte-attenue);
    margin: 0;
  }

  .fermer {
    min-height: 42px;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    font-weight: 600;
    cursor: pointer;
  }
</style>
