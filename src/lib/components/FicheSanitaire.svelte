<script>
  // Fiche sanitaire en lecture (Lot 3, plan V2-PLAN.md §5.3). Bloc non
  // cliquable pour edition -- c'est la toute premiere confusion signalee
  // en debut de projet (les gens cliquent sur les donnees existantes en
  // esperant les modifier). Ordre impose par le plan : mention
  // "predecesseurs" > photos > stats avis+etat > configuration > equipements
  // > bouton "Donnez votre avis".

  import { onMount, onDestroy } from 'svelte'
  import { chargerSanitaire, chargerResumeAvis } from '../sanitaires.js'
  import { GROUPES_CELLULES, GENRES, EQUIPEMENTS } from '../config/cellules.js'
  import { STATUT_OPTIONS } from '../config/statut.js'
  import { ouvrirAvecRetour } from '../retourFerme.js'
  import IndicateurEtat from './IndicateurEtat.svelte'
  import EchelleEtat from './EchelleEtat.svelte'

  // Ordre des categories de photos impose par Gilles le 2026-09-03 (retour
  // de ses parents/oncles/tantes testeurs) : Environnement, Acces,
  // Signaletique, puis Confort/equipement (ordre deja bon, inchange) --
  // aligne sur l'etape "Photos" du formulaire (FormulaireAvis.svelte).
  const CATEGORIES_PHOTOS = ['environnement', 'acces', 'signaletique', 'confort']

  // entrainement=true (module "S'entrainer", 2026-09-02) : juste une
  // banniere ici, la fiche reste en lecture pure comme d'habitude -- la
  // simulation se joue dans FormulaireAvis/SignalerIncivilite en aval.
  let { ubId, entrainement = false, onDonnerAvis, onSignaler, onRetour } = $props()

  // En entrainement, Maps et Street View pointent volontairement vers 2 lieux
  // differents et sans rapport (chateau du Haut-Koenigsbourg / corniche de
  // Biarritz) plutot que vers les coordonnees du sanitaire fictif -- pour ne
  // pas laisser croire a une coherence photo/lieu qui n'existe pas (retour
  // Gilles, 2026-09-03).
  const COORDS_MAPS_ENTRAINEMENT = { lat: 48.2496, lon: 7.3444 }
  const COORDS_STREETVIEW_ENTRAINEMENT = { lat: 43.4834, lon: -1.5605 }

  let chargement = $state(true)
  let sanitaire = $state(null)
  let resume = $state(null)
  // Photo agrandie (retour Gilles du 2026-08-31 : le zoom sur une photo du
  // bandeau avait disparu -- lightbox plein ecran, ferme au clic n'importe ou,
  // ou au retour materiel/geste telephone (voir retourFerme.js).
  let photoAgrandie = $state(null)
  let fermerLightboxViaRetour = null

  function ouvrirPhoto(url) {
    photoAgrandie = url
    fermerLightboxViaRetour = ouvrirAvecRetour(() => {
      photoAgrandie = null
      fermerLightboxViaRetour = null
    })
  }

  function fermerPhoto() {
    fermerLightboxViaRetour?.()
    fermerLightboxViaRetour = null
    photoAgrandie = null
  }

  onMount(async () => {
    try {
      ;[sanitaire, resume] = await Promise.all([chargerSanitaire(ubId), chargerResumeAvis(ubId)])
    } catch (e) {
      console.error(e)
    } finally {
      chargement = false
    }
  })

  onDestroy(() => fermerLightboxViaRetour?.())

  function libelleStatut(valeur) {
    return STATUT_OPTIONS.find((o) => o.valeur === valeur)?.label ?? valeur
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
  {#if entrainement}<p class="banniere-entrainement">Mode entraînement — sanitaire fictif, rien ne sera enregistré</p>{/if}
  <header>
    <button type="button" class="retour" onclick={() => onRetour?.()}>← Carte</button>
    {#if sanitaire}<h1>{sanitaire.Name || ubId}</h1>{/if}
  </header>

  {#if chargement}
    <p class="etat">Chargement…</p>
  {:else if !sanitaire}
    <p class="etat erreur">Sanitaire introuvable.</p>
  {:else}
    {#if sanitaire.Latitude != null && sanitaire.Longitude != null}
      <div class="liens-carte">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${entrainement ? COORDS_MAPS_ENTRAINEMENT.lat : sanitaire.Latitude},${entrainement ? COORDS_MAPS_ENTRAINEMENT.lon : sanitaire.Longitude}`}
          target="_blank"
          rel="noopener"
        >📍 Google Maps</a>
        <a
          href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${entrainement ? COORDS_STREETVIEW_ENTRAINEMENT.lat : sanitaire.Latitude},${entrainement ? COORDS_STREETVIEW_ENTRAINEMENT.lon : sanitaire.Longitude}`}
          target="_blank"
          rel="noopener"
        >👁 Street View</a>
      </div>
    {/if}

    <p class="mention-predecesseurs">Informations données par vos prédécesseurs</p>

    <section class="bloc">
      <h2>Avis général</h2>
      {#if resume?.moyenne_avis_general != null}
        {#if resume.suffisant}
          <p class="note">D'après {resume.total_avis} avis.</p>
        {:else}
          <p class="note note-compacte">À confirmer, avis unique du {new Date(resume.dernier_avis.updated_at).toLocaleDateString('fr-FR')}</p>
        {/if}
        <EchelleEtat value={resume.moyenne_avis_general} lecture pleineLargeur />
        {#if resume.statuts_recents?.length}
          <!-- Decompte des 10 dernieres declarations de statut, triees par
               frequence decroissante -- reformule en phrase le 2026-09-04
               ("4x Disponible" tout seul n'etait pas comprehensible). -->
          {@const liste = resume.statuts_recents.map((s) => `${s.n} x ${libelleStatut(s.statut)}`).join(', ')}
          <p class="statut-recents">État de fonctionnement sur les dernières déclarations : {liste}</p>
        {/if}
      {:else}
        <p class="note">Aucun avis pour l'instant — soyez le premier à en laisser un.</p>
      {/if}
    </section>

    <section class="bloc">
      <h2>Photos</h2>
      {#if resume?.galerie_photos}
        {@const parCategorie = CATEGORIES_PHOTOS.map((cle) => resume.galerie_photos[cle] ?? [])}
        {@const apercu = parCategorie.flatMap((urls) => urls.slice(0, 3))}
        {@const reste = parCategorie.flatMap((urls) => urls.slice(3))}
        {@const toutesLesPhotos = [...apercu, ...reste]}
        {#if toutesLesPhotos.length}
          <!-- Les 3 photos les plus recentes de chaque categorie d'abord
               (dans l'ordre Environnement/Acces/Signaletique/Confort), puis
               le reste -- pour ne pas avoir a faire defiler beaucoup de
               photos d'une categorie avant d'atteindre celle qui interesse
               (retour Gilles du 2026-09-03). -->
          <div class="galerie-photos">
            {#each toutesLesPhotos as url (url)}
              <button type="button" class="photo-vignette" onclick={() => ouvrirPhoto(url)}>
                <img src={url} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
        {:else}
          <p class="note">Pas encore de photo.</p>
        {/if}
      {:else}
        <p class="note">Pas encore de photo.</p>
      {/if}
      <p class="note">Ajoutez des photos si vous le jugez utile, depuis « Donnez votre avis ».</p>
    </section>

    <section class="bloc">
      <h2>Configuration</h2>
      {#if resume?.etats_frequents?.length}
        {@const etatsTop = resume.etats_frequents[0].etats}
        {@const configTop = resume.configurations_plausibles?.[0]?.configuration ?? {}}
        {@const groupes = GROUPES_CELLULES.map((g) => ({
          groupe: g,
          lignes: g.genres.filter((genre) => etatsTop[`${g.cle}_${genre}`] && etatsTop[`${g.cle}_${genre}`] !== 'Abs'),
        })).filter((x) => x.lignes.length)}
        {@const changeBebe = configTop.change_bebe?.choix}
        {#if groupes.length || changeBebe}
          <p class="note">Les chiffres indiquent le nombre de cellules.</p>
          <div class="groupes-configuration">
            {#each groupes as { groupe: g, lignes } (g.cle)}
              <div class="carte-groupe-lecture">
                <span class="nom-groupe">{g.label}{configTop[g.cle]?.type ? ` — ${configTop[g.cle].type}` : ''}</span>
                <div class="puces">
                  {#each lignes as genreCle (genreCle)}
                    <span class="config-item"
                      >{g.genres.length > 1 ? `${GENRES.find((x) => x.cle === genreCle).label} : ` : ''}{etatsTop[`${g.cle}_${genreCle}`]}</span
                    >
                  {/each}
                </div>
              </div>
            {/each}
            {#if changeBebe}
              <div class="carte-groupe-lecture">
                <span class="nom-groupe">Change Bébé</span>
                <span class="config-item">{changeBebe}</span>
              </div>
            {/if}
          </div>
        {:else}
          <p class="note">Pas encore d'information.</p>
        {/if}
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
      {#if resume?.equipements_moyens && Object.keys(resume.equipements_moyens).length}
        <p class="note">Moyenne des 10 derniers avis.</p>
        <div class="liste-equipements">
          {#each EQUIPEMENTS as e (e.cle)}
            {#if resume.equipements_moyens[e.cle] != null}
              <IndicateurEtat label={e.label} valeur={resume.equipements_moyens[e.cle]} />
            {/if}
          {/each}
        </div>
      {:else}
        <p class="note">Pas encore d'information.</p>
      {/if}
    </section>

    <div class="actions">
      <button type="button" class="donner-avis" onclick={() => onDonnerAvis?.(ubId)}>
        Donnez votre avis
      </button>
      <button type="button" class="signaler" onclick={() => onSignaler?.(ubId)}>
        Signaler des Incivilités et Vandalismes
      </button>
    </div>
  {/if}
</div>

{#if photoAgrandie}
  <button type="button" class="photo-lightbox" onclick={fermerPhoto} aria-label="Fermer">
    <img src={photoAgrandie} alt="" />
  </button>
{/if}

<style>
  .fiche {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem 1rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    color: var(--texte);
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
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    cursor: pointer;
  }

  .etat {
    padding: 2rem;
    text-align: center;
    color: var(--texte-attenue);
  }

  .etat.erreur {
    color: var(--danger-texte);
  }

  .mention-predecesseurs {
    font-weight: 600;
    color: var(--accent-texte);
    margin: 0;
  }

  .banniere-entrainement {
    padding: 0.5rem 0.8rem;
    border-radius: 8px;
    background: var(--accent-fond);
    color: var(--accent-texte);
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
    margin: 0;
  }

  .liens-carte {
    display: flex;
    gap: 1rem;
  }

  .liens-carte a {
    font-size: 0.85rem;
    color: var(--accent-texte);
    text-decoration: none;
  }

  /* Bloc de lecture : aucun element cliquable a l'interieur (hors la
     vignette photo, cf. .photo-vignette, et le bouton "Donnez votre avis"
     en dehors de ce bloc) -- volontaire. */
  .bloc {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.7rem 0.9rem;
    background: var(--fond-carte);
    border-radius: 10px;
    pointer-events: none;
  }

  .bloc h2 {
    font-size: 0.9rem;
    margin: 0;
    pointer-events: none;
  }

  .a-venir,
  .note {
    font-size: 0.82rem;
    color: var(--texte-attenue);
    margin: 0;
  }

  .note-compacte {
    font-size: 0.78rem;
  }

  .galerie-photos {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
  }

  .photo-vignette {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    /* Seule exception cliquable du bloc en lecture -- voir commentaire .bloc. */
    pointer-events: auto;
  }

  .galerie-photos img {
    width: 84px;
    height: 84px;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }

  .photo-lightbox {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    border: none;
    background: rgba(0, 0, 0, 0.85);
    cursor: zoom-out;
  }

  .photo-lightbox img {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
    object-fit: contain;
  }

  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* Un cadre par groupe (Toilettes PMR, Urinoirs...), meme logique que
     .carte-groupe du formulaire -- pour reperer d'un coup d'oeil ou
     commence et ou finit chaque rubrique (retour Gilles du 2026-09-03). */
  .groupes-configuration {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .carte-groupe-lecture {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid var(--bordure);
    border-radius: 10px;
  }

  .nom-groupe {
    font-weight: 600;
    font-size: 0.85rem;
  }

  /* Liste a une seule colonne pour les equipements deja declares
     (retour Gilles du 2026-08-31) -- plus lisible qu'une ligne qui
     s'enchaine que la carte precedente (.puces). */
  .liste-equipements {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
  }

  /* Taille intermediaire (retour Gilles du 2026-09-04) : plus visible que
     .note (0.82rem, attenue) mais coherente avec les tailles deja en usage
     ailleurs dans la fiche (.nom-groupe, .config-item : 0.85rem). */
  .statut-recents {
    font-size: 0.95rem;
    color: var(--texte);
    margin: 0;
  }

  .config-item {
    font-size: 0.85rem;
    background: var(--fond);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.85rem;
  }

  /* Les deux actions sont volontairement aussi visibles l'une que
     l'autre (§5.6.3) -- signaler des Incivilites/Vandalismes n'est pas une
     fonction secondaire, c'est l'objet principal de l'outil. */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    pointer-events: auto;
  }

  /* Fond neutre + bordure/texte colores (meme traitement que "Supprimer
     mon compte", cf. BandeauEntete) plutot qu'un remplissage plein : deux
     remplissages de couleurs differentes donnaient l'impression que l'un
     des deux etait deja selectionne, sans qu'on sache lequel -- retour
     Gilles du 2026-08-31. Les deux boutons restent volontairement aussi
     visibles l'un que l'autre (§5.6.3, voir commentaire .actions). */
  .donner-avis,
  .signaler {
    min-height: 48px;
    border-radius: 999px;
    background: var(--fond);
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
  }

  .donner-avis {
    border: 1px solid var(--accent);
    color: var(--accent-texte);
  }

  .signaler {
    border: 1px solid var(--danger-texte);
    color: var(--danger-texte);
  }
</style>
