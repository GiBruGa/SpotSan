<script module>
  // Persiste au niveau du module (pas de l'instance) : Carte.svelte est
  // demonte/remonte a chaque aller-retour vers une fiche (le {#if} d'App.svelte
  // detruit le composant), donc un simple flag d'instance serait remis a
  // zero a chaque retour sur la carte. Ce flag, lui, ne se reinitialise
  // qu'au vrai rechargement de la page -- le centrage automatique sur la
  // position ne doit avoir lieu qu'a l'ouverture de l'appli, pas a chaque
  // fois qu'on revient sur la carte (retour Gilles du 2026-09-19).
  let dejaCentreAuMontage = false

  // Derniere vue (centre + zoom) avant un depart vers une fiche -- Carte.svelte
  // etant demonte/remonte a chaque aller-retour, sans ca le retour a la
  // carte repartait toujours de la vue par defaut (France entiere), meme
  // apres une recherche/un defilement (retour Gilles du 2026-09-19, meme
  // logique que dejaCentreAuMontage).
  let derniereVue = null
</script>

<script>
  // Carte (Lot 2, plan V2-PLAN.md §5.2 + retour utilisateur du 2026-08-22
  // qui a redemande les filtres de v1, retires par erreur au Lot 2).
  //
  // Le point bleu utilisateur reste au premier plan (pane Leaflet dedie,
  // au-dessus du pane des marqueurs/clusters) -- c'etait le tout premier
  // probleme signale au debut de ce projet.
  //
  // Filtres : port fidele de v1 (chips par famille de source +
  // affinages PMR/Enfant/4★ mini, combinables), voir classification.js.

  import { onMount, onDestroy } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import 'leaflet.markercluster'
  import 'leaflet.markercluster/dist/MarkerCluster.css'
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
  import { chargerSanitairesDansZone } from '../sanitaires.js'
  import { FAMILLES, COULEURS, BORDURES, LIBELLES, categorieAffichage, passeAffinages, chipsParDefaut, affinagesParDefaut } from '../classification.js'

  let { onChoixSanitaire } = $props()

  let conteneurCarte
  let map
  let groupes = {}
  let markerPosition
  let donneesBrutes = []

  let panneauOuvert = $state(false)
  let chips = $state(chipsParDefaut())
  let affinages = $state(affinagesParDefaut())
  let comptes = $state({ verified: 0, gouv: 0, osm: 0, certified: 0, supprimees: 0, hors_service: 0 })

  // Recherche d'une localisation autre que la position actuelle (demande
  // Gilles du 2026-08-31) -- geocodage via Nominatim (OpenStreetMap, gratuit,
  // coherent avec la bascule des tuiles CARTO -> OSM du meme jour).
  let rechercheTexte = $state('')
  let rechercheEnCours = $state(false)
  let rechercheErreur = $state('')

  // Liste des sanitaires connus les plus proches du lieu recherche (retour
  // Gilles du 2026-09-19, avant un depart en tournee) -- classee du plus
  // proche au plus loin, limitee a 15, recalculee a chaque rechargement de
  // donneesBrutes (voir rafraichirSanitaires) tant qu'un point de recherche
  // est actif. Clic sur un resultat : la carte se centre dessus au meme
  // niveau de zoom que le recentrage sur la position utilisateur (16, ~1km).
  const LIMITE_RESULTATS_RECHERCHE = 15
  let pointRecherche = $state(null) // { lat, lon } ou null
  let resultatsRecherche = $state([])

  function mettreAJourResultatsRecherche() {
    if (!pointRecherche) {
      resultatsRecherche = []
      return
    }
    const origine = L.latLng(pointRecherche.lat, pointRecherche.lon)
    resultatsRecherche = donneesBrutes
      .map((t) => ({ t, distance: origine.distanceTo(L.latLng(t.Latitude, t.Longitude)) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, LIMITE_RESULTATS_RECHERCHE)
  }

  function formaterDistance(m) {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
  }

  function allerVersResultat(t) {
    map.setView([t.Latitude, t.Longitude], 16)
    pointRecherche = null
    resultatsRecherche = []
  }

  async function rechercherLocalisation() {
    if (!rechercheTexte.trim()) return
    rechercheEnCours = true
    rechercheErreur = ''
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(rechercheTexte.trim())}`
      const reponse = await fetch(url)
      const resultats = await reponse.json()
      if (!resultats.length) {
        rechercheErreur = 'Rien trouvé pour cette recherche.'
        return
      }
      const { lat, lon } = resultats[0]
      pointRecherche = { lat: Number(lat), lon: Number(lon) }
      map.setView([pointRecherche.lat, pointRecherche.lon], 14)
      await rafraichirSanitaires() // garantit la liste meme si la vue ne bouge pas assez pour un 'moveend'
      panneauOuvert = false
    } catch (e) {
      console.error(e)
      rechercheErreur = 'Recherche impossible, réessayez.'
    } finally {
      rechercheEnCours = false
    }
  }

  const VUE_PAR_DEFAUT = { lat: 46.6, lon: 2.5, zoom: 6 } // France entiere

  // CARTO exige desormais une cle API pour ses fonds de carte (raster) --
  // watermark "API KEY REQUIRED" signale le 2026-08-31. Bascule sur OSM
  // standard : gratuit, sans cle, mais un seul style (pas de variante
  // sombre dediee comme avec CARTO dark_all/light_all).
  function ajouterTuiles() {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
  }

  function creerMarqueur(t, categorie) {
    const supprime = categorie === 'supprimees'
    const couleur = COULEURS[categorie]
    const marqueur = L.circleMarker([t.Latitude, t.Longitude], {
      radius: 8,
      weight: 2,
      color: BORDURES[categorie] ?? couleur,
      fillColor: couleur,
      fillOpacity: supprime ? 0.35 : 0.85,
      opacity: supprime ? 0.55 : 1,
    })
    marqueur.bindTooltip(t.Name || t.UB_id)
    marqueur.on('click', () => onChoixSanitaire?.(t.UB_id))
    return marqueur
  }

  /** Reconstruit les groupes a partir de donneesBrutes (deja en cache -- pas de requete reseau) selon les chips/affinages actifs. */
  function redessiner() {
    Object.values(groupes).forEach((g) => {
      map.removeLayer(g)
      g.clearLayers()
    })
    const nouveauxComptes = { verified: 0, gouv: 0, osm: 0, certified: 0, supprimees: 0, hors_service: 0 }

    for (const t of donneesBrutes) {
      if (t.Latitude == null || t.Longitude == null) continue
      if (!passeAffinages(t, affinages)) continue
      const categorie = categorieAffichage(t)
      nouveauxComptes[categorie]++
      groupes[categorie].addLayer(creerMarqueur(t, categorie))
    }

    comptes = nouveauxComptes
    Object.keys(chips).forEach((k) => {
      if (chips[k]) map.addLayer(groupes[k])
    })
  }

  // Limite adaptee au zoom (audit qualite du 2026-09-23) : a l'echelle
  // ville/quartier, quelques centaines de sanitaires suffisent largement --
  // inutile de demander la limite haute a chaque deplacement. A l'echelle
  // region/pays, on garde une limite haute pour ne pas revenir au
  // sous-comptage signale par Gilles le 2026-08-31 ("400 sur la France mais
  // 200 sur Bordeaux seul").
  function limitePourZoom(zoom) {
    if (zoom >= 14) return 500
    if (zoom >= 11) return 3000
    if (zoom >= 8) return 12000
    return 40000
  }

  async function rafraichirSanitaires() {
    try {
      donneesBrutes = await chargerSanitairesDansZone(map.getBounds(), limitePourZoom(map.getZoom()))
      redessiner()
      mettreAJourResultatsRecherche()
    } catch (e) {
      console.error('Chargement des sanitaires impossible', e)
    }
  }

  // Debounce sur moveend (audit qualite du 2026-09-23) : sans lui, chaque
  // micro-deplacement (drag en cours, molette repetee) relancait aussitot
  // une requete Supabase complete, chacune remplacant le resultat de la
  // precedente sans l'attendre -- gaspillage reseau important justement
  // dans le contexte d'usage vise (terrain, reseau degrade).
  let delaiRafraichissement
  function planifierRafraichissement() {
    clearTimeout(delaiRafraichissement)
    delaiRafraichissement = setTimeout(rafraichirSanitaires, 400)
  }

  function toggleChip(k) {
    chips[k] = !chips[k]
    redessiner()
  }

  function toggleAffinage(k) {
    affinages[k] = !affinages[k]
    redessiner()
  }

  function nombreFiltresActifs() {
    return Object.values(chips).filter(Boolean).length + Object.values(affinages).filter(Boolean).length
  }

  function placerPointUtilisateur(lat, lon) {
    const icone = L.divIcon({
      className: 'position-utilisateur-icone',
      html: '<div class="halo"></div><div class="point"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    if (markerPosition) {
      markerPosition.setLatLng([lat, lon])
    } else {
      markerPosition = L.marker([lat, lon], { icon: icone, pane: 'position-utilisateur', interactive: false }).addTo(map)
    }
  }

  function localiser() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placerPointUtilisateur(latitude, longitude)
        map.setView([latitude, longitude], 16)
      },
      () => {
        // Refus/echec geolocalisation : on reste sur la vue par defaut, degradation silencieuse (§3).
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  onMount(() => {
    const vueDepart = derniereVue ?? VUE_PAR_DEFAUT
    map = L.map(conteneurCarte, {
      center: [vueDepart.lat, vueDepart.lon],
      zoom: vueDepart.zoom,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    // Pane dedie, z-index au-dessus du pane des marqueurs/clusters (600) --
    // le point bleu ne doit plus jamais disparaitre sous les autres pins.
    map.createPane('position-utilisateur')
    map.getPane('position-utilisateur').style.zIndex = 650

    ajouterTuiles()

    for (const k of [...FAMILLES, 'supprimees', 'hors_service']) {
      groupes[k] = L.markerClusterGroup()
    }

    map.on('moveend', () => {
      const centre = map.getCenter()
      derniereVue = { lat: centre.lat, lon: centre.lng, zoom: map.getZoom() }
      planifierRafraichissement()
    })
    rafraichirSanitaires()
    if (!dejaCentreAuMontage) {
      dejaCentreAuMontage = true
      localiser()
    }
  })

  onDestroy(() => {
    clearTimeout(delaiRafraichissement)
    map?.remove()
  })
</script>

<div class="carte" bind:this={conteneurCarte}>
  <!-- Recentrage sur la position (retour Gilles du 2026-09-19) : le
       centrage automatique ne se fait plus qu'a l'ouverture de l'appli
       (voir dejaCentreAuMontage) -- ce bouton couvre le cas ou l'usager
       s'est deplace sur la carte (recherche, defilement) et veut revenir
       a sa position reelle. -->
  <button type="button" class="bouton-recentrer" onclick={localiser} aria-label="Recentrer sur ma position">
    📍
  </button>

  <div class="filtres">
    <form class="recherche" onsubmit={(e) => (e.preventDefault(), rechercherLocalisation())}>
      <input
        type="search"
        bind:value={rechercheTexte}
        placeholder="Chercher une ville, une adresse…"
        aria-label="Chercher une localisation"
      />
      <button type="submit" class="recherche-bouton" disabled={rechercheEnCours} aria-label="Chercher">
        {rechercheEnCours ? '…' : '🔍'}
      </button>
    </form>
    {#if rechercheErreur}<p class="recherche-erreur">{rechercheErreur}</p>{/if}

    {#if resultatsRecherche.length}
      <ul class="resultats-recherche">
        {#each resultatsRecherche as { t, distance } (t.UB_id)}
          <li>
            <button type="button" onclick={() => allerVersResultat(t)}>
              <span class="resultat-nom">{t.Name || t.UB_id}</span>
              <span class="resultat-distance">{formaterDistance(distance)}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <button type="button" class="filtres-entete" onclick={() => (panneauOuvert = !panneauOuvert)}>
      <span>⚙ Filtres</span>
      <span class="filtres-nombre">({nombreFiltresActifs()})</span>
      <span class="filtres-caret">{panneauOuvert ? '▴' : '▾'}</span>
    </button>

    {#if panneauOuvert}
      <div class="filtres-panneau">
        <!-- Liste a cocher, colonne unique (demande Gilles du 2026-08-31 --
             remplace les puces qui s'enchainaient en ligne, peu lisibles). -->
        <div class="filtres-cases">
          {#each [...FAMILLES, 'hors_service', 'supprimees'] as k (k)}
            <label class="case-filtre">
              <input type="checkbox" checked={chips[k]} onchange={() => toggleChip(k)} />
              <span class="pastille" style="background:{COULEURS[k]}; {BORDURES[k] ? `border:1.5px solid ${BORDURES[k]}` : ''}"></span>
              <span class="case-libelle">{LIBELLES[k]}</span>
              {#if comptes[k]}<span class="chip-n">{comptes[k]}</span>{/if}
            </label>
          {/each}
        </div>
        <div class="filtres-cases filtres-affinages">
          <label class="case-filtre">
            <input type="checkbox" checked={affinages.pmr} onchange={() => toggleAffinage('pmr')} />
            <span class="case-libelle">PMR</span>
          </label>
          <label class="case-filtre">
            <input type="checkbox" checked={affinages.enfant} onchange={() => toggleAffinage('enfant')} />
            <span class="case-libelle">Enfant</span>
          </label>
          <label class="case-filtre">
            <input type="checkbox" checked={affinages.bienNotees} onchange={() => toggleAffinage('bienNotees')} />
            <span class="case-libelle">4★ mini</span>
          </label>
          <label class="case-filtre">
            <input type="checkbox" checked={affinages.accesLimite} onchange={() => toggleAffinage('accesLimite')} />
            <span class="case-libelle">dont Accès limité aux personnes ayant accès au bâtiment</span>
          </label>
          <label class="case-filtre">
            <input type="checkbox" checked={affinages.accessibleNuit} onchange={() => toggleAffinage('accessibleNuit')} />
            <span class="case-libelle">Exclusivement accessible de nuit</span>
          </label>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .carte {
    position: absolute;
    inset: 0;
    /* isolation : sans ca, les z-index internes de Leaflet (jusqu'a 1000
       pour ses controles) remontent hors de .carte et passent devant le
       menu du bandeau (z-index 20) -- le menu reste bien ouvert dans le
       DOM mais invisible, cache sous la carte (bug du 2026-08-31). */
    isolation: isolate;
  }

  .bouton-recentrer {
    position: absolute;
    bottom: 1.6rem;
    right: 0.6rem;
    z-index: 700;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid #ccc;
    background: #fff;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }

  .filtres {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    z-index: 700;
    max-width: calc(100% - 1.2rem);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
  }

  .recherche {
    display: flex;
    width: min(18rem, 70vw);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }

  .recherche input {
    flex: 1;
    min-height: 38px;
    border: none;
    padding: 0 0.9rem;
    font-size: 0.85rem;
    color: #1a1414;
    background: transparent;
  }

  .recherche-bouton {
    min-width: 38px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .recherche-bouton:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .recherche-erreur {
    margin: 0;
    padding: 0.2rem 0.8rem;
    background: #fff;
    border-radius: 8px;
    font-size: 0.78rem;
    color: #c55a7a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  /* Liste des sanitaires connus les plus proches du lieu recherche
     (retour Gilles du 2026-09-19) -- meme carte blanche que les autres
     panneaux flottants de cette carte, hauteur plafonnee + defilement des
     que la quinzaine de resultats deborde. */
  .resultats-recherche {
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0.3rem;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    max-height: 55vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .resultats-recherche button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    min-height: 42px;
    padding: 0 0.6rem;
    border: none;
    border-radius: 6px;
    background: none;
    color: #1a1414;
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
  }

  .resultats-recherche button:hover {
    background: #f5f0eb;
  }

  .resultat-nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .resultat-distance {
    flex-shrink: 0;
    color: #666;
    font-size: 0.78rem;
  }

  .filtres-entete {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 38px;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: none;
    background: #fff;
    color: #1a1414;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }

  .filtres-nombre {
    color: #540e28;
  }

  .filtres-panneau {
    margin-top: 0.4rem;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    padding: 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 15rem;
  }

  .filtres-cases {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .filtres-affinages {
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
  }

  .case-filtre {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 38px;
    padding: 0 0.3rem;
    border-radius: 6px;
    color: #1a1414;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .case-filtre input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #540e28;
    flex-shrink: 0;
    cursor: pointer;
  }

  .case-libelle {
    flex: 1;
  }

  .pastille {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .chip-n {
    color: #888;
    font-size: 0.72rem;
  }

  :global(.position-utilisateur-icone) {
    position: relative;
  }

  :global(.position-utilisateur-icone .halo) {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.28);
  }

  :global(.position-utilisateur-icone .point) {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #2563eb;
    border: 2px solid #fff;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
  }
</style>
