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
  import { FAMILLES, COULEURS, LIBELLES, classifier, passeAffinages, chipsParDefaut, affinagesParDefaut } from '../classification.js'

  let { onChoixSanitaire } = $props()

  let conteneurCarte
  let map
  let groupes = {}
  let markerPosition
  let donneesBrutes = []

  let panneauOuvert = $state(false)
  let chips = $state(chipsParDefaut())
  let affinages = $state(affinagesParDefaut())
  let comptes = $state({ verified: 0, gouv: 0, osm: 0, certified: 0, supprimees: 0 })

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

  function creerMarqueur(t, categorie, supprime) {
    const couleur = supprime ? COULEURS.supprimees : COULEURS[categorie]
    const marqueur = L.circleMarker([t.Latitude, t.Longitude], {
      radius: 8,
      weight: 2,
      color: couleur,
      fillColor: couleur,
      fillOpacity: supprime ? 0.35 : 0.85,
      opacity: supprime ? 0.55 : 1,
    })
    marqueur.bindTooltip(t.Name || t.UB_id)
    marqueur.on('click', () => onChoixSanitaire?.(t.UB_id))
    return marqueur
  }

  /** Reconstruit les 5 groupes a partir de donneesBrutes (deja en cache -- pas de requete reseau) selon les chips/affinages actifs. */
  function redessiner() {
    Object.values(groupes).forEach((g) => {
      map.removeLayer(g)
      g.clearLayers()
    })
    const nouveauxComptes = { verified: 0, gouv: 0, osm: 0, certified: 0, supprimees: 0 }

    for (const t of donneesBrutes) {
      if (t.Latitude == null || t.Longitude == null) continue
      if (!passeAffinages(t, affinages)) continue
      const supprime = t.Exists === false
      const categorie = supprime ? 'supprimees' : classifier(t)
      nouveauxComptes[categorie]++
      groupes[categorie].addLayer(creerMarqueur(t, categorie, supprime))
    }

    comptes = nouveauxComptes
    Object.keys(chips).forEach((k) => {
      if (chips[k]) map.addLayer(groupes[k])
    })
  }

  async function rafraichirSanitaires() {
    try {
      donneesBrutes = await chargerSanitairesDansZone(map.getBounds())
      redessiner()
    } catch (e) {
      console.error('Chargement des sanitaires impossible', e)
    }
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
    map = L.map(conteneurCarte, {
      center: [VUE_PAR_DEFAUT.lat, VUE_PAR_DEFAUT.lon],
      zoom: VUE_PAR_DEFAUT.zoom,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    // Pane dedie, z-index au-dessus du pane des marqueurs/clusters (600) --
    // le point bleu ne doit plus jamais disparaitre sous les autres pins.
    map.createPane('position-utilisateur')
    map.getPane('position-utilisateur').style.zIndex = 650

    ajouterTuiles()

    for (const k of [...FAMILLES, 'supprimees']) {
      groupes[k] = L.markerClusterGroup()
    }

    map.on('moveend', rafraichirSanitaires)
    rafraichirSanitaires()
    localiser()
  })

  onDestroy(() => {
    map?.remove()
  })
</script>

<div class="carte" bind:this={conteneurCarte}>
  <div class="filtres">
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
          {#each [...FAMILLES, 'supprimees'] as k (k)}
            <label class="case-filtre">
              <input type="checkbox" checked={chips[k]} onchange={() => toggleChip(k)} />
              <span class="pastille" style="background:{COULEURS[k]}"></span>
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

  .filtres {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    z-index: 700;
    max-width: calc(100% - 1.2rem);
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
