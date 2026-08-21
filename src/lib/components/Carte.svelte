<script>
  // Carte (Lot 2, plan V2-PLAN.md §5.2) : inchangee par rapport a v1 sauf
  // le point bleu utilisateur, qui doit rester au premier plan et etre
  // plus visible -- c'etait le tout premier probleme signale au debut de
  // ce projet ("le rond bleu... se retrouve en dessous de tous les
  // autres signes"). Corrige ici via un pane Leaflet dedie, au-dessus du
  // pane des marqueurs/clusters, avec un halo et un point plus gros.

  import { onMount, onDestroy } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import 'leaflet.markercluster'
  import 'leaflet.markercluster/dist/MarkerCluster.css'
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
  import { chargerSanitairesDansZone } from '../sanitaires.js'

  let { onChoixSanitaire } = $props()

  let conteneurCarte
  let map
  let clusterGroup
  let markerPosition

  const VUE_PAR_DEFAUT = { lat: 46.6, lon: 2.5, zoom: 6 } // France entiere

  function ajouterTuiles() {
    const sombre = window.matchMedia('(prefers-color-scheme: dark)').matches
    const url = sombre
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    L.tileLayer(url, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 20,
    }).addTo(map)
  }

  async function rafraichirSanitaires() {
    try {
      const rows = await chargerSanitairesDansZone(map.getBounds())
      clusterGroup.clearLayers()
      for (const r of rows) {
        if (r.Latitude == null || r.Longitude == null) continue
        const marker = L.circleMarker([r.Latitude, r.Longitude], {
          radius: 8,
          weight: 2,
          color: '#540e28',
          fillColor: '#f6dde3',
          fillOpacity: 1,
        })
        marker.bindTooltip(r.Name || r.UB_id)
        marker.on('click', () => onChoixSanitaire?.(r.UB_id))
        clusterGroup.addLayer(marker)
      }
    } catch (e) {
      console.error('Chargement des sanitaires impossible', e)
    }
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
    })

    // Pane dedie, z-index au-dessus du pane des marqueurs/clusters (600) --
    // le point bleu ne doit plus jamais disparaitre sous les autres pins.
    map.createPane('position-utilisateur')
    map.getPane('position-utilisateur').style.zIndex = 650

    ajouterTuiles()

    clusterGroup = L.markerClusterGroup()
    map.addLayer(clusterGroup)

    map.on('moveend', rafraichirSanitaires)
    rafraichirSanitaires()
    localiser()
  })

  onDestroy(() => {
    map?.remove()
  })
</script>

<div class="carte" bind:this={conteneurCarte}></div>

<style>
  .carte {
    position: absolute;
    inset: 0;
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
