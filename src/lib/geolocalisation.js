/**
 * Position actuelle de l'appareil, pour la contrainte de proximite (2026-08-29,
 * demande de Gilles) -- un avis ou un signalement I&V ne peut etre soumis
 * que si l'appareil est physiquement pres du sanitaire concerne, verifie
 * cote serveur (voir soumettre_avis/signaler_incivilite en base). Capturee
 * au moment de la soumission, jamais mise en cache -- la position doit
 * refleter ou l'Usager se trouve reellement a cet instant.
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
