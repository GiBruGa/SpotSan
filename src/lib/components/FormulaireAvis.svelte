<script>
  // Formulaire "Donner son avis" (plan V2-PLAN.md §5.5, Lot 5).
  // 3 etapes + boutons flottants Sauvegarder / Sortir sans sauvegarder.
  // Reprend le dernier avis de l'utilisateur s'il existe (§5.4).

  import { onMount } from 'svelte'
  import EchelleEtat from './EchelleEtat.svelte'
  import BoutonPhoto from './BoutonPhoto.svelte'
  import { CELLULES, ACCESSIBILITE_OPTIONS, TYPE_OPTIONS, EQUIPEMENTS } from '../config/cellules.js'
  import { chargerDernierAvis } from '../avis.js'
  import { sauvegarderAvis } from '../queueAvis.js'

  const SIGNALETIQUE_OPTIONS = [
    { valeur: 'Disponible', label: 'Disponible' },
    { valeur: 'Indisponible_nettoyage', label: 'Momentanément indisponible (nettoyage)' },
    { valeur: 'Condamne_HS', label: 'Condamné / HS' },
  ]

  let { userId, ubId, nomLieu = '', onFerme } = $props()

  let chargement = $state(true)
  let dateDernierAvis = $state(null)
  let etape = $state(1)
  let enregistrement = $state(false)
  let messageStatut = $state('')

  // etats demarre avec toutes les cles a 'Abs' (par defaut, cf. §3.1/§5.5)
  // -- necessaire aussi pour que bind:value={etats[cle]} ait toujours une
  // valeur existante des le premier rendu (sinon Svelte 5 refuse le bind
  // sur une cle absente de l'objet reactif).
  function etatsParDefaut() {
    return Object.fromEntries([...CELLULES, ...EQUIPEMENTS].map((x) => [x.cle, 'Abs']))
  }

  let avisGeneral = $state(null)
  let commentaire = $state('')
  let configuration = $state({})
  let etats = $state(etatsParDefaut())
  let eclairageNaturel = $state(null)
  let verrouMecanique = $state(null)

  // Etape 4 -- photos (Lot 6, §5.6). Niveau 1 : champs structures avec
  // finalite propre a chacun (§5.6.1). Niveau 2 : photos taguees
  // confort/equipements, liste fermee (§5.6.2).
  let photoVueLoin = $state(null)
  let signaletique = $state(null)
  let photoSignaletique = $state(null)
  let photoAcces = $state(null)
  let photosConfort = $state([])

  function ajouterPhotoConfort(tag, url) {
    photosConfort = [...photosConfort, { tag, url }]
  }
  function retirerPhotoConfort(index) {
    photosConfort = photosConfort.filter((_, i) => i !== index)
  }

  function accessibilite(cle) {
    return configuration[cle]?.accessibilite ?? null
  }
  function definirAccessibilite(cle, val) {
    configuration[cle] = { ...configuration[cle], accessibilite: configuration[cle]?.accessibilite === val ? null : val }
  }
  function type(cle) {
    return configuration[cle]?.type ?? null
  }
  function definirType(cle, val) {
    configuration[cle] = { ...configuration[cle], type: configuration[cle]?.type === val ? null : val }
  }
  function sousChoix(cle) {
    return configuration[cle]?.sousChoix ?? null
  }
  function definirSousChoix(cle, val) {
    configuration[cle] = { ...configuration[cle], sousChoix: configuration[cle]?.sousChoix === val ? null : val }
  }

  onMount(async () => {
    try {
      const dernier = await chargerDernierAvis(userId, ubId)
      if (dernier) {
        dateDernierAvis = dernier.updated_at
        avisGeneral = dernier.avis_general
        commentaire = dernier.commentaire ?? ''
        configuration = dernier.configuration ?? {}
        etats = { ...etatsParDefaut(), ...(dernier.etats ?? {}) }
        eclairageNaturel = dernier.eclairage_naturel
        verrouMecanique = dernier.verrou_mecanique
        photoVueLoin = dernier.photo_vue_loin
        signaletique = dernier.signaletique
        photoSignaletique = dernier.photo_signaletique
        photoAcces = dernier.photo_acces
        photosConfort = dernier.photos_confort ?? []
      }
    } catch (e) {
      console.error(e)
    } finally {
      chargement = false
    }
  })

  async function sauvegarder() {
    enregistrement = true
    messageStatut = ''
    try {
      const { horsLigne } = await sauvegarderAvis({
        user_id: userId,
        ub_id: ubId,
        avis_general: avisGeneral,
        commentaire: commentaire.trim() || null,
        configuration,
        etats,
        eclairage_naturel: eclairageNaturel,
        verrou_mecanique: verrouMecanique,
        photo_vue_loin: photoVueLoin,
        signaletique,
        photo_signaletique: photoSignaletique,
        photo_acces: photoAcces,
        photos_confort: photosConfort,
      })
      messageStatut = horsLigne
        ? 'Pas de réseau — ton avis est enregistré sur ton téléphone et sera envoyé dès que possible.'
        : 'Avis enregistré.'
      setTimeout(() => onFerme?.(), 900)
    } catch (e) {
      console.error(e)
      messageStatut = "Erreur inattendue, réessaie."
    } finally {
      enregistrement = false
    }
  }
</script>

<div class="formulaire-avis">
  {#if chargement}
    <p class="etat-chargement">Chargement…</p>
  {:else}
    <header>
      <h1>Donner mon avis{nomLieu ? ` — ${nomLieu}` : ''}</h1>
      {#if dateDernierAvis}
        <p class="reprise">
          Reprise de ton dernier avis du {new Date(dateDernierAvis).toLocaleDateString('fr-FR')} —
          modifie ce qui a changé.
        </p>
      {/if}
      <div class="etapes-nav">
        <button type="button" class:active={etape === 1} onclick={() => (etape = 1)}>1. Avis</button>
        <button type="button" class:active={etape === 2} onclick={() => (etape = 2)}>2. Configuration</button>
        <button type="button" class:active={etape === 3} onclick={() => (etape = 3)}>3. Équipements</button>
        <button type="button" class:active={etape === 4} onclick={() => (etape = 4)}>4. Photos</button>
      </div>
    </header>

    <div class="contenu">
      {#if etape === 1}
        <section>
          <EchelleEtat label="Avis général" bind:value={avisGeneral} />
          <label class="champ">
            <span>Commentaire (facultatif)</span>
            <textarea bind:value={commentaire} rows="3" maxlength="500" placeholder="Ex. nettoyage par arrosage au sol, attention aux robes/pantalons longs…"></textarea>
          </label>
        </section>
      {:else if etape === 2}
        <section class="grille-configuration">
          {#each CELLULES as c (c.cle)}
            <div class="ligne-cellule">
              <span class="nom-cellule">{c.label}</span>
              <EchelleEtat bind:value={etats[c.cle]} extensions={['Abs', 'HS']} />
              {#if etats[c.cle] && etats[c.cle] !== 'Abs'}
                <div class="sous-options">
                  <div class="chips">
                    {#each ACCESSIBILITE_OPTIONS as a (a)}
                      <button type="button" class:selected={accessibilite(c.cle) === a} onclick={() => definirAccessibilite(c.cle, a)}>{a}</button>
                    {/each}
                  </div>
                  {#if c.avecType}
                    <div class="chips">
                      {#each TYPE_OPTIONS as t (t)}
                        <button type="button" class:selected={type(c.cle) === t} onclick={() => definirType(c.cle, t)}>{t}</button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </section>
      {:else if etape === 3}
        <section class="grille-equipements">
          {#each EQUIPEMENTS as e (e.cle)}
            <div class="ligne-equipement">
              <EchelleEtat label={e.label} bind:value={etats[e.cle]} extensions={e.extensions} />
              {#if e.sousChoix && etats[e.cle] && etats[e.cle] !== 'Abs'}
                <div class="chips">
                  {#each e.sousChoix as s (s)}
                    <button type="button" class:selected={sousChoix(e.cle) === s} onclick={() => definirSousChoix(e.cle, s)}>{s}</button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <div class="ligne-equipement">
            <span class="nom-cellule">Éclairage naturel</span>
            <div class="chips">
              <button type="button" class:selected={eclairageNaturel === true} onclick={() => (eclairageNaturel = eclairageNaturel === true ? null : true)}>Oui</button>
              <button type="button" class:selected={eclairageNaturel === false} onclick={() => (eclairageNaturel = eclairageNaturel === false ? null : false)}>Non</button>
            </div>
          </div>
          <div class="ligne-equipement">
            <span class="nom-cellule">Verrou mécanique de sûreté</span>
            <div class="chips">
              <button type="button" class:selected={verrouMecanique === true} onclick={() => (verrouMecanique = verrouMecanique === true ? null : true)}>Oui</button>
              <button type="button" class:selected={verrouMecanique === false} onclick={() => (verrouMecanique = verrouMecanique === false ? null : false)}>Non</button>
            </div>
          </div>
        </section>
      {:else if etape === 4}
        <section class="grille-photos">
          <div class="groupe-photo">
            <h3>Vue de loin</h3>
            <BoutonPhoto
              consigne="Repérer le sanitaire dans son environnement : cadre depuis l'endroit où on arrive (rue, parking, allée), pas un gros plan."
              bind:valeur={photoVueLoin}
            />
          </div>

          <div class="groupe-photo">
            <h3>Signalétique</h3>
            <div class="chips">
              {#each SIGNALETIQUE_OPTIONS as opt (opt.valeur)}
                <button
                  type="button"
                  class:selected={signaletique === opt.valeur}
                  onclick={() => (signaletique = signaletique === opt.valeur ? null : opt.valeur)}
                >{opt.label}</button>
              {/each}
            </div>
            <BoutonPhoto
              consigne="Rendre l'état vérifiable : cadre le panneau ou l'indicateur lui-même (affiche de fermeture, voyant), pas une vue large."
              bind:valeur={photoSignaletique}
            />
          </div>

          <div class="groupe-photo">
            <h3>Accès</h3>
            <BoutonPhoto
              consigne="Juger l'accessibilité avant de se déplacer : cadre le cheminement (porte, marches, rampe) pour que largeur et pente soient visibles."
              bind:valeur={photoAcces}
            />
          </div>

          <div class="groupe-photo">
            <h3>Confort / équipements (facultatif)</h3>
            <p class="note-photos">Pour donner une idée à quoi ça ressemble, sans être normatif.</p>
            <div class="tags-confort">
              {#each EQUIPEMENTS as e (e.cle)}
                <div class="tag-confort">
                  <BoutonPhoto onTermine={(url) => ajouterPhotoConfort(e.label, url)} />
                  <span class="tag-confort-label">{e.label}</span>
                </div>
              {/each}
            </div>
            {#if photosConfort.length}
              <ul class="liste-photos-confort">
                {#each photosConfort as p, i (i)}
                  <li>
                    <img src={p.url} alt={p.tag} />
                    <span>{p.tag}</span>
                    <button type="button" onclick={() => retirerPhotoConfort(i)}>Retirer</button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </section>
      {/if}
    </div>

    {#if messageStatut}<p class="statut">{messageStatut}</p>{/if}

    <div class="boutons-flottants">
      <button type="button" class="sortir" onclick={() => onFerme?.()}>Sortir sans sauvegarder</button>
      <button type="button" class="sauvegarder" disabled={enregistrement} onclick={sauvegarder}>
        {enregistrement ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  {/if}
</div>

<style>
  .formulaire-avis {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem 1rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .etat-chargement {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  header h1 {
    font-size: 1.2rem;
    margin: 0 0 0.3rem;
  }

  .reprise {
    font-size: 0.82rem;
    color: #666;
    margin: 0 0 0.6rem;
  }

  .etapes-nav {
    display: flex;
    gap: 0.4rem;
  }

  .etapes-nav button {
    flex: 1;
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .etapes-nav button.active {
    border-color: #540e28;
    background: #540e28;
    color: #fff;
    font-weight: 600;
  }

  .contenu {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.9rem;
  }

  textarea {
    border-radius: 8px;
    border: 1px solid #ccc;
    padding: 0.6rem;
    font: inherit;
    color: #1a1414;
    background: #fff;
    resize: vertical;
  }

  .grille-configuration,
  .grille-equipements {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ligne-cellule,
  .ligne-equipement {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid #eee;
  }

  .nom-cellule {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .sous-options {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-left: 0.2rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips button {
    min-height: 40px;
    padding: 0 0.7rem;
    border-radius: 999px;
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .chips button.selected {
    border-color: #540e28;
    background: #f6dde3;
    font-weight: 600;
  }

  .grille-photos {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .groupe-photo h3 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
  }

  .note-photos {
    font-size: 0.8rem;
    color: #888;
    margin: 0 0 0.6rem;
  }

  .tags-confort {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .tag-confort {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    width: 5.5rem;
  }

  .tag-confort-label {
    font-size: 0.72rem;
    text-align: center;
    color: #444;
  }

  .liste-photos-confort {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .liste-photos-confort li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.82rem;
  }

  .liste-photos-confort img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }

  .liste-photos-confort button {
    margin-left: auto;
    border: none;
    background: none;
    color: #c55a7a;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .statut {
    font-size: 0.85rem;
    text-align: center;
    color: #333;
  }

  .boutons-flottants {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 1rem calc(0.8rem + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  }

  .boutons-flottants button {
    flex: 1;
    min-height: 48px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .sortir {
    border: 1px solid #ccc;
    background: #fff;
    color: #1a1414;
  }

  .sauvegarder {
    border: none;
    background: #540e28;
    color: #fff;
  }

  .sauvegarder:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
