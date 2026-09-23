/**
 * Position actuelle de l'appareil, pour la contrainte de proximite (2026-08-29,
 * demande de Gilles) -- un avis ou un signalement I&V ne peut etre soumis
 * que si l'appareil est physiquement pres du sanitaire concerne, verifie
 * cote serveur (voir soumettre_avis/signaler_incivilite en base). Cette
 * fonction elle-meme ne met jamais en cache (maximumAge: 0) et demande
 * toujours une position fraiche a l'appareil. Un appelant peut neanmoins
 * reutiliser une position deja obtenue : FormulaireAvis.svelte la met en
 * cache jusqu'a 20 minutes (DUREE_VALIDITE_POSITION_MS, retour Gilles du
 * 2026-09-18) pour ne pas recaler un Usager qui a pris ses photos puis
 * s'est un peu eloigne avant de valider.
 */
export function obtenirPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocalisation_indisponible'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error('geolocalisation_refusee')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
