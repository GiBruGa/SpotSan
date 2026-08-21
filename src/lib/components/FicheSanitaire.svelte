<script>
  // Fiche sanitaire en lecture (Lot 3, plan V2-PLAN.md §5.3). Bloc non
  // cliquable pour edition -- c'est la toute premiere confusion signalee
  // en debut de projet (les gens cliquent sur les donnees existantes en
  // esperant les modifier). Ordre impose par le plan : mention
  // "predecesseurs" > photos > stats avis+etat > configuration > equipements
  // > bouton "Donnez votre avis".

  import { onMount } from 'svelte'
  import { chargerSanitaire, chargerResumeAvis } from '../sanitaires.js'
  import { CELLULES, EQUIPEMENTS } from '../config/cellules.js'
  import IndicateurEtat from './IndicateurEtat.svelte'

  let { ubId, onDonnerAvis, onRetour } = $props()

  let chargement = $state(true)
  let sanitaire = $state(null)
  let resume = $state(null)

  onMount(async () => {
    try {
      ;[sanitaire, resume] = await Promise.all([chargerSanitaire(ubId), chargerResumeAvis(ubId)])
    } catch (e) {
      console.error(e)
    } finally {
      chargement = false
    }
  })

  function libelle(cle, liste) {
    return liste.find((x) => x.cle === cle)?.label ?? cle
  }

  // Fallback vers les comptages v1 (deja fiables, source StatSan) quand
  // il n'y a pas encore assez d'avis V2 pour une configuration plausible.
  function configurationHeritee(s) {
    const items = []
    if (s.PMR > 0) items.push(`${s.PMR} toilette(s) PMR`)
    if (s.MSB > 0) items.push(`${s.MSB} toilette(s) standard`)
    if (s.Urinals > 0) items.push(`${s.Urinals} urinoir(s) homme`)
    if (s.Urinals_Femme > 0) items.push(`${s.Urinals_Femme} urinoir(s) femme`)
    if (s.Showers > 0) items.push(`${s.Showers} douche(s)`)
    if (s.ChangingRooms > 0) items.push(`${s.ChangingRooms} vestiaire(s)`)
    return items
  }
</script>

<div class="fiche">
  <header>
    <button type="button" class="retour" onclick={() => onRetour?.()}>← Carte</button>
    {#if sanitaire}<h1>{sanitaire.Name || ubId}</h1>{/if}
  </header>

  {#if chargement}
    <p class="etat">Chargement…</p>
  {:else if !sanitaire}
    <p class="etat erreur">Sanitaire introuvable.</p>
  {:else}
    <p class="mention-predecesseurs">Informations données par vos prédécesseurs</p>

    <section class="bloc">
      <h2>Photos</h2>
      <p class="a-venir">Photos à venir (Lot 6).</p>
    </section>

    <section class="bloc">
      <h2>Avis général et état</h2>
      {#if resume?.suffisant}
        <p class="note">D'après {resume.total_avis} avis.</p>
        {#each resume.etats_frequents as ef, i (i)}
          <div class="ligne-resume">
            <span class="frequence">{ef.frequence}×</span>
            <div class="puces">
              {#each Object.entries(ef.etats).filter(([, v]) => v !== 'Abs') as [cle, val] (cle)}
                <IndicateurEtat label={libelle(cle, [...CELLULES, ...EQUIPEMENTS])} valeur={val} />
              {/each}
            </div>
          </div>
        {/each}
      {:else if resume?.dernier_avis}
        <p class="note">À confirmer — un seul avis pour l'instant, du {new Date(resume.dernier_avis.updated_at).toLocaleDateString('fr-FR')}.</p>
        <IndicateurEtat label="Avis général" valeur={resume.dernier_avis.avis_general} />
        {#if resume.dernier_avis.commentaire}<p class="commentaire">« {resume.dernier_avis.commentaire} »</p>{/if}
      {:else}
        <p class="note">Aucun avis pour l'instant — sois le premier à en laisser un.</p>
      {/if}
    </section>

    <section class="bloc">
      <h2>Configuration</h2>
      {#if resume?.configurations_plausibles?.length}
        {#each resume.configurations_plausibles as cp, i (i)}
          <div class="ligne-resume">
            <span class="frequence">{cp.frequence}×</span>
            <div class="puces">
              {#each Object.entries(cp.configuration) as [cle, val] (cle)}
                <span class="config-item">{libelle(cle, CELLULES)}{val?.accessibilite ? ` (${val.accessibilite})` : ''}{val?.type ? ` — ${val.type}` : ''}</span>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        {@const items = configurationHeritee(sanitaire)}
        {#if items.length}
          <p class="note">D'après la fiche de base (pas encore assez d'avis pour une configuration détaillée) :</p>
          <ul>
            {#each items as it (it)}<li>{it}</li>{/each}
          </ul>
        {:else}
          <p class="note">Pas encore d'information.</p>
        {/if}
      {/if}
    </section>

    <section class="bloc">
      <h2>Équipements</h2>
      {#if resume?.etats_frequents?.length}
        <div class="puces">
          {#each EQUIPEMENTS as e (e.cle)}
            {#if resume.etats_frequents[0]?.etats[e.cle] && resume.etats_frequents[0].etats[e.cle] !== 'Abs'}
              <IndicateurEtat label={e.label} valeur={resume.etats_frequents[0].etats[e.cle]} />
            {/if}
          {/each}
        </div>
      {:else}
        <p class="note">Pas encore d'information.</p>
      {/if}
    </section>

    <button type="button" class="donner-avis" onclick={() => onDonnerAvis?.(ubId)}>
      Donnez votre avis
    </button>
  {/if}
</div>

<style>
  .fiche {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem 1rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  header h1 {
    font-size: 1.15rem;
    margin: 0;
  }

  .retour {
    min-height: 40px;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    cursor: pointer;
  }

  .etat {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .etat.erreur {
    color: #c55a7a;
  }

  .mention-predecesseurs {
    font-weight: 600;
    color: #540e28;
    margin: 0;
  }

  /* Bloc de lecture : aucun element cliquable a l'interieur (hors le
     bouton "Donnez votre avis", en dehors de ce bloc) -- volontaire. */
  .bloc {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.9rem 1rem;
    background: #f5f0eb;
    border-radius: 10px;
    pointer-events: none;
  }

  .bloc h2 {
    font-size: 0.95rem;
    margin: 0;
    pointer-events: none;
  }

  .a-venir,
  .note {
    font-size: 0.85rem;
    color: #666;
    margin: 0;
  }

  .commentaire {
    font-size: 0.85rem;
    font-style: italic;
    margin: 0;
  }

  .ligne-resume {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .frequence {
    font-size: 0.78rem;
    color: #888;
    min-width: 1.6rem;
  }

  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .config-item {
    font-size: 0.85rem;
    background: #fff;
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.85rem;
  }

  .donner-avis {
    min-height: 48px;
    border-radius: 999px;
    border: none;
    background: #540e28;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
  }
</style>
