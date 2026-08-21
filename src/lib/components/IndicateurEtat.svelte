<script>
  // Affichage en LECTURE SEULE d'une valeur de l'echelle standard (§3.1) --
  // jamais de bouton ici. Le bloc "informations donnees par vos
  // predecesseurs" (§5.3) ne doit pas etre cliquable/editable in situ :
  // c'etait la toute premiere confusion signalee ("les gens cliquent sur
  // les donnees existantes en esperant les modifier").

  let { label = '', valeur } = $props()

  const NIVEAUX = {
    1: { emoji: '👎', classe: 'negatif' },
    2: { emoji: '🙁', classe: 'negatif' },
    3: { emoji: '😐', classe: 'neutre' },
    4: { emoji: '🙂', classe: 'positif' },
    5: { emoji: '👍', classe: 'positif' },
  }

  function info(v) {
    if (v == null) return { texte: '—', classe: 'neutre' }
    if (typeof v === 'number') return { texte: NIVEAUX[v]?.emoji ?? '—', classe: NIVEAUX[v]?.classe ?? 'neutre' }
    if (v === 'Abs') return { texte: 'Abs', classe: 'neutre' }
    return { texte: v, classe: 'negatif' } // HS / Vide / Débordante
  }
</script>

<span class="indicateur {info(valeur).classe}">
  {#if label}<span class="label">{label}</span>{/if}
  <span class="valeur">{info(valeur).texte}</span>
</span>

<style>
  .indicateur {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .label {
    font-size: 0.85rem;
  }

  .valeur {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.6rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .negatif .valeur {
    background: #c55a7a;
    color: #fff;
  }

  .neutre .valeur {
    background: #ddd5cb;
    color: #1a1414;
  }

  .positif .valeur {
    background: #c9ffc3;
    color: #1a1414;
  }
</style>
