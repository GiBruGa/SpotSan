// Classification par famille de source + filtres d'affinage -- port fidele
// de v1 (SpotSan/app.js : classify(), passesRefinements(), V_COLORS,
// V_LABELS), retire par erreur du Lot 2, redemande par Gilles le 2026-08-22.

export const FAMILLES = ['verified', 'gouv', 'osm', 'certified']

export const COULEURS = {
  verified: '#3b82f6',
  gouv: '#f5a524',
  osm: '#2fb344',
  certified: '#FFC3D5',
  supprimees: '#8a5555',
}

export const LIBELLES = {
  verified: 'Vérifiés',
  gouv: 'Officiel .gouv',
  osm: 'Données publiques',
  certified: 'SpotSan',
  supprimees: 'Supprimées',
}

/** Meme ordre de priorite qu'en v1 : Certified avant Verified. */
export function classifier(t) {
  if (t.Certified) return 'certified'
  if (t.Verified) return 'verified'
  if (t.Sources && t.Sources.includes('Gouv')) return 'gouv'
  return 'osm'
}

export function passeAffinages(t, affinages) {
  if (affinages.pmr && !(t.PMR > 0)) return false
  if (affinages.enfant && t.Adapte_Enfant !== true) return false
  if (affinages.bienNotees && !(t.Rating_Overall >= 4)) return false
  return true
}

export function chipsParDefaut() {
  return { verified: true, gouv: true, osm: true, certified: true, supprimees: false }
}

export function affinagesParDefaut() {
  return { pmr: false, enfant: false, bienNotees: false }
}
