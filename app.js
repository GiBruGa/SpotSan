/* SpotSan — logique applicative (carte, fiches toilette, formulaires, synchronisation Supabase).
   Chargee comme <script src="app.js"> classique (pas de type="module") : partage la meme portee
   globale que le <script> precedent qui declare "const MAP_DATA_TOI = []" dans index.html — voir
   le gotcha dans CLAUDE.md ("deux balises <script> classiques partagent la meme portee lexicale").
   Grandes sections, dans l'ordre du fichier : CHANGELOG/version -> modele de donnees (MAP_DATA_TOI,
   findToiByUbId, classify) -> rendu carte (buildLayers) -> fiche toilette (openSheet/openForm/...) ->
   notes & equipements -> photos -> incidents -> synchronisation Supabase -> demarrage (bas du fichier). */
const APP_VERSION = 'v5.0';
const SYNCED_WITH = 'StatSan v5.8';
const CHANGELOG = [
  { v:'v5.0', date:'Août 2026', items:[
    'Passage en v5 : écran d\'accueil simplifié (slogan resserré), notice légale UrBizia déplacée dans "À propos", historique des versions retiré du panneau (n\'était utile que pendant la conception).'
  ]},
  { v:'v4.5', date:'Août 2026', items:[
    'Renommage de l\'application en SpotSan (auparavant PointSan Mobile), décidé pour éviter la diphtongue "oin" à l\'international — dépôt GitHub et répertoire renommés en conséquence. Aucun changement de fonctionnement ni de données ; les identifiants internes (buckets de stockage, etc.) ne changent pas.'
  ]},
  { v:'Mobile v4.4', date:'Août 2026', items:[
    'Le logo affiché (accueil, bandeau) vient désormais de la table Supabase acronymes (identité visuelle UrBizia centralisée, partagée avec EkoMa et StatSan) au lieu d\'être figé dans le fichier — repli automatique et silencieux sur l\'ancienne version embarquée si indisponible ou hors-ligne.'
  ]},
  { v:'Mobile v4.3', date:'Juillet 2026', items:[
    'Correction : le nom par défaut de l\'application lors de l\'installation était resté "PlanSan" (ancien nom, jamais mis à jour dans le fichier manifest) au lieu de "PointSan".'
  ]},
  { v:'Mobile v4.2', date:'Juillet 2026', items:[
    'Grande refonte de la fiche toilette : tout se fait maintenant sur un seul écran qui s\'enregistre automatiquement (notes en étoiles/smileys, équipements dont "essuie-tout", informations, photos en 6 catégories, incidents, remarque libre) — plus besoin de passer par des formulaires séparés.',
    'Nouveau : aider à recorriger la position d\'une toilette en confirmant votre position GPS sur place ; la carte se met à jour automatiquement dès que 3 personnes confirment une position proche (bouton "À repositionner").',
    'Thème "Système" remis par défaut (au lieu de "Clair") ; correction d\'un flash sombre→clair au démarrage.',
    'Titre "UrBizia PointSan" plus lisible en mode clair sur la carte, filtres compactés dans un menu repliable, bandeau de rafraîchissement qui disparaît de lui-même.'
  ]},
  { v:'Mobile v4.1', date:'Juillet 2026', items:[
    'Correction d\'une perte de donnees : les photos/notes/signalements pas encore synchronises n\'etaient gardes qu\'en memoire et disparaissaient definitivement si l\'appli se fermait ou se rechargeait avant l\'envoi (frequent apres une prise de photo sur telephone). Ils sont maintenant sauvegardes sur l\'appareil et renvoyes automatiquement au prochain lancement.',
    'La synchronisation continue meme si un element echoue (au lieu de tout bloquer) et un journal d\'erreurs technique est desormais envoye au serveur pour permettre un diagnostic a distance.'
  ]},
  { v:'Mobile v4.0', date:'Juillet 2026', items:[
    'Version 4.0 : theme clair par defaut (au lieu de suivre le systeme) ; le mode sombre reste disponible dans le menu Apparence.',
    'Titre "UrBizia PointSan" plus lisible en mode sombre sur l\'ecran de la carte (contour renforce derriere les majuscules).'
  ]},
  { v:'Mobile v3.13', date:'Juillet 2026', items:[
    'Icône de l\'application régénérée à partir du fichier final fourni (pin toilettes homme/femme, fond crème) : les précédentes versions ne correspondaient pas exactement au visuel attendu.'
  ]},
  { v:'Mobile v3.12', date:'Juillet 2026', items:[
    'Nouvelle barre de recherche en haut de la carte : tapez une ville ou une adresse (ex. "Talence") pour recentrer la carte dessus, sans poser de marqueur "ma position".'
  ]},
  { v:'Mobile v3.11', date:'Juillet 2026', items:[
    'Correction d\'un bug ancien (present avant ce soir) qui faisait echouer silencieusement le telechargement de la derniere base a chaque ouverture de l\'appli ; visible depuis la fusion en un seul bouton "Actualiser".',
    'Correction de contraste en mode clair : les etiquettes actives (Officiel .gouv, Donnees publiques, etc.) etaient illisibles (texte blanc sur fond clair).'
  ]},
  { v:'Mobile v3.10', date:'Juillet 2026', items:[
    'Menu simplifié : "Synchroniser maintenant" et "Télécharger la dernière base" fusionnés en un seul bouton "Actualiser" (envoie tes actions en attente puis récupère la dernière base).',
    'Écran d\'accueil : logo UrBizia agrandi (x3), ancienne icône PointSan retirée pour ne garder que l\'identité UrBizia ; nouveau slogan "Géolocalisez-le, constatez, donnez une note, renseignez les suivants…".'
  ]},
  { v:'Mobile v3.9', date:'Juillet 2026', items:[
    'Logo UrBizia ajouté sur l\'écran d\'accueil et sur la carte (identité de marque, distinct de l\'icône d\'installation).',
    'Retouches de texte sur l\'écran d\'accueil (mise en page du slogan, formulation, ajout de "(PMR)").',
    'Suppression du champ "Mon identité" (numéro de téléphone) dans le menu — les signalements restent anonymes comme le reste de l\'appli.'
  ]},
  { v:'Mobile v3.8', date:'Juillet 2026', items:[
    'Habillage éditorial : titre "UrBizia PointSan" (écran d\'accueil et carte) avec la charte graphique officielle, nouveau slogan et texte de présentation.',
    'Étiquettes de fiabilité renommées pour plus de clarté : "Officiel .gouv", "Données publiques", "Vérifiés", "PointSan" (ex-Certifiée), avec l\'étiquette "Source :" au-dessus.',
    'Correction d\'accord : "Bien notés".'
  ]},
  { v:'Mobile v3.7', date:'Juillet 2026', items:[
    'Les photos d\'un constat s\'affichent maintenant en bandeau défilable sur la fiche toilette (comme sur Google Maps), avec l\'historique des dernières photos par catégorie (max. 3 par catégorie, la plus récente de chaque contributeur remplaçant la sienne).',
    'Note globale et moyennes par critère affichées sur chaque toilette, avec la liste des avis individuels des utilisateurs.',
    'Nouveau : compte optionnel (menu → Compte) débloquant la consultation des photos de signalements DIV (Incivilités et Vandalismes) déjà transmises — le signalement lui-même reste ouvert à tous, sans connexion.'
  ]},
  { v:'Mobile v3.6', date:'Juillet 2026', items:[
    'Nouveau : "Partager l\'application" dans le menu — un QR code a faire scanner, qui ouvre une page detectant automatiquement Android/iPhone et affichant la procedure d\'installation adaptee.'
  ]},
  { v:'Mobile v3.5', date:'Juillet 2026', items:[
    'Icone d\'installation (écran d\'accueil du téléphone) corrigée : elle était tronquée par le recadrage automatique d\'Android/iOS, la marge de sécurité est maintenant respectée.'
  ]},
  { v:'Mobile v3.4', date:'Juillet 2026', items:[
    'Nouveau logo.',
    'Le bouton de recentrage (◎) cadre maintenant sur ~1km de large autour de la position GPS, comme au démarrage de l\'appli, au lieu d\'un zoom fixe.',
    'Nouveau réglage d\'apparence (menu) : Système / Clair / Sombre, indépendant du réglage du téléphone.',
    'Nouveau bouton de fond de carte (▦) : bascule vers OpenTopoMap pour plus de détail sur les rues, chemins et le relief.'
  ]},
  { v:'Mobile v3.3', date:'Juillet 2026', items:[
    'Nouveaux filtres PMR / Enfant / Bien notées (combinables entre eux et avec les filtres de fiabilité existants) pour trouver plus vite un sanitaire adapté parmi les toilettes non équipées.',
    'Nouveau champ "Convient à un enfant seul" dans le formulaire de constat, alimenté sur le terrain comme les autres caractéristiques.'
  ]},
  { v:'Mobile v3.2', date:'Juillet 2026', items:[
    'Repositionnement GPS d\'une toilette existante plafonné à 50 m par rapport à sa position enregistrée, pour éviter qu\'une dérive GPS ou une erreur de manipulation ne déplace le point par erreur et fasse perdre le lien avec les photos/avis déjà associés — au-delà, le champ position revient à sa valeur d\'origine et le reste du constat (notes, photos, équipements) est tout de même enregistré.'
  ]},
  { v:'Mobile v3.1', date:'Juillet 2026', items:[
    'Nouveau champ optionnel "Mon identité" (menu) : renseigne ton numéro de téléphone pour qu\'il accompagne tes signalements d\'incivilité — aucune connexion requise, l\'écriture reste ouverte à tous comme avant.'
  ]},
  { v:'Mobile v3.0', date:'Juillet 2026', items:[
    'Migration complète vers le nouveau schéma partagé avec PointSan Desktop (table SanitaryBlocks_Inventory) : les constats terrain (notation, commentaire, photos, équipements, existence, décompte des installations) sont désormais écrits directement dans la base commune via des fonctions sécurisées, sans fichier ni table d\'annotations séparée.',
    'Nouveau : signalement des incivilités et actes de vandalisme (photo + description libre), indépendant des constats habituels.',
    'Les 3 catégories de photo deviennent 5 : extérieur, près de la porte, intérieur, siège, lave-mains — chacune remplace la précédente prise pour ce même point (état actuel, pas un album).',
    'Le champ "type d\'installation" est remplacé par un décompte précis (cabines, PMR, urinoirs, douches, vestiaires), cohérent avec le nouveau schéma.',
    'Nouveau chip "Certifiée" pour les toilettes signalées depuis le terrain (remplace le concept de signalement séparé "Nouvelles") ; les signalements sont désormais des toilettes à part entière dès leur création.'
  ]},
  { v:'Mobile v2.0', date:'Juillet 2026', items:[
    'Renommage : l\'application s\'appelle désormais PointSan Mobile (auparavant UrBizia — PlanSan Mobile). Aucun changement de fonctionnement ni de données.',
    'Nettoyage de code : suppression du logo dupliqué (embarqué deux fois par erreur) et d\'une fonction de calcul de distance héritée de PointSan desktop mais jamais utilisée ici — aucun changement fonctionnel, fichier plus compact.'
  ]},
  { v:'Mobile v1.3', date:'Juillet 2026', items:[
    'Thème clair/sombre automatique selon les réglages du téléphone (interface et fond de carte).',
    'Géolocalisation proposée dès l\'ouverture de l\'app, avec zoom immédiat sur un rayon de 500 m autour de la position — plus besoin de chercher sa position sur la carte de France.',
    'Nouveau bouton "Télécharger la dernière base" dans le menu : récupère la base toilettes publiée depuis PlanSan desktop sans attendre une nouvelle version de l\'app.'
  ]},
  { v:'Mobile v1.2', date:'Juillet 2026', items:[
    'Synchronisation avec le serveur partagé (Supabase) : toute confirmation, suppression, édition ou notation est envoyée au serveur et visible par tous les utilisateurs de l\'app, sans passer par un fichier.',
    'Les photos prises sur le terrain sont automatiquement hébergées dans le stockage partagé lors de la synchronisation — plus besoin de les embarquer dans un export.',
    'Bouton "Synchroniser maintenant" dans le menu, avec indicateur de dernière synchronisation. Synchronisation silencieuse tentée à l\'ouverture de l\'app.',
    'Export/import JSON local conservés comme filet de secours hors connexion.'
  ]},
  { v:'Mobile v1.1', date:'Juillet 2026', items:[
    'Prise de photo directement depuis l\'appareil, en 3 catégories (extérieur / vue rapprochée / intérieur), compressées et intégrées au constat — aucun compte ni service externe requis.',
    'Écran de notation dédié : accès, propreté, odeurs et note globale sur curseurs -5/+5, plus état des équipements (lave-mains, savon, séchage, papier, poubelle) avec niveau de service.'
  ]},
  { v:'Mobile v1.0', date:'Juillet 2026', items:[
    'Première version : consultation des toilettes (Vérifiée/Gouv/OSM) sur carte, confirmation ou signalement de disparition en un geste, formulaire d\'édition complet (type, simple/multiple, automatique, note, photos, position GPS).',
    'Signalement de toilettes non répertoriées, géolocalisées automatiquement.',
    'Export / import des constats au format JSON — compatible avec PlanSan desktop, dans les deux sens.',
    `Données toilettes synchronisées depuis ${SYNCED_WITH}.`
  ]}
];

const V_COLORS = { verified:'#3b82f6', gouv:'#f5a524', osm:'#2fb344', certified:'#FFC3D5' };
const V_LABELS = { verified:'Vérifié (Officiel .gouv + Données publiques)', gouv:'Officiel .gouv uniquement', osm:'Données publiques uniquement', certified:'SpotSan (terrain)' };
// Rating_Overall est note a part (5 etoiles) ; ces 4 criteres sont notes via une echelle de smileys.
const RATING_LABELS = { Rating_Signage:'Signalétique', Rating_Access:'Accès', Rating_Cleanliness:'Propreté', Rating_Odors:'Odeurs' };
const RATING_LABELS_ALL = Object.assign({ Rating_Overall:'Note globale' }, RATING_LABELS);
const EQUIP_LABELS = { laveMains:'Lave-mains', savon:'Savon', sechage:'Séchage', papier:'Papier toilette', essuieTout:'Essuie-tout', poubelle:'Poubelle' };
// Echelle a 5 points (smileys) + un etat "absent" a part, utilisee pour les 4 criteres ci-dessus et pour les equipements.
const SMILEY_STATES = [ { val:-5, icon:'🤢' }, { val:-2, icon:'🙁' }, { val:0, icon:'😐' }, { val:2, icon:'🙂' }, { val:5, icon:'😍' } ];
const EQUIP_STATE_LABELS = { absent:'Absent' };
const PHOTO_CATS = [
  { field:'Photo_Environment', label:'Cadre à 20m', icon:'🖼' },
  { field:'Photo_Access', label:'Accès', icon:'🚧' },
  { field:'Photo_CloseUp', label:'Signalétique', icon:'🪧' },
  { field:'Photo_Interior', label:'Intérieur', icon:'🏠' },
  { field:'Photo_Seat', label:'Siège', icon:'🚽' },
  { field:'Photo_Sink', label:'Lave-mains', icon:'🚰' }
];
const COUNT_FIELDS = [
  { field:'MSB', label:'Nombre de cellules' },
  { field:'PMR', label:'dont PMR' },
  { field:'Urinals', label:'dont urinoirs hommes' },
  { field:'Showers', label:'dont Douches' },
  { field:'ChangingRooms', label:'dont Vestiaires' }
];

// MAP_DATA_TOI est deja declare en const (tableau vide seed) dans le bloc de donnees plus haut dans le document ;
// deux balises <script> classiques partagent la meme portee lexicale pour let/const, donc on ne le redeclare pas ici,
// on le MUTE en place (.length=0 puis .push(...)) partout ou la base est rechargee.
let activeChips = { verified:true, gouv:true, osm:true, certified:true, supprimees:false };
let activeRefinements = { pmr:false, enfant:false, bienNotees:false };
function passesRefinements(t){
  if (activeRefinements.pmr && !(t.PMR > 0)) return false;
  if (activeRefinements.enfant && t.Adapte_Enfant !== true) return false;
  if (activeRefinements.bienNotees && !(t.Rating_Overall > 0)) return false;
  return true;
}
let userMarker = null;
let currentSheetUbId = null;

/* ---------- Carte ---------- */
const map = L.map('map', { zoomControl:false, preferCanvas:true }).setView([46.6, 2.4], 6);
L.control.zoom({ position:'bottomleft' }).addTo(map);

const darkSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

/* ---------- Theme (systeme / clair / sombre) ---------- */
const THEME_KEY = 'pointsan_theme'; // 'system' | 'light' | 'dark'
function getThemeMode(){ return localStorage.getItem(THEME_KEY) || 'system'; }
function isLightActive(){
  const mode = getThemeMode();
  if (mode === 'light') return true;
  if (mode === 'dark') return false;
  return !!(darkSchemeQuery && darkSchemeQuery.matches);
}
function applyTheme(mode){
  localStorage.setItem(THEME_KEY, mode);
  if (mode === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
  swapTileLayer();
}
// Applique data-theme des le chargement (tileLayer sera cree juste apres avec la bonne config via isLightActive()).
if (getThemeMode() === 'system') document.documentElement.removeAttribute('data-theme');
else document.documentElement.setAttribute('data-theme', getThemeMode());

/* ---------- Fond de carte (CARTO stylise / OpenTopoMap plus detaille) ---------- */
const MAPLAYER_KEY = 'pointsan_maplayer'; // 'carto' | 'topo'
function getMapLayerMode(){ return localStorage.getItem(MAPLAYER_KEY) || 'carto'; }
function tileConfigForLayer(){
  if (getMapLayerMode() === 'topo'){
    return {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      opts: { attribution:'&copy; OpenStreetMap &copy; SRTM &copy; OpenTopoMap (CC-BY-SA)', maxZoom:17, subdomains:'abc' }
    };
  }
  return {
    url: 'https://{s}.basemaps.cartocdn.com/' + (isLightActive() ? 'light_all' : 'dark_all') + '/{z}/{x}/{y}{r}.png',
    opts: { attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:19, subdomains:'abcd' }
  };
}
// tileConfigForLayer() calcule a la fois l'URL et les options : on ne l'appelle qu'une fois pour eviter
// de refaire le meme calcul (et le meme test isLightActive()) deux fois pour la meme couche.
let tileLayer = (() => { const cfg = tileConfigForLayer(); return L.tileLayer(cfg.url, cfg.opts).addTo(map); })();
function swapTileLayer(){
  if (!tileLayer) return; // pas encore initialise (premier appel via applyTheme au chargement)
  map.removeLayer(tileLayer);
  const cfg = tileConfigForLayer();
  tileLayer = L.tileLayer(cfg.url, cfg.opts).addTo(map);
}
if (darkSchemeQuery && darkSchemeQuery.addEventListener){
  darkSchemeQuery.addEventListener('change', () => {
    if (getThemeMode() === 'system') swapTileLayer();
  });
}
document.getElementById('btn-layers').addEventListener('click', () => {
  const next = getMapLayerMode() === 'carto' ? 'topo' : 'carto';
  localStorage.setItem(MAPLAYER_KEY, next);
  swapTileLayer();
  showToast(next === 'topo' ? 'Fond de carte : OpenTopoMap (relief, chemins)' : 'Fond de carte : standard');
});

/* ---------- Modele de donnees : accesseurs pour MAP_DATA_TOI (a utiliser plutot que de lire les
   champs bruts directement, cf. CLAUDE.md "Data model") ---------- */
function findToiByUbId(ubId){ return MAP_DATA_TOI.find(r => r.UB_id === ubId); }

function classify(t){
  if (t.Certified) return 'certified';
  if (t.Verified) return 'verified';
  if (t.Sources && t.Sources.includes('Gouv')) return 'gouv';
  return 'osm';
}

/* ---------- Rendu carte : buildLayers() est le seul point d'entree pour redessiner la carte, a
   appeler apres toute mutation de MAP_DATA_TOI plutot que de manipuler les marqueurs directement ---------- */
function clusterGroup(){
  return L.markerClusterGroup({
    maxClusterRadius: (zoom) => zoom >= 12 ? 18 : (zoom >= 9 ? 40 : 70),
    disableClusteringAtZoom: 13, chunkedLoading:true,
    iconCreateFunction: function(cluster){
      const n = cluster.getChildCount();
      const size = n < 50 ? 28 : n < 500 ? 36 : 44;
      return L.divIcon({ html:'<div style="width:'+size+'px;height:'+size+'px;line-height:'+size+'px;font-size:'+(size*0.34)+'px;">'+n+'</div>',
        className:'marker-cluster marker-cluster-toi', iconSize:L.point(size,size) });
    }
  });
}

function toiIcon(kind, auto, deleted){
  const color = deleted ? '#8a5555' : V_COLORS[kind];
  const opacity = deleted ? 'opacity:.55;filter:grayscale(.6);' : '';
  const badge = auto ? '<div style="position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#fff;color:'+color+';font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1px solid '+color+';">A</div>' : '';
  const cross = deleted ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ff8080;font-size:16px;font-weight:900;">✕</div>' : '';
  const star = kind === 'certified' && !deleted ? '<div style="position:absolute;bottom:-3px;right:-3px;font-size:11px;">★</div>' : '';
  const html = '<div style="position:relative;width:27px;height:27px;border-radius:50%;background:rgba(11,20,22,.9);border:2px solid '+color+';display:flex;align-items:center;justify-content:center;'+opacity+'">'+
    '<span style="width:16px;height:16px;color:'+color+';">'+GLYPH_TOILET+'</span>'+badge+cross+star+'</div>';
  return L.divIcon({ html, className:'', iconSize:[27,27], iconAnchor:[13,13] });
}
const GLYPH_TOILET = '<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><circle cx="7" cy="5" r="2.2"/><path d="M7 8.3c-2.1 0-3.8 1.7-3.8 3.8v4.6h1.8V22h4V16.7h1.8v-4.6c0-2.1-1.7-3.8-3.8-3.8z"/><circle cx="17" cy="5" r="2.2"/><path d="M17 8.3c-2.1 0-3.8 1.7-3.8 3.8v4.6h1.8V22h4V16.7h1.8v-4.6c0-2.1-1.7-3.8-3.8-3.8z"/></svg>';

let groups = { verified:clusterGroup(), gouv:clusterGroup(), osm:clusterGroup(), certified:clusterGroup(), supprimees:clusterGroup() };
const counts = { verified:0, gouv:0, osm:0, certified:0, supprimees:0 };

function buildLayers(){
  Object.values(groups).forEach(g => { map.removeLayer(g); g.clearLayers(); });
  counts.verified = counts.gouv = counts.osm = counts.certified = counts.supprimees = 0;

  MAP_DATA_TOI.forEach(t => {
    if (!passesRefinements(t)) return;
    const deleted = t.Exists === false;
    const kind = classify(t);
    const m = L.marker([t.Latitude, t.Longitude], { icon: toiIcon(kind, t.Automatic, deleted) });
    m.on('click', () => openSheet(t.UB_id));
    if (deleted){ counts.supprimees++; groups.supprimees.addLayer(m); }
    else { counts[kind]++; groups[kind].addLayer(m); }
  });

  Object.keys(activeChips).forEach(k => { if (activeChips[k]) groups[k].addTo(map); });
  updateChipCounts();
}
function updateChipCounts(){
  Object.keys(counts).forEach(k => {
    const el = document.getElementById('chip-n-'+k);
    if (el) el.textContent = counts[k] ? counts[k].toLocaleString('fr-FR') : '';
  });
}

/* ---------- Chips ---------- */
function updateFiltersCount(){
  const n = Object.values(activeChips).filter(Boolean).length + Object.values(activeRefinements).filter(Boolean).length;
  const el = document.getElementById('filters-count');
  if (el) el.textContent = '(' + n + ')';
}
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (chip.dataset.chip){
      const k = chip.dataset.chip;
      if (!(k in activeChips)) return;
      activeChips[k] = !activeChips[k];
      chip.classList.toggle('on', activeChips[k]);
      if (activeChips[k]) groups[k].addTo(map); else map.removeLayer(groups[k]);
    } else if (chip.dataset.refine){
      const k = chip.dataset.refine;
      if (!(k in activeRefinements)) return;
      activeRefinements[k] = !activeRefinements[k];
      chip.classList.toggle('on', activeRefinements[k]);
      buildLayers();
    }
    updateFiltersCount();
  });
});
updateFiltersCount();
document.getElementById('btn-filters-toggle').addEventListener('click', () => {
  const panel = document.getElementById('filters-panel');
  const caret = document.getElementById('filters-caret');
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  caret.textContent = open ? '▾' : '▴';
});

/* ---------- Géolocalisation ---------- */
document.getElementById('btn-locate').addEventListener('click', () => {
  if (!navigator.geolocation){ showToast('Géolocalisation non disponible sur cet appareil.'); return; }
  showToast('Localisation en cours…');
  navigator.geolocation.getCurrentPosition(pos => {
    recenterOnPosition(pos.coords.latitude, pos.coords.longitude, true);
    hideToast();
  }, err => {
    showToast('Position indisponible : ' + err.message);
  }, { enableHighAccuracy:true, timeout:10000 });
});

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg, durationMs){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, durationMs || 3500);
}
function hideToast(){ clearTimeout(toastTimer); document.getElementById('toast').style.display = 'none'; }

function photoGalleryHtml(t){
  return '<div class="sheet-row" id="photo-carousel-row" style="align-items:flex-start;"><span class="k">Photos</span>'+
    '<div id="photo-carousel" style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scroll-snap-type:x proximity;">'+
      '<span style="font-size:10.5px;color:var(--ink-dim);">Chargement…</span>'+
    '</div></div>';
}
const PHOTO_CAT_BY_FIELD = Object.fromEntries(PHOTO_CATS.map(c => [c.field, c]));
async function loadPhotoCarousel(t){
  const box = document.getElementById('photo-carousel');
  if (!box) return;
  let history = [];
  try{
    const resp = await sbFetch('/rest/v1/Toilet_Photos?UB_id=eq.'+encodeURIComponent(t.UB_id)+'&select=category,photo_url,uploaded_at&order=uploaded_at.desc');
    history = await resp.json();
  }catch(e){ /* hors-ligne : on retombe sur les photos "etat courant" ci-dessous */ }
  const seenUrls = new Set(history.map(h => h.photo_url));
  const legacyOnly = PHOTO_CATS.filter(c => t[c.field] && !seenUrls.has(t[c.field]))
    .map(c => ({ category:c.field.replace('Photo_',''), photo_url:t[c.field], uploaded_at:null }));
  const shots = history.concat(legacyOnly);
  if (!shots.length){ box.parentElement.style.display = 'none'; return; }
  box.innerHTML = shots.map(s => {
    const cat = PHOTO_CAT_BY_FIELD['Photo_'+s.category] || { icon:'📷', label:s.category };
    return '<a href="'+s.photo_url+'" target="_blank" rel="noopener" style="scroll-snap-align:start;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;text-decoration:none;width:110px;">'+
      '<img src="'+s.photo_url+'" loading="lazy" style="width:110px;height:110px;object-fit:cover;border-radius:9px;border:1px solid var(--line);">'+
      '<span style="font-size:9.5px;color:var(--ink-dim);">'+cat.icon+' '+cat.label+'</span></a>';
  }).join('');
}

function ratingColor(v){
  if (v === null || v === undefined) return 'var(--ink-dim)';
  if (v > 0) return 'var(--ok)'; if (v < 0) return 'var(--err)'; return 'var(--ink-dim)';
}
function ratingsOverviewHtml(){
  return '<div class="sheet-row" id="ratings-overview-ph" style="align-items:flex-start;flex-direction:column;gap:6px;display:none;">'+
    '<span class="k" style="margin-bottom:2px;">Moyenne des avis</span>'+
    '<div id="ratings-overview-body" style="width:100%;font-size:10.5px;color:var(--ink-dim);">Chargement…</div>'+
  '</div>';
}
function starsLine(v){
  if (v === null || v === undefined) return '<span style="color:var(--ink-dim);">Pas encore noté</span>';
  const pct = Math.round(((v + 5) / 10) * 100);
  return '<span style="display:inline-block;width:70px;height:8px;border-radius:4px;background:var(--panel2);overflow:hidden;vertical-align:middle;margin-right:6px;">'+
    '<span style="display:block;height:100%;width:'+pct+'%;background:'+ratingColor(v)+';"></span></span>'+
    '<span style="color:'+ratingColor(v)+';font-weight:bold;">'+(v>0?'+':'')+v+'</span>';
}
async function loadRatingsOverview(t){
  const wrap = document.getElementById('ratings-overview-ph');
  const box = document.getElementById('ratings-overview-body');
  if (!wrap || !box) return;
  try{
    const [sumResp, listResp] = await Promise.all([
      sbFetch('/rest/v1/toilet_ratings_summary?UB_id=eq.'+encodeURIComponent(t.UB_id)+'&select=*'),
      sbFetch('/rest/v1/Toilet_Ratings?UB_id=eq.'+encodeURIComponent(t.UB_id)+'&order=submitted_at.desc&limit=20&select=*')
    ]);
    const sum = (await sumResp.json())[0];
    const list = await listResp.json();
    if (!sum && !list.length){ wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    let html = '';
    if (sum){
      html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">'+
        Object.keys(RATING_LABELS_ALL).map(k => {
          const avgKey = 'avg_' + k.replace('Rating_','').toLowerCase();
          return '<div style="min-width:90px;"><div style="font-size:9px;color:var(--ink-dim);margin-bottom:2px;">'+RATING_LABELS_ALL[k]+'</div>'+starsLine(sum[avgKey])+'</div>';
        }).join('') +
      '</div><div style="font-size:9.5px;color:var(--ink-dim);margin-bottom:8px;">'+sum.rating_count+' avis au total</div>';
    }
    if (list.length){
      html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;">' +
        list.map(r => {
          const date = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('fr-FR') : '';
          return '<div style="border-top:1px solid var(--line);padding-top:6px;">'+
            '<div style="font-size:9px;color:var(--ink-dim);margin-bottom:2px;">'+date+'</div>'+
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:3px;">'+
              Object.keys(RATING_LABELS_ALL).filter(k => r[k] !== null && r[k] !== undefined).map(k =>
                '<span style="font-size:10px;color:'+ratingColor(r[k])+';border:1px solid var(--line);border-radius:8px;padding:1px 6px;">'+RATING_LABELS_ALL[k]+' '+(r[k]>0?'+':'')+r[k]+'</span>'
              ).join('') +
            '</div>' +
            (r.Comment ? '<div style="font-size:11px;color:var(--ink);">'+r.Comment+'</div>' : '') +
          '</div>';
        }).join('') +
      '</div>';
    }
    box.innerHTML = html;
  }catch(e){ wrap.style.display = 'none'; }
}

/* ---------- Note globale (5 etoiles) et criteres (5 smileys) ---------- */
function starRowHtml(value){
  const filled = (value === null || value === undefined) ? 0 : value;
  return '<div class="form-row"><label>Note globale</label>'+
    '<div id="star-row" style="display:flex;gap:6px;font-size:26px;">'+
      [1,2,3,4,5].map(n => '<span class="star-btn" data-star="'+n+'" style="cursor:pointer;opacity:'+(n<=filled?'1':'.3')+';">★</span>').join('')+
    '</div></div>';
}
function smileyRowHtml(field, label, value){
  return '<div class="form-row"><label>'+label+'</label>'+
    '<div class="smiley-row" style="display:flex;gap:6px;">'+
      SMILEY_STATES.map(s => '<button type="button" class="smiley-btn" data-field="'+field+'" data-val="'+s.val+'" style="flex:1;padding:8px 0;font-size:19px;border-radius:8px;border:1px solid var(--line);background:'+(value===s.val?'var(--accent)':'var(--panel2)')+';opacity:'+(value===s.val?'1':'.55')+';">'+s.icon+'</button>').join('')+
    '</div></div>';
}
function equipStateRowHtml(key, label, data){
  const etat = data && data.etat;
  return '<div class="form-row"><label>'+label+'</label>'+
    '<div class="equip-row" style="display:flex;gap:5px;flex-wrap:wrap;">'+
      SMILEY_STATES.map(s => '<button type="button" class="equip-btn" data-eq="'+key+'" data-etat="'+s.val+'" style="flex:1;min-width:14%;padding:7px 0;font-size:16px;border-radius:7px;border:1px solid var(--line);background:'+(etat===String(s.val)?'var(--accent)':'var(--panel2)')+';opacity:'+(etat===String(s.val)?'1':'.55')+';">'+s.icon+'</button>').join('')+
      '<button type="button" class="equip-btn" data-eq="'+key+'" data-etat="absent" style="flex:1;min-width:14%;padding:7px 0;font-size:14px;border-radius:7px;border:1px solid var(--line);background:'+(etat==='absent'?'var(--err)':'var(--panel2)')+';color:'+(etat==='absent'?'#2a0a08':'var(--ink-dim)')+';opacity:'+(etat==='absent'?'1':'.7')+';">✕</button>'+
    '</div></div>';
}
function toggle2RowHtml(label, field, value, trueLabel, falseLabel){
  return '<div class="form-row"><label>'+label+'</label>'+
    '<div class="toggle2-row" style="display:flex;gap:8px;">'+
      '<button type="button" class="toggle2-btn" data-field="'+field+'" data-val="1" style="flex:1;padding:9px;border-radius:7px;border:1px solid var(--line);background:'+(value===true?'var(--ok)':'var(--panel2)')+';color:'+(value===true?'#0B1416':'var(--ink)')+';">'+trueLabel+'</button>'+
      '<button type="button" class="toggle2-btn" data-field="'+field+'" data-val="0" style="flex:1;padding:9px;border-radius:7px;border:1px solid var(--line);background:'+(value===false?'var(--accent)':'var(--panel2)')+';color:'+(value===false?'#fff':'var(--ink)')+';">'+falseLabel+'</button>'+
    '</div>'+
    (value===null||value===undefined ? '<p style="font-size:9.5px;color:var(--ink-dim);margin:4px 0 0;">Choisir…</p>' : '')+
  '</div>';
}
function positionSectionHtml(){
  return '<div class="form-row" id="position-section"><label>📍 Position sur la carte</label>'+
    '<p style="font-size:11px;color:var(--ink-dim);line-height:1.5;margin:0 0 8px;">Vous pouvez aider à redéfinir la position du sanitaire sur la carte en relevant votre position GPS.<br>'+
    '<b>Condition :</b> vous devez être à moins de 20 m du sanitaire.<br>'+
    '<b>Mode opératoire :</b> cliquez sur le bouton ci-dessous. Si 3 personnes signalent, comme vous, cette position plus juste du sanitaire à 20 m près, la carte évoluera.</p>'+
    '<button type="button" class="btn-gps" id="btn-vote-position" style="width:100%;">📍 Confirmer ma position GPS</button>'+
  '</div>';
}

/* ---------- Photos "mes signalements" (locales, propres a cet appareil, pas besoin de compte) ---------- */
const MY_INCIDENTS_KEY = 'pointsan_my_incident_photos';
function loadMyIncidentPhotos(){
  try{ return JSON.parse(localStorage.getItem(MY_INCIDENTS_KEY) || '[]'); }catch(e){ return []; }
}
function saveMyIncidentPhoto(ubId, photoDataUri){
  try{
    const list = loadMyIncidentPhotos();
    list.push({ UB_id: ubId, photo: photoDataUri, ts: Date.now() });
    while (list.length > 200) list.shift();
    localStorage.setItem(MY_INCIDENTS_KEY, JSON.stringify(list));
  }catch(e){ /* quota depasse : tant pis pour l'historique local, la photo part quand meme en synchro */ }
}
function myIncidentPhotosHtml(ubId){
  const mine = loadMyIncidentPhotos().filter(p => p.UB_id === ubId);
  if (!mine.length) return '';
  return '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-top:8px;">'+
    mine.slice().reverse().map(p => '<img src="'+p.photo+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--err);flex-shrink:0;">').join('')+
  '</div>';
}

/* ================= Synchronisation serveur partagé (Supabase) ================= */
const SUPABASE_URL = 'https://mnsfstjgrueyuvejfvvk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uc2ZzdGpncnVleXV2ZWpmdnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDI2MDgsImV4cCI6MjA5OTUxODYwOH0.Nb8d-b3zvXYqbl95PjkNrR12WXnVanJMGJzRU2-UpI4';
const PHOTOS_BUCKET = 'PointSan-Photos';
const DEVICE_ID_KEY = 'pointsan_device_id';
let DEVICE_ID = localStorage.getItem(DEVICE_ID_KEY);
if (!DEVICE_ID){
  DEVICE_ID = 'phone-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  try{ localStorage.setItem(DEVICE_ID_KEY, DEVICE_ID); }catch(e){}
}

/* ---------- Compte (optionnel) : debloque la consultation des signalements DIV deja transmis par d'autres.
   Le reste de l'appli (constats, notes, photos, signalements) reste entierement anonyme, sans connexion. ---------- */
const sbAuth = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let hasMobileAccess = false;
async function checkMobileAccess(){
  if (!currentUser){ hasMobileAccess = false; return; }
  try{
    const { data } = await sbAuth.rpc('has_tool_access', { p_tool:'pointsan_mobile' });
    hasMobileAccess = !!data;
  }catch(e){ hasMobileAccess = false; }
}
sbAuth.auth.onAuthStateChange((event, session) => {
  currentUser = session ? session.user : null;
  checkMobileAccess();
});
(async () => {
  const { data } = await sbAuth.auth.getSession();
  currentUser = data && data.session ? data.session.user : null;
  await checkMobileAccess();
})();

// File d'attente locale (rejouee a la synchro / a la reconnexion)
let dirtyFeedback = new Map();   // UB_id -> objet de champs modifies (fusionnes si plusieurs modifs avant synchro)
let pendingNewToilets = [];      // signalements crees hors-ligne, id temporaire jusqu'a confirmation serveur
let pendingIncidents = [];       // signalements d'incivilite en attente d'envoi
let lastSyncAt = null;
let syncing = false;

// La file d'attente (photos/notes/signalements pas encore synchronises) doit survivre a une fermeture
// ou un rechargement de l'appli (frequent sur mobile : mise en arriere-plan pour prendre une photo,
// verrouillage de l'ecran, iOS qui recharge l'onglet sous pression memoire) — sans ca, tout travail non
// synchronise est perdu silencieusement des que le JS redemarre.
const PENDING_KEY = 'pointsan_pending_v1';
function savePendingQueue(){
  try{
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      dirtyFeedback: Array.from(dirtyFeedback.entries()),
      pendingNewToilets: pendingNewToilets,
      pendingIncidents: pendingIncidents
    }));
  }catch(e){ /* quota depasse (beaucoup de photos en attente) : la file reste au moins en memoire pour cette session */ }
}
function loadPendingQueue(){
  try{
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.dirtyFeedback) dirtyFeedback = new Map(data.dirtyFeedback);
    if (Array.isArray(data.pendingNewToilets)) pendingNewToilets = data.pendingNewToilets;
    if (Array.isArray(data.pendingIncidents)) pendingIncidents = data.pendingIncidents;
  }catch(e){ /* rien de valide en cache : on repart d'une file vide */ }
}

function queueFeedback(ubId, patch){
  const existing = dirtyFeedback.get(ubId) || {};
  dirtyFeedback.set(ubId, Object.assign(existing, patch));
  savePendingQueue();
  buildLayers();
}

async function sbFetch(path, options){
  options = options || {};
  const headers = Object.assign({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
  }, options.headers || {});
  if (!(options.body instanceof Blob) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const resp = await fetch(SUPABASE_URL + path, Object.assign({}, options, { headers }));
  if (!resp.ok){
    const t = await resp.text().catch(() => '');
    throw new Error('HTTP ' + resp.status + ' ' + t.slice(0, 180));
  }
  return resp;
}
async function sbRpc(fn, args){
  const resp = await sbFetch('/rest/v1/rpc/' + fn, { method:'POST', body: JSON.stringify(args) });
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

// Journal d'erreurs cote serveur (temporaire, le temps de fiabiliser la synchro) : chaque echec de synchro
// et chaque plantage JS non intercepte est envoye dans Mobile_Debug_Log pour pouvoir diagnostiquer a distance
// au lieu de dependre uniquement de ce que l'utilisateur arrive a decrire. Best-effort : ne doit jamais
// lui-meme faire planter l'appli (ex. si le telephone est hors ligne au moment de l'erreur).
async function logClientError(context, message, detail){
  try{ console.error('[SpotSan]', context, message, detail); }catch(e){}
  try{
    await fetch(SUPABASE_URL + '/rest/v1/Mobile_Debug_Log', {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{
        device_id: typeof DEVICE_ID !== 'undefined' ? DEVICE_ID : null,
        app_version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
        context: String(context).slice(0, 200),
        message: String(message == null ? '' : message).slice(0, 500),
        detail: detail || null
      }])
    });
  }catch(e){ /* pas de reseau : on abandonne silencieusement, ce n'est qu'un journal de confort */ }
}
window.addEventListener('error', (e) => {
  logClientError('window.onerror', e.message, { filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error && e.error.stack });
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  logClientError('unhandledrejection', (reason && reason.message) || String(reason), { stack: reason && reason.stack });
});

function dataUriToBlob(dataUri){
  const parts = dataUri.split(',');
  const mime = /data:(.*?);base64/.exec(parts[0])[1];
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function uploadPhoto(dataUri, ownerId, category){
  const blob = dataUriToBlob(dataUri);
  const ext = blob.type === 'image/png' ? 'png' : (blob.type === 'image/webp' ? 'webp' : 'jpg');
  const path = ownerId + '/' + category + '_' + Date.now() + '.' + ext;
  await sbFetch('/storage/v1/object/' + PHOTOS_BUCKET + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'x-upsert': 'true' },
    body: blob
  });
  return SUPABASE_URL + '/storage/v1/object/public/' + PHOTOS_BUCKET + '/' + path;
}

// Photos DIV (incivilites/vandalisme) : bucket prive, consultation reservee aux comptes avec acces pointsan_mobile.
// On stocke le CHEMIN (pas une URL publique) : le bucket etant prive, l'affichage passera par une URL signee generee a la demande.
const INCIDENTS_BUCKET = 'PointSan-Incidents';
async function uploadIncidentPhoto(dataUri, ubId){
  const blob = dataUriToBlob(dataUri);
  const ext = blob.type === 'image/png' ? 'png' : (blob.type === 'image/webp' ? 'webp' : 'jpg');
  const path = ubId + '/incident_' + Date.now() + '.' + ext;
  await sbFetch('/storage/v1/object/' + INCIDENTS_BUCKET + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'x-upsert': 'true' },
    body: blob
  });
  return path;
}

const RPC_PARAM_MAP = {
  Exists:'p_exists', Latitude:'p_latitude', Longitude:'p_longitude', Automatic:'p_automatic',
  MSB:'p_msb', PMR:'p_pmr', Urinals:'p_urinals', Showers:'p_showers', ChangingRooms:'p_changing_rooms',
  Rating_Access:'p_rating_access', Rating_Cleanliness:'p_rating_cleanliness', Rating_Odors:'p_rating_odors', Rating_Overall:'p_rating_overall', Rating_Signage:'p_rating_signage',
  Comment:'p_comment', Equipment:'p_equipment', Adapte_Enfant:'p_adapte_enfant',
  Photo_Environment:'p_photo_environment', Photo_CloseUp:'p_photo_closeup', Photo_Interior:'p_photo_interior', Photo_Seat:'p_photo_seat', Photo_Sink:'p_photo_sink', Photo_Access:'p_photo_access'
};

async function pushDirty(){
  let pushedFeedback = 0, pushedNew = 0, pushedIncidents = 0, photosUploaded = 0, failed = 0;

  // Les signalements en attente sont traites AVANT les constats : chaque nouveau signalement peut mettre en
  // file un constat initial (notation/photos/commentaire deja saisis) qui doit partir dans la meme synchro.
  // Chaque element est isole dans son propre try/catch : l'echec d'un element (ex. une photo) ne doit pas
  // bloquer l'envoi des autres elements de la meme synchro (et surtout pas re-perdre ceux deja reussis).
  for (const p of Array.from(pendingNewToilets)){
    try{
      const args = {
        p_name: p.Name || '', p_adresse: p.Adresse || '', p_city: p.City || '', p_district: '', p_region: '',
        p_lat: p.Latitude, p_lon: p.Longitude, p_automatic: !!p.Automatic, p_pmr: p.PMR||0, p_msb: p.MSB||1
      };
      const newUbId = await sbRpc('report_new_toilet', args);
      // applique tout constat deja saisi localement (notation/photos/etc) sur la vraie ligne serveur
      const feedbackPatch = Object.assign({}, p);
      delete feedbackPatch.UB_id; delete feedbackPatch.Name; delete feedbackPatch.Adresse; delete feedbackPatch.City;
      delete feedbackPatch.Sources; delete feedbackPatch.Certified; delete feedbackPatch.Verified; delete feedbackPatch.Exists;
      if (Object.keys(feedbackPatch).length) queueFeedback(newUbId, feedbackPatch);
      const idx = MAP_DATA_TOI.findIndex(x => x.UB_id === p.UB_id);
      if (idx >= 0) MAP_DATA_TOI.splice(idx, 1); // retire l'entree temporaire, sera remplacee au prochain pullAll
      pendingNewToilets = pendingNewToilets.filter(x => x !== p);
      savePendingQueue();
      pushedNew++;
    }catch(err){
      failed++;
      logClientError('pushDirty:report_new_toilet', err && err.message, { ub_id: p.UB_id });
    }
  }

  for (const [ubId, patch] of Array.from(dirtyFeedback.entries())){
    try{
      const args = { p_ub_id: ubId };
      for (const { field } of PHOTO_CATS){
        const photoUri = patch[field];
        if (photoUri && photoUri.indexOf('data:') === 0){
          const hosted = await uploadPhoto(photoUri, ubId, field.replace('Photo_',''));
          patch[field] = hosted;
          const t = findToiByUbId(ubId); if (t) t[field] = hosted;
          photosUploaded++;
        }
      }
      Object.keys(patch).forEach(field => {
        const rpcKey = RPC_PARAM_MAP[field];
        if (rpcKey) args[rpcKey] = patch[field];
      });
      args.p_device_id = DEVICE_ID;
      await sbRpc('report_toilet_feedback', args);
      dirtyFeedback.delete(ubId);
      savePendingQueue();
      pushedFeedback++;
    }catch(err){
      failed++;
      logClientError('pushDirty:report_toilet_feedback', err && err.message, { ub_id: ubId });
    }
  }

  for (const inc of Array.from(pendingIncidents)){
    try{
      let photo = inc.Photo;
      if (photo && photo.indexOf('data:') === 0){
        photo = await uploadIncidentPhoto(photo, inc.UB_id);
        photosUploaded++;
      }
      await sbFetch('/rest/v1/Incident_Reports', {
        method:'POST', headers:{ 'Prefer':'return=minimal' },
        body: JSON.stringify([{ UB_id: inc.UB_id, Photo: photo, Description: inc.Description, Reported_by: DEVICE_ID }])
      });
      pendingIncidents = pendingIncidents.filter(x => x !== inc);
      savePendingQueue();
      pushedIncidents++;
    }catch(err){
      failed++;
      logClientError('pushDirty:incident', err && err.message, { ub_id: inc.UB_id });
    }
  }

  return { pushedFeedback, pushedNew, pushedIncidents, photosUploaded, failed };
}

async function syncNow(silent){
  if (syncing) return;
  syncing = true;
  if (!silent) showToast('Synchronisation…');
  try {
    const res = await pushDirty();
    buildLayers();
    lastSyncAt = new Date();
    updateSyncStatus();
    const failNote = res.failed ? (' ⚠ '+res.failed+' échec(s) — reste en attente, sera retenté.') : '';
    if (!silent || res.failed) showToast('✓ '+res.pushedFeedback+' constat(s), '+res.pushedNew+' signalement(s), '+res.pushedIncidents+' incident(s) envoyés, '+res.photosUploaded+' photo(s) uploadée(s).'+failNote);
  } catch (err){
    updateSyncStatus();
    logClientError('syncNow', err && err.message, {});
    if (!silent) showToast('⚠ Synchronisation impossible (hors ligne ?)');
  } finally {
    syncing = false;
  }
}
function updateSyncStatus(){
  const el = document.getElementById('sync-status');
  if (!el) return;
  const pending = dirtyFeedback.size + pendingNewToilets.length + pendingIncidents.length;
  el.textContent = (lastSyncAt ? ('Dernière synchro : ' + lastSyncAt.toLocaleTimeString('fr-FR')) : 'Jamais synchronisé sur cet appareil') + (pending ? ' · ' + pending + ' en attente' : '');
}

/* ---------- Téléchargement de la base toilettes publiée par StatSan ---------- */
const TOI_SELECT = 'UB_id,Sources,Name,Adresse,City,District,Region,Latitude,Longitude,Provider,Exists,MSB,Automatic,PMR,Urinals,Showers,ChangingRooms,Adapte_Enfant,Verified,Certified,Rating_Access,Rating_Cleanliness,Rating_Odors,Rating_Overall,Comment,Equipment,Photo_Environment,Photo_CloseUp,Photo_Interior,Photo_Seat,Photo_Sink';

async function refreshBaseFromServer(){
  const status = document.getElementById('sync-status');
  if (status) status.textContent = 'Téléchargement en cours… 0';
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };
  const PAGE = 1000;
  let offset = 0;
  let all = [];
  try {
    while (true) {
      const url = SUPABASE_URL + '/rest/v1/SanitaryBlocks_Inventory?select=' + TOI_SELECT + '&order=UB_id&offset=' + offset + '&limit=' + PAGE;
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const rows = await resp.json();
      all = all.concat(rows);
      if (status) status.textContent = 'Téléchargement en cours… ' + all.length.toLocaleString('fr-FR');
      if (rows.length < PAGE) break;
      offset += PAGE;
    }
    if (!all.length) throw new Error('table vide ou introuvable — vérifie que la base a bien été publiée depuis StatSan');
    // les modifications locales pas encore envoyees restent prioritaires sur la version serveur
    // MAP_DATA_TOI est const (declare dans le bloc de donnees) : on le MUTE en place, jamais de reassignation.
    const merged = all.map(r => (dirtyFeedback.has(r.UB_id) ? Object.assign({}, r, dirtyFeedback.get(r.UB_id)) : r));
    MAP_DATA_TOI.length = 0;
    merged.forEach(r => MAP_DATA_TOI.push(r));
    pendingNewToilets.forEach(p => MAP_DATA_TOI.push(p));
    buildLayers();
    if (status) status.textContent = '✓ Base mise à jour : ' + all.length.toLocaleString('fr-FR') + ' toilettes, à ' + new Date().toLocaleTimeString('fr-FR') + '.';
    showToast('✓ Base toilettes actualisée (' + all.length.toLocaleString('fr-FR') + ').');
  } catch (err) {
    if (status) status.textContent = '⚠ Échec (' + all.length.toLocaleString('fr-FR') + ' reçues) : ' + err.message;
    logClientError('refreshBaseFromServer', err && err.message, { received: all.length });
  }
}

// Un seul bouton "Actualiser" : envoie d'abord les actions en attente, puis recupere la derniere base publiee.
async function syncAndRefresh(){
  await syncNow(false);
  await refreshBaseFromServer();
}

/* ---------- Sheet (fiche + actions) ---------- */
function openSheet(ubId){
  currentSheetUbId = ubId;
  const t = findToiByUbId(ubId);
  if (!t) return;
  const body = document.getElementById('sheet-body');
  const deleted = t.Exists === false;
  const kind = classify(t);
  const equipements = t.Equipment || {};
  const equipState = JSON.parse(JSON.stringify(equipements));

  body.innerHTML =
    '<div class="refid-tag">'+ubId+'</div>'+
    '<div id="sheet-title">'+(t.Name||'Toilette publique')+(deleted?' <span style="color:#ff8080;font-size:12px;">(supprimée)</span>':'')+'</div>'+
    (t.Adresse?'<div class="sheet-row"><span class="k">📍</span> '+t.Adresse+'</div>':'')+
    (t.City?'<div class="sheet-row"><span class="k">🏘</span> '+t.City+'</div>':'')+
    (t.Provider?'<div class="sheet-row"><span class="k">Opérateur</span> '+t.Provider+'</div>':'')+
    '<div class="badges" style="margin:8px 0;">'+
      '<span class="badge" style="background:'+(t.Automatic?'#8b5cf6':'#4b5b60')+';">'+(t.Automatic?'Automatique':'Classique')+'</span>'+
      '<span class="badge" style="background:'+V_COLORS[kind]+';">'+V_LABELS[kind]+'</span>'+
    '</div>'+

    '<div class="big-actions">'+
      '<button class="big-btn '+(deleted?'':'btn-confirm')+'" id="sheet-btn-confirm" '+(deleted?'style="background:var(--panel2);color:var(--ink-dim);"':'')+'><span class="ic">✓</span>'+(deleted?'Restaurer':'Confirmé')+'</button>'+
      (deleted?'':'<button class="big-btn btn-delete" id="sheet-btn-delete"><span class="ic">✕</span>Disparu</button>')+
      (deleted?'':'<button class="big-btn btn-edit" id="sheet-btn-reposition"><span class="ic">📍</span>À repositionner</button>')+
    '</div>'+
    '<div class="link-row"><a href="https://www.google.com/maps/search/?api=1&query='+t.Latitude+','+t.Longitude+'" target="_blank">📍 Google Maps</a>'+
    '<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+t.Latitude+','+t.Longitude+'" target="_blank">👁 Street View</a></div>'+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:8px;">★ Avis</div>'+
    starRowHtml(t.Rating_Overall)+
    Object.keys(RATING_LABELS).map(k => smileyRowHtml(k, RATING_LABELS[k], t[k])).join('')+
    ratingsOverviewHtml()+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:8px;">🧴 Équipements</div>'+
    Object.keys(EQUIP_LABELS).map(k => equipStateRowHtml(k, EQUIP_LABELS[k], equipements[k])).join('')+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:8px;">ℹ️ Informations complémentaires</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">'+
      COUNT_FIELDS.map(c => '<div class="form-row"><label>'+c.label+'</label><input type="number" min="0" inputmode="numeric" class="count-input" data-field="'+c.field+'" value="'+(t[c.field]||0)+'"></div>').join('')+
    '</div>'+
    toggle2RowHtml('Automatique', 'Automatic', t.Automatic===true?true:(t.Automatic===false?false:null), 'Automatique', 'Classique')+
    toggle2RowHtml('Convient à un enfant seul', 'Adapte_Enfant', t.Adapte_Enfant===true?true:(t.Adapte_Enfant===false?false:null), 'Oui', 'Non')+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:8px;">📷 Photos</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">'+
      PHOTO_CATS.map(c => '<button type="button" class="btn-gps photo-cap-btn" data-field="'+c.field+'" style="flex:1;min-width:30%;">'+c.icon+' '+c.label+'</button>').join('')+
    '</div>'+
    '<input type="file" id="sheet-photo-file" accept="image/*" capture="environment" style="display:none;">'+
    photoGalleryHtml(t)+

    positionSectionHtml()+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<button class="big-btn btn-delete" id="sheet-btn-incident" style="width:100%;flex-direction:row;justify-content:center;background:var(--panel2);color:var(--err);border:1px solid var(--err) !important;"><span class="ic" style="font-size:15px;">⚠</span>&nbsp;Signaler une incivilité ou un vandalisme</button>'+
    '<div style="font-size:9.5px;color:var(--ink-dim);text-align:center;margin-top:4px;">Chaque signalement aide à mieux protéger le réseau — merci de contribuer 🙏</div>'+
    myIncidentPhotosHtml(ubId)+

    '<div style="border-top:1px solid var(--line);margin:16px 0 12px;"></div>'+
    '<div class="form-row"><label>Zone d\'expression libre</label><textarea id="sheet-comment" placeholder="Un commentaire, une remarque…">'+(t.Comment||'')+'</textarea></div>';

  loadPhotoCarousel(t);
  loadRatingsOverview(t);

  document.getElementById('sheet-btn-confirm').addEventListener('click', () => {
    queueFeedback(ubId, { Exists:true });
    showToast('✓ Confirmée sur le terrain.');
    openSheet(ubId);
  });
  const delBtn = document.getElementById('sheet-btn-delete');
  if (delBtn) delBtn.addEventListener('click', () => {
    queueFeedback(ubId, { Exists:false });
    showToast('✕ Marquée disparue.');
    openSheet(ubId);
  });
  const repoBtn = document.getElementById('sheet-btn-reposition');
  if (repoBtn) repoBtn.addEventListener('click', () => {
    document.getElementById('position-section').scrollIntoView({ behavior:'smooth', block:'start' });
  });

  document.getElementById('star-row').querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('click', () => {
      const n = parseInt(star.dataset.star, 10);
      t.Rating_Overall = n;
      queueFeedback(ubId, { Rating_Overall: n });
      document.getElementById('star-row').querySelectorAll('.star-btn').forEach(s => {
        s.style.opacity = (parseInt(s.dataset.star,10) <= n) ? '1' : '.3';
      });
      showToast('✓ Note globale enregistrée.');
    });
  });
  document.querySelectorAll('.smiley-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field, val = parseInt(btn.dataset.val, 10);
      t[field] = val;
      queueFeedback(ubId, { [field]: val });
      document.querySelectorAll('.smiley-btn[data-field="'+field+'"]').forEach(b => {
        const active = parseInt(b.dataset.val,10) === val;
        b.style.background = active ? 'var(--accent)' : 'var(--panel2)';
        b.style.opacity = active ? '1' : '.55';
      });
    });
  });
  document.querySelectorAll('.equip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.eq, etat = btn.dataset.etat;
      equipState[key] = { etat };
      t.Equipment = equipState;
      queueFeedback(ubId, { Equipment: equipState });
      document.querySelectorAll('.equip-btn[data-eq="'+key+'"]').forEach(b => {
        const active = b.dataset.etat === etat;
        b.style.background = active ? (etat==='absent'?'var(--err)':'var(--accent)') : 'var(--panel2)';
        b.style.opacity = active ? '1' : (etat==='absent'?'.7':'.55');
      });
    });
  });
  document.querySelectorAll('.count-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const v = parseInt(inp.value, 10) || 0;
      inp.value = v;
      t[inp.dataset.field] = v;
      queueFeedback(ubId, { [inp.dataset.field]: v });
    });
  });
  document.querySelectorAll('.toggle2-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field, val = btn.dataset.val === '1';
      t[field] = val;
      queueFeedback(ubId, { [field]: val });
      openSheet(ubId);
    });
  });
  document.getElementById('sheet-comment').addEventListener('blur', () => {
    const v = document.getElementById('sheet-comment').value.trim();
    t.Comment = v;
    queueFeedback(ubId, { Comment: v });
  });

  const photoFileInput = document.getElementById('sheet-photo-file');
  document.querySelectorAll('.photo-cap-btn').forEach(btn => {
    btn.addEventListener('click', () => { photoFileInput.dataset.pendingField = btn.dataset.field; photoFileInput.click(); });
  });
  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const field = photoFileInput.dataset.pendingField;
    showToast('Traitement de la photo…');
    compressImage(file, 900, 0.6).then(dataUri => {
      t[field] = dataUri;
      queueFeedback(ubId, { [field]: dataUri });
      loadPhotoCarousel(t);
      hideToast();
      showToast('✓ Photo enregistrée.');
    }).catch(() => showToast('Erreur lors du traitement de la photo.'));
    e.target.value = '';
  });

  document.getElementById('btn-vote-position').addEventListener('click', () => {
    if (!navigator.geolocation){ showToast('Géolocalisation non disponible.'); return; }
    showToast('Localisation en cours…');
    navigator.geolocation.getCurrentPosition(async pos => {
      try{
        const res = await sbRpc('vote_toilet_position', { p_ub_id: ubId, p_lat: pos.coords.latitude, p_lon: pos.coords.longitude, p_device_id: DEVICE_ID });
        showToast('✓ Vous venez de confirmer la position juste du sanitaire. MERCI DE VOTRE CONTRIBUTION !', 5000);
        if (res && res.updated) refreshBaseFromServer();
      }catch(err){
        logClientError('vote_toilet_position', err && err.message, { ub_id: ubId });
        showToast('⚠ Échec de l\'envoi de votre position (hors ligne ?).');
      }
    }, () => showToast('Position indisponible.'), { enableHighAccuracy:true, timeout:10000 });
  });

  document.getElementById('sheet-btn-incident').addEventListener('click', () => openIncidentForm(ubId));

  document.getElementById('sheet-overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
}
function closeSheet(){
  document.getElementById('sheet-overlay').classList.remove('show');
  document.getElementById('sheet').classList.remove('show');
}
document.getElementById('sheet-overlay').addEventListener('click', closeSheet);

/* ---------- Signalement d'incivilité / vandalisme ---------- */
function openIncidentForm(ubId){
  const body = document.getElementById('sheet-body');
  body.innerHTML =
    '<div id="sheet-title">⚠ Signaler une incivilité ou un vandalisme</div>'+
    '<p style="font-size:11.5px;color:var(--ink-dim);margin:0 0 14px;">Photo obligatoire, description facultative. Consultable indépendamment du constat habituel.</p>'+
    '<div class="form-row"><label>Photo</label><div id="incident-photo-preview"></div>'+
      '<button type="button" class="btn-gps" id="incident-photo-btn" style="width:100%;">📷 Prendre une photo</button>'+
      '<input type="file" id="incident-photo-file" accept="image/*" capture="environment" style="display:none;"></div>'+
    '<div class="form-row"><label>Description</label><textarea id="incident-desc"></textarea></div>'+
    '<div class="form-actions"><button id="btn-cancel-incident">Annuler</button><button id="btn-save-incident">✓ Envoyer</button></div>';

  window._incidentPhoto = null;
  document.getElementById('incident-photo-btn').addEventListener('click', () => document.getElementById('incident-photo-file').click());
  document.getElementById('incident-photo-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Traitement de la photo…');
    compressImage(file, 900, 0.6).then(dataUri => {
      window._incidentPhoto = dataUri;
      document.getElementById('incident-photo-preview').innerHTML = '<img src="'+dataUri+'" style="width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-bottom:8px;">';
      hideToast();
    }).catch(() => showToast('Erreur lors du traitement de la photo.'));
    e.target.value = '';
  });
  document.getElementById('btn-cancel-incident').addEventListener('click', () => openSheet(ubId));
  document.getElementById('btn-save-incident').addEventListener('click', () => {
    if (!window._incidentPhoto){ showToast('Une photo est nécessaire.'); return; }
    pendingIncidents.push({ UB_id: ubId, Photo: window._incidentPhoto, Description: document.getElementById('incident-desc').value.trim() });
    saveMyIncidentPhoto(ubId, window._incidentPhoto);
    savePendingQueue();
    updateSyncStatus();
    showToast('✓ Incident signalé, sera envoyé à la prochaine synchro.');
    openSheet(ubId);
  });
}

/* ---------- Formulaire d'édition (existant ou nouveau signalement) ---------- */
// Formulaire utilise uniquement pour le signalement d'une NOUVELLE toilette (bouton +) : Name/Adresse/City
// et la position initiale ne sont modifiables qu'a la creation. Pour une toilette existante, tout se fait
// desormais directement dans openSheet() (notes/equipements/comptes/photos en un seul ecran auto-enregistre),
// et repositionner une toilette existante passe par le vote GPS communautaire (voir positionSectionHtml()).
function openForm(ubId){
  const t = findToiByUbId(ubId);
  const body = document.getElementById('sheet-body');
  body.innerHTML =
    '<div id="sheet-title">Signaler une toilette</div>'+
    '<div class="form-row"><label>Nom / repère</label><input type="text" id="f-name" value="'+(t.Name||'')+'"></div>'+
    '<div class="form-row"><label>Adresse</label><input type="text" id="f-adresse" value="'+(t.Adresse||'')+'"></div>'+
    '<div class="form-row"><label>Commune</label><input type="text" id="f-city" value="'+(t.City||'')+'"></div>'+
    COUNT_FIELDS.map(c => '<div class="form-row"><label>'+c.label+'</label><input type="number" min="0" inputmode="numeric" id="f-'+c.field+'" value="'+(t[c.field]||0)+'"></div>').join('')+
    '<div class="form-row"><label>Automatique</label><select id="f-auto">'+
      '<option value="0"'+(!t.Automatic?' selected':'')+'>Classique</option><option value="1"'+(t.Automatic?' selected':'')+'>Automatique</option>'+
    '</select></div>'+
    '<div class="form-row"><label>Convient à un enfant seul</label><select id="f-adapte-enfant">'+
      '<option value=""'+(t.Adapte_Enfant==null?' selected':'')+'>Non renseigné</option>'+
      '<option value="1"'+(t.Adapte_Enfant===true?' selected':'')+'>Oui</option>'+
      '<option value="0"'+(t.Adapte_Enfant===false?' selected':'')+'>Non</option>'+
    '</select></div>'+
    '<div class="form-row"><label>Position</label>'+
      '<div class="gps-row"><input type="text" id="f-lat" placeholder="Latitude" value="'+t.Latitude+'">'+
      '<input type="text" id="f-lon" placeholder="Longitude" value="'+t.Longitude+'">'+
      '<button type="button" class="btn-gps" id="f-btn-gps">📍</button></div>'+
      '<p style="font-size:10.5px;color:var(--ink-dim);margin:5px 0 0;">Bouton 📍 = position GPS actuelle.</p></div>'+
    '<div class="form-row"><label>Note terrain</label><textarea id="f-note">'+(t.Comment||'')+'</textarea></div>'+
    '<div class="form-row"><label>Photos (une par catégorie, remplace la précédente)</label>'+
      '<div id="f-photos-list"></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">'+
        PHOTO_CATS.map(c => '<button type="button" class="btn-gps" data-field="'+c.field+'" style="flex:1;min-width:30%;">'+c.icon+' '+c.label+'</button>').join('')+
      '</div>'+
      '<input type="file" id="f-photo-file" accept="image/*" capture="environment" style="display:none;"></div>'+
    '<div class="form-actions"><button id="btn-cancel-form">Annuler</button><button id="btn-save-form">✓ Enregistrer</button></div>';

  window._formPhotos = {};
  PHOTO_CATS.forEach(c => { if (t[c.field]) window._formPhotos[c.field] = t[c.field]; });
  renderFormPhotos();

  const photoFileInput = document.getElementById('f-photo-file');
  document.querySelectorAll('[data-field]').forEach(btn => {
    btn.addEventListener('click', () => { photoFileInput.dataset.pendingField = btn.dataset.field; photoFileInput.click(); });
  });
  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const field = photoFileInput.dataset.pendingField;
    showToast('Traitement de la photo…');
    compressImage(file, 900, 0.6).then(dataUri => {
      window._formPhotos[field] = dataUri;
      renderFormPhotos();
      hideToast();
    }).catch(() => showToast('Erreur lors du traitement de la photo.'));
    e.target.value = '';
  });
  document.getElementById('f-btn-gps').addEventListener('click', () => {
    if (!navigator.geolocation){ showToast('Géolocalisation non disponible.'); return; }
    showToast('Localisation…');
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById('f-lat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('f-lon').value = pos.coords.longitude.toFixed(6);
      hideToast();
    }, () => showToast('Position indisponible.'), { enableHighAccuracy:true, timeout:10000 });
  });
  document.getElementById('btn-cancel-form').addEventListener('click', () => openSheet(ubId));
  document.getElementById('btn-save-form').addEventListener('click', () => saveForm(ubId));
}
function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio); height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function renderFormPhotos(){
  const wrap = document.getElementById('f-photos-list');
  if (!wrap) return;
  wrap.innerHTML = PHOTO_CATS.filter(c => window._formPhotos[c.field]).map(c => {
    const url = window._formPhotos[c.field];
    return '<div class="photo-row" style="align-items:center;">'+
      '<img src="'+url+'" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex:none;">'+
      '<span style="flex:1;font-size:11px;color:var(--ink-dim);">'+c.icon+' '+c.label+'</span>'+
      '<button type="button" onclick="delete window._formPhotos[\''+c.field+'\']; renderFormPhotos();">✕</button></div>';
  }).join('');
}

function saveForm(ubId){
  const t = findToiByUbId(ubId);
  const patch = {
    Name: document.getElementById('f-name').value.trim(),
    Adresse: document.getElementById('f-adresse').value.trim(),
    City: document.getElementById('f-city').value.trim(),
    Automatic: document.getElementById('f-auto').value === '1',
    Comment: document.getElementById('f-note').value.trim()
  };
  const adapteEnfantV = document.getElementById('f-adapte-enfant').value;
  if (adapteEnfantV !== '') patch.Adapte_Enfant = adapteEnfantV === '1';
  COUNT_FIELDS.forEach(c => { patch[c.field] = parseInt(document.getElementById('f-'+c.field).value, 10) || 0; });
  const latV = parseFloat(document.getElementById('f-lat').value);
  const lonV = parseFloat(document.getElementById('f-lon').value);
  if (isFinite(latV) && isFinite(lonV)){ patch.Latitude = latV; patch.Longitude = lonV; }
  PHOTO_CATS.forEach(c => { if (window._formPhotos[c.field]) patch[c.field] = window._formPhotos[c.field]; });

  Object.assign(t, patch);
  // Name/Adresse/City ne sont modifiables qu'a la creation (report_new_toilet) ; le reste part en feedback normal
  delete patch.Name; delete patch.Adresse; delete patch.City;
  const existing = dirtyFeedback.get(ubId);
  if (existing) dirtyFeedback.set(ubId, Object.assign(existing, patch));
  else {
    const idxNew = pendingNewToilets.findIndex(p => p.UB_id === ubId);
    if (idxNew >= 0) Object.assign(pendingNewToilets[idxNew], t);
  }
  savePendingQueue();
  buildLayers();
  closeSheet();
  showToast('✓ Enregistré.');
}

/* ---------- Signaler une nouvelle toilette ---------- */
document.getElementById('btn-add').addEventListener('click', () => {
  const center = map.getCenter();
  const create = (lat, lon) => {
    const tempId = 'TEMP-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    const p = { UB_id: tempId, Sources:['PSM'], Name:'', Adresse:'', City:'', Latitude:lat, Longitude:lon, Exists:true, MSB:1, PMR:0, Automatic:false, Certified:true, Verified:false };
    MAP_DATA_TOI.push(p);
    pendingNewToilets.push(p);
    savePendingQueue();
    updateSyncStatus();
    buildLayers();
    openForm(tempId);
    document.getElementById('sheet-overlay').classList.add('show');
    document.getElementById('sheet').classList.add('show');
  };
  if (navigator.geolocation){
    showToast('Localisation en cours…');
    navigator.geolocation.getCurrentPosition(pos => { hideToast(); create(pos.coords.latitude, pos.coords.longitude); },
      () => { showToast('Position indisponible — utilisation du centre de la carte.'); create(center.lat, center.lng); },
      { enableHighAccuracy:true, timeout:8000 });
  } else {
    create(center.lat, center.lng);
  }
});

/* ---------- Menu (synchro / base / à propos) ---------- */
function buildMenu(){
  const body = document.getElementById('menu-body');
  body.innerHTML =
    '<div class="menu-section"><h3>Actualiser</h3>'+
      '<p style="font-size:10.5px;color:var(--ink-dim);margin:0 0 8px;line-height:1.5;">Envoie tes actions en attente puis récupère les dernières toilettes ajoutées par les autres ('+MAP_DATA_TOI.length.toLocaleString('fr-FR')+' actuellement chargées).</p>'+
      '<button class="menu-btn primary" id="menu-sync">🔄 Actualiser</button>'+
      '<p id="sync-status" style="font-size:10.5px;color:var(--ink-dim);margin:6px 0 0;"></p>'+
    '</div>'+
    '<div class="menu-section"><h3>Compte</h3>'+
      (currentUser ?
        ('<p style="font-size:11px;color:var(--ink-dim);margin:0 0 8px;">Connecté : '+currentUser.email+'<br>'+(hasMobileAccess?'✓ Accès aux signalements DIV':'Pas encore d\'accès aux signalements DIV — demandez-le à l\'administrateur.')+'</p>'+
        '<button class="menu-btn" id="menu-logout">Se déconnecter</button>')
      :
        ('<p style="font-size:10.5px;color:var(--ink-dim);margin:0 0 8px;line-height:1.5;">Optionnel — tout le reste de l\'appli fonctionne sans connexion. Connectez-vous pour consulter les photos de signalements d\'incivilités et de vandalismes déjà transmises par d\'autres utilisateurs.</p>'+
        '<div class="form-row" style="margin-bottom:6px;"><input type="email" id="login-email" placeholder="Email"></div>'+
        '<div class="form-row" style="margin-bottom:8px;"><input type="password" id="login-password" placeholder="Mot de passe"></div>'+
        '<button class="menu-btn primary" id="menu-login">Se connecter</button>'+
        '<p id="login-status" style="font-size:10.5px;color:var(--ink-dim);margin:6px 0 0;"></p>')
      )+
    '</div>'+
    '<div class="menu-section"><h3>Apparence</h3>'+
      '<div class="form-row" style="display:flex;gap:6px;">'+
        ['system','light','dark'].map(m => {
          const active = getThemeMode() === m;
          const label = m === 'system' ? '📱 Système' : (m === 'light' ? '☀ Clair' : '🌙 Sombre');
          return '<button class="menu-btn theme-choice" data-theme-choice="'+m+'" style="flex:1;padding:8px 4px;'+(active ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '')+'">'+label+'</button>';
        }).join('')+
      '</div>'+
    '</div>'+
    '<div class="menu-section"><h3>Partager l\'application</h3>'+
      '<p style="font-size:10.5px;color:var(--ink-dim);margin:0 0 10px;line-height:1.5;">Fais scanner ce code a quelqu\'un pour qu\'il installe SpotSan — la procedure adaptee a son telephone (Android ou iPhone) s\'affiche automatiquement.</p>'+
      '<div id="share-qr" style="display:flex;justify-content:center;background:#fff;border-radius:10px;padding:12px;margin-bottom:10px;"></div>'+
      '<button class="menu-btn" id="menu-copy-link">🔗 Copier le lien</button>'+
      '<p id="copy-link-status" style="font-size:10.5px;color:var(--ink-dim);margin:6px 0 0;"></p>'+
    '</div>'+
    '<div class="menu-section"><h3>À propos</h3>'+
      '<p style="font-size:11.5px;color:var(--ink-dim);margin:0 0 12px;">'+APP_VERSION+' · synchronisé avec '+SYNCED_WITH+'</p>'+
      '<div style="border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0;margin-bottom:14px;font-size:10.5px;color:var(--ink-dim);line-height:1.6;">'+
        '<div style="font-weight:bold;color:var(--ink);">© 2026 UrBizia. Tous droits réservés.</div>'+
        '<div>Cette application, son code source et les données qu\'elle contient — hors données déjà issues du domaine public (OpenStreetMap, portails open data, INSEE/Etalab, etc.) — sont la propriété exclusive d\'UrBizia. Toute reproduction, distribution, modification, extraction ou rétro-ingénierie, en tout ou partie, est strictement interdite sans autorisation écrite préalable d\'UrBizia.</div>'+
        '<div style="margin-top:6px;font-style:italic;">Conception Gilles BRUN GAUTIER</div>'+
      '</div>'+
    '</div>';
  document.getElementById('menu-sync').addEventListener('click', syncAndRefresh);
  if (currentUser){
    document.getElementById('menu-logout').addEventListener('click', async () => {
      await sbAuth.auth.signOut();
      currentUser = null; hasMobileAccess = false;
      buildMenu();
    });
  } else {
    document.getElementById('menu-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const status = document.getElementById('login-status');
      status.textContent = 'Connexion…';
      const { error } = await sbAuth.auth.signInWithPassword({ email, password });
      if (error){ status.textContent = 'Identifiants invalides.'; return; }
      await checkMobileAccess();
      buildMenu();
    });
  }
  updateSyncStatus();
  document.querySelectorAll('.theme-choice').forEach(btn => {
    btn.addEventListener('click', () => { applyTheme(btn.getAttribute('data-theme-choice')); buildMenu(); });
  });
  const SHARE_URL = new URL('install.html', window.location.href).href;
  const qrBox = document.getElementById('share-qr');
  if (qrBox && window.QRCode){
    qrBox.innerHTML = '';
    new QRCode(qrBox, { text: SHARE_URL, width:176, height:176, colorDark:'#0B1416', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M });
  }
  document.getElementById('menu-copy-link').addEventListener('click', () => {
    const status = document.getElementById('copy-link-status');
    (navigator.clipboard ? navigator.clipboard.writeText(SHARE_URL) : Promise.reject())
      .then(() => { status.textContent = '✓ Lien copié.'; })
      .catch(() => { status.textContent = SHARE_URL; });
  });
}
document.getElementById('btn-menu').addEventListener('click', () => {
  buildMenu();
  document.getElementById('menu-overlay').classList.add('show');
  document.getElementById('menu-panel').classList.add('show');
});
document.getElementById('menu-close').addEventListener('click', closeMenu);
document.getElementById('menu-overlay').addEventListener('click', closeMenu);
function closeMenu(){
  document.getElementById('menu-overlay').classList.remove('show');
  document.getElementById('menu-panel').classList.remove('show');
}

/* ---------- Écran d'accueil ---------- */
document.getElementById('btn-welcome-start').addEventListener('click', () => {
  document.getElementById('welcome-overlay').style.display = 'none';
  locateOnStartup();
});

function metersToDegLat(m){ return m / 111320; }
function metersToDegLon(m, lat){ return m / (111320 * Math.cos(lat * Math.PI / 180)); }

// Recentre la carte sur (lat, lon) avec une vue d'environ 1km de large (rayon 500m), et pose/deplace le marqueur utilisateur.
function recenterOnPosition(latitude, longitude, animate){
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([latitude, longitude], { radius:9, color:'#fff', weight:2, fillColor:'#3b82f6', fillOpacity:.9 }).addTo(map);
  const dLat = metersToDegLat(500), dLon = metersToDegLon(500, latitude);
  const bounds = L.latLngBounds(
    [latitude - dLat, longitude - dLon],
    [latitude + dLat, longitude + dLon]
  );
  map.fitBounds(bounds, { animate: !!animate });
}

// Recentre la carte sur (lat, lon) sans poser de marqueur "ma position" — utilisé pour un lieu recherché, pas la géoloc de l'utilisateur.
function flyToPlace(latitude, longitude, zoom){
  map.flyTo([latitude, longitude], zoom, { animate:true, duration:0.6 });
}

/* ---------- Recherche de lieu (API Adresse du gouvernement, gratuite, sans clé) ---------- */
let placeSearchDebounce = null;
let placeSearchAbort = null;
function closePlaceSearchResults(){
  const box = document.getElementById('place-search-results');
  if (box){ box.style.display = 'none'; box.innerHTML = ''; }
}
async function runPlaceSearch(query){
  const box = document.getElementById('place-search-results');
  if (!box) return;
  if (!query || query.trim().length < 2){ closePlaceSearchResults(); return; }
  if (placeSearchAbort) placeSearchAbort.abort();
  placeSearchAbort = new AbortController();
  try{
    const resp = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(query.trim()) + '&limit=5', { signal: placeSearchAbort.signal });
    const data = await resp.json();
    const feats = data.features || [];
    if (!feats.length){
      box.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--ink-dim);">Aucun résultat.</div>';
      box.style.display = 'block';
      return;
    }
    box.innerHTML = feats.map((f, i) =>
      '<div class="place-result" data-idx="' + i + '" style="padding:9px 14px;font-size:12.5px;color:var(--ink);border-top:1px solid var(--line);cursor:pointer;">' + f.properties.label + '</div>'
    ).join('');
    box.style.display = 'block';
    box.querySelectorAll('.place-result').forEach(el => {
      el.addEventListener('click', () => {
        const f = feats[+el.dataset.idx];
        const [lon, lat] = f.geometry.coordinates;
        const zoom = (f.properties.type === 'municipality' || f.properties.type === 'locality') ? 13 : 16;
        flyToPlace(lat, lon, zoom);
        document.getElementById('place-search').value = f.properties.label;
        closePlaceSearchResults();
      });
    });
  }catch(e){ /* recherche annulée (nouvelle frappe) ou hors-ligne : on abandonne silencieusement */ }
}
document.getElementById('place-search').addEventListener('input', (e) => {
  clearTimeout(placeSearchDebounce);
  const q = e.target.value;
  placeSearchDebounce = setTimeout(() => runPlaceSearch(q), 350);
});
document.getElementById('place-search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter'){
    e.preventDefault();
    clearTimeout(placeSearchDebounce);
    runPlaceSearch(e.target.value);
  }
});
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('place-search-wrap');
  if (wrap && !wrap.contains(e.target)) closePlaceSearchResults();
});

function locateOnStartup(){
  if (!navigator.geolocation) return; // pas de géoloc dispo : la vue nationale par défaut reste affichée
  navigator.geolocation.getCurrentPosition(pos => {
    recenterOnPosition(pos.coords.latitude, pos.coords.longitude, false);
  }, () => { /* position refusée ou indisponible : la vue nationale par défaut reste affichée, l'utilisateur peut toujours toucher ◎ */ },
  { enableHighAccuracy:true, timeout:8000 });
}

/* ---------- Service worker (mode installable / hors-ligne partiel) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* hébergement sans HTTPS ou fichier ouvert en local : PWA non disponible, l'app reste utilisable normalement */ });
  });
}

/* ---------- Initialisation ---------- */
document.title = 'SpotSan ' + APP_VERSION;
document.getElementById('version-pill').textContent = APP_VERSION;
document.getElementById('welcome-version').textContent = APP_VERSION + ' — Août 2026';
const URBIZIA_LOGO_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4xLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkNhbHF1ZV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjU1Ny4zODFweCIgaGVpZ2h0PSI1NjIuMjYycHgiIHZpZXdCb3g9IjE2NTIuMDgxIDg5LjEyOCA1NTcuMzgxIDU2Mi4yNjIiDQoJIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMTY1Mi4wODEgODkuMTI4IDU1Ny4zODEgNTYyLjI2MiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzFfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjE5NTMuNjU4NCIgeTE9IjQ2Ny42NTk5IiB4Mj0iMTk1My42NTg0IiB5Mj0iNDIuNDY5NSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAtMTU1LjkyOTcgNjkzLjM1ODkpIj4NCgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojRTlEOEJCIi8+DQoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzVGNDMyNCIvPg0KPC9saW5lYXJHcmFkaWVudD4NCjxwYXRoIGZpbGw9InVybCgjU1ZHSURfMV8pIiBzdHJva2U9IiM1RjQzMjQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTE5MzQuMzYyLDU1MS4xM2M4LjE0MSw0LjY4OSwxMC45MzEsMTUuMDksNi4yMjksMjMuMjI5DQoJbC0zMS45Miw1NS4yNzFjLTcuNTkxLDEzLjE1OS0yMS42MywyMS4yNi0zNi44MiwyMS4yNmgtMTE3LjgyOWMtMTUuMTg5LDAtMjkuMjI5LTguMS0zNi44Mi0yMS4yNmwtNTguOTItMTAyLjA0DQoJYy03LjYwMS0xMy4xNi03LjYwMS0yOS4zNywwLTQyLjUyMWwxMzcuNDcxLTIzOC4xMWM3LjYtMTMuMTU5LDIxLjYzLTIxLjI2LDM2LjgxOS0yMS4yNmg1NC4wMTFjOS4zOSwwLDE3LjAxLDcuNjA5LDE3LjAxLDE3LjAxDQoJYzAsOS4zOTEtNy42MiwxNy0xNy4wMSwxN2gtNDQuMTljLTkuMTA5LDAtMTcuNTI5LDQuODctMjIuMDksMTIuNzYxTDE2OTIuNjUzLDQ5My41N2MtNC41NjEsNy44OTEtNC41NjEsMTcuNjE5LDAsMjUuNTExDQoJbDQ5LjA5LDg1LjAzOWM0LjU2MSw3Ljg5OSwxMi45NzksMTIuNzYxLDIyLjEwMSwxMi43NjFoOTguMTg5YzkuMTIsMCwxNy41NC00Ljg2LDIyLjEwMS0xMi43NjFsMjctNDYuNzcxDQoJQzE5MTUuODMyLDU0OS4yMTksMTkyNi4yMzIsNTQ2LjQyOSwxOTM0LjM2Miw1NTEuMTN6Ii8+DQo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzJfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjE4ODguNjkwNyIgeTE9IjU5OC4wMzEiIHgyPSIyMTA5LjkzNzUiIHkyPSIyMTQuODIwMiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAtMTU1LjkyOTcgNjkzLjM1ODkpIj4NCgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5MTI2Ii8+DQoJPHN0b3AgIG9mZnNldD0iMC44Nzg4IiBzdHlsZT0ic3RvcC1jb2xvcjojQzlGRkMzIi8+DQo8L2xpbmVhckdyYWRpZW50Pg0KPHBhdGggZmlsbD0idXJsKCNTVkdJRF8yXykiIHN0cm9rZT0iIzAwOTEyNiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNMjA0Ni4xNTIsMzQ4Ljk5OWM3LjU5LDEzLjE2LDcuNTksMjkuMzcsMCw0Mi41MjENCglsLTI3LjAxMSw0Ni43OGMtNC42ODksOC4xMy0xNS4wOSwxMC45Mi0yMy4yMjksNi4yMmMtOC4xMy00LjY4OS0xMC45Mi0xNS4xLTYuMjItMjMuMjI5bDIyLjA5LTM4LjI3MQ0KCWM0LjU2MS03Ljg5MSw0LjU2MS0xNy42MTksMC0yNS41MTFsLTEyNy42NDktMjIxLjFjLTQuNTYxLTcuOS0xMi45NzktMTIuNzYtMjIuMTAxLTEyLjc2aC05OC4xODljLTkuMTIsMC0xNy41NCw0Ljg1OC0yMi4xMDEsMTIuNzYNCglsLTQ5LjA5LDg1LjA0Yy00LjU2MSw3Ljg5LTQuNTYxLDE3LjYwOSwwLDI1LjUxbDI3LDQ2Ljc3MWM0LjY5OSw4LjEzMSwxLjkxLDE4LjU0LTYuMjI5LDIzLjIyOWMtOC4xMyw0LjctMTguNTMsMS45MS0yMy4yMjktNi4yMg0KCWwtMzEuOTEtNTUuMjhjLTcuNjAxLTEzLjE0OS03LjYwMS0yOS4zNTksMC00Mi41MjFsNTguOTIxLTEwMi4wNWM3LjU5LTEzLjE0OSwyMS42My0yMS4yNjEsMzYuODE5LTIxLjI2MWgxMTcuODI5DQoJYzE1LjE4OSwwLDI5LjIzLDguMTEsMzYuODIsMjEuMjYxTDIwNDYuMTUyLDM0OC45OTl6Ii8+DQo8cmFkaWFsR3JhZGllbnQgaWQ9IlNWR0lEXzNfIiBjeD0iMjA2NS41OTAxIiBjeT0iMzIzLjA5MzUiIHI9Ijc1Ljg1NjYiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgLTE1NS45Mjk3IDY5My4zNTg5KSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPg0KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiM4MTA5M0MiLz4NCgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojQTUzNDVEIi8+DQo8L3JhZGlhbEdyYWRpZW50Pg0KPHBhdGggZmlsbD0idXJsKCNTVkdJRF8zXykiIHN0cm9rZT0iIzgxMDkzQyIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNMTk2NC4xNzIsMzUzLjI1OWM5LjM5OSwwLDE3LjAxLDcuNjEsMTcuMDEsMTcNCgljMCw5LjQtNy42MDksMTcuMDExLTE3LjAxLDE3LjAxMWgtNDMuMjIxYy0xMi4xNDksMC0yMy4zOCw2LjQ4OS0yOS40NiwxNy4wMTFsLTIxLjYwOSwzNy40MzFjLTQuNyw4LjE0LTE1LjEwMSwxMC45My0yMy4yMjksNi4yMjkNCgljLTguMTQxLTQuNjk5LTEwLjkzMS0xNS4xLTYuMjI5LTIzLjIyOWwyMS42MDktMzcuNDRjNi4wOC0xMC41MjEsNi4wOC0yMy40ODksMC0zNC4wMTFsLTIxLjYwOS0zNy40MzgNCgljLTQuNy04LjEzMS0xLjkxLTE4LjUzLDYuMjI5LTIzLjIzYzguMTMtNC42OTksMTguNTI5LTEuOTA5LDIzLjIyOSw2LjIzbDIxLjYwOSwzNy40M2M2LjA4LDEwLjUyMSwxNy4zMTEsMTcuMDExLDI5LjQ2LDE3LjAxMQ0KCWg0My4yMjFWMzUzLjI1OXoiLz4NCjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfNF8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTkyMi4zOTk3IiB5MT0iMzIzLjA5NCIgeDI9IjIzNjQuODkyOCIgeTI9IjMyMy4wOTQiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgLTE1NS45Mjk3IDY5My4zNTg5KSI+DQoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6I0Q3RTZGRCIvPg0KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiMzRjg4RjMiLz4NCjwvbGluZWFyR3JhZGllbnQ+DQo8cGF0aCBmaWxsPSJ1cmwoI1NWR0lEXzRfKSIgc3Ryb2tlPSIjM0Y4OEYzIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0yMjAzLjI2MiwzNDguOTk5YzcuNjAxLDEzLjE2LDcuNjAxLDI5LjM3LDAsNDIuNTIxDQoJbC01OC45MiwxMDIuMDUxYy03LjU5LDEzLjE1OS0yMS42MywyMS4yNi0zNi44MTksMjEuMjZoLTI3NC45NWMtMTUuMTg5LDAtMjkuMjIxLTguMTAxLTM2LjgxOS0yMS4yNmwtMjctNDYuNzcxDQoJYy00LjctOC4xMzEtMS45MS0xOC41NCw2LjIyLTIzLjIyOWM4LjE0MS00LjcsMTguNTQtMS45MSwyMy4yNCw2LjIybDIyLjA5LDM4LjI3MWM0LjU2MSw3Ljg5MSwxMi45NzksMTIuNzYxLDIyLjA5LDEyLjc2MWgyNTUuMzExDQoJYzkuMTIsMCwxNy41NC00Ljg3LDIyLjA5LTEyLjc2MWw0OS4xMDEtODUuMDRjNC41NjItNy44OTEsNC41NjItMTcuNjE5LDAtMjUuNTExbC00OS4xMDEtODUuMDRjLTQuNTUtNy44OS0xMi45Ny0xMi43Ni0yMi4wOS0xMi43Ng0KCWgtNTQuMDFjLTkuMzkxLDAtMTctNy42MDktMTctMTdjMC05LjM5OSw3LjYwOS0xNy4wMSwxNy0xNy4wMWg2My44M2MxNS4xODksMCwyOS4yMjksOC4xLDM2LjgxOSwyMS4yNkwyMjAzLjI2MiwzNDguOTk5eiIvPg0KPC9zdmc+DQo=";
document.getElementById('logo-footer-welcome').src = document.getElementById('logo-footer-brand').src = 'data:image/svg+xml;base64,'+URBIZIA_LOGO_B64;

// Remplace les logos embarques par la derniere version vectorielle si disponible (identite visuelle
// UrBizia centralisee dans acronymes.icon_svg — voir EkoMa/StatSan). Logo principal : icone SpotSan
// si elle a ete fournie, sinon repli sur la marque UrBizia generique. Petit logo secondaire ("est un
// service UrBizia") : toujours la marque UrBizia. Repli silencieux sur le SVG deja embarque en cas
// d'echec reseau ou hors-ligne — coherent avec le fonctionnement "tout doit degrader gracieusement
// sans connexion" du reste de l'app.
(async () => {
  try {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/acronymes?id=in.(SpotSan,UrBizia)&select=id,icon_svg', {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    const byId = {}; (rows || []).forEach(r => { byId[r.id] = r.icon_svg; });
    const mainSvg = byId.SpotSan || byId.UrBizia;
    const urbiziaSvg = byId.UrBizia;
    const mainUri = mainSvg && ('data:image/svg+xml;utf8,' + encodeURIComponent(mainSvg));
    const urbiziaUri = urbiziaSvg && ('data:image/svg+xml;utf8,' + encodeURIComponent(urbiziaSvg));
    if (mainUri) ['logo-welcome', 'logo-brand'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.src = mainUri;
    });
    if (urbiziaUri) ['logo-footer-welcome', 'logo-footer-brand'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.src = urbiziaUri;
    });
  } catch (e) { /* repli sur le SVG embarque */ }
})();

loadPendingQueue(); // recupere tout constat/photo/signalement pas encore synchronise d'une session precedente

// Charge le jeu de donnees "toilettes" embarque (voir data/toilets-seed.json, mis en cache par le
// service worker pour un premier affichage hors-ligne) puis demarre buildLayers()/refreshBaseFromServer()
// dans le meme ordre qu'avant l'extraction du JSON hors du HTML : seed -> premier rendu -> rafraichissement serveur.
fetch('data/toilets-seed.json')
  .then(r => r.json())
  .then(rows => {
    rows.forEach(r => MAP_DATA_TOI.push(r)); // mutation en place, jamais de reassignation (cf. gotcha CLAUDE.md)
    buildLayers();
    refreshBaseFromServer().then(() => syncNow(true));
  })
  .catch(() => {
    // seed indisponible (hors-ligne sans le SW deja installe, ou fichier manquant) : on tente quand meme
    // le serveur, comme le reste de l'app qui degrade gracieusement sans connexion.
    buildLayers();
    refreshBaseFromServer().then(() => syncNow(true));
  });
