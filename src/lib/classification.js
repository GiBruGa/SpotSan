// Classification par famille de source + filtres d'affinage -- port fidele
// de v1 (SpotSan/app.js : classify(), passesRefinements(), V_COLORS,
// V_LABELS), retire par erreur du Lot 2, redemande par Gilles le 2026-08-22.

// Ordre + libelles fixes par Gilles le 2026-08-31 (liste a cocher, colonne
// unique) : .gouv, Donnees Internet, Verifiees, contribution UrBizia.
export const FAMILLES = ['gouv', 'osm', 'verified', 'certified']

export const COULEURS = {
  verified: '#3b82f6',
  gouv: '#f5a524',
  osm: '#2fb344',
  certified: '#FFC3D5',
  supprimees: '#8a5555',
  hors_service: '#c55a7a',
}

export const LIBELLES = {
  gouv: '.gouv',
  osm: 'Données Internet',
  verified: 'Vérifiées = .gouv + internet',
  certified: 'contribution UrBizia',
  supprimees: 'Supprimées',
  hors_service: 'Hors Service',
}

/** Meme ordre de priorite qu'en v1 : Certified avant Verified. */
export function classifier(t) {
  if (t.Certified) return 'certified'
  if (t.Verified) return 'verified'
  if (t.Sources && t.Sources.includes('Gouv')) return 'gouv'
  return 'osm'
}

/**
 * Categorie effective d'affichage : supprime (Exists=false, systeme de vote
 * "Inexistant") et hors_service (Statut_Operationnel, vote "Hors Service")
 * prevalent sur la classification par source -- cf. sanitaires.js
 * signalerStatutSanitaire (2026-08-31).
 */
export function categorieAffichage(t) {
  if (t.Exists === false) return 'supprimees'
  if (t.Statut_Operationnel === 'Hors_Service') return 'hors_service'
  return classifier(t)
}

export function passeAffinages(t, affinages) {
  if (affinages.pmr && !(t.PMR > 0)) return false
  if (affinages.enfant && t.Adapte_Enfant !== true) return false
  if (affinages.bienNotees && !(t.Rating_Overall >= 4)) return false
  return true
}

export function chipsParDefaut() {
  return { verified: true, gouv: true, osm: true, certified: true, supprimees: false, hors_service: true }
}

export function affinagesParDefaut() {
  return { pmr: false, enfant: false, bienNotees: false }
}
