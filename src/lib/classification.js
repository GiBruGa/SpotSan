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

// Contour de marqueur distinct de la couleur de remplissage -- seulement
// pour "certified" (contribution UrBizia) : le rose plein etait peu
// visible sur la carte, cercle en rouge UrBizia (#81093C, cf. Charte
// Graphique) pour le distinguer sans perdre le rose qui identifie la
// categorie (retour Gilles du 2026-08-31).
export const BORDURES = {
  certified: '#81093C',
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
 * Categorie effective d'affichage : supprime (Exists=false) et hors_service
 * (Statut_Operationnel non nul -- "Hors_Service" via le vote Usager
 * consensus, ou "Condamne" via le module Acces sanitaire EkoMa cote
 * Exploitant, 2026-08-31) prevalent sur la classification par source.
 * "Condamne" partage pour l'instant la meme couleur/filtre que
 * "Hors_Service" (les deux disent "actuellement pas utilisable"), pas de
 * distinction visuelle supplementaire demandee cote carte publique.
 */
export function categorieAffichage(t) {
  if (t.Exists === false) return 'supprimees'
  if (t.Statut_Operationnel) return 'hors_service'
  return classifier(t)
}

/**
 * Statut declaratif (domaine du champ Sanitary_Reviews.statut_declare,
 * cf. soumettre_avis) derive des champs bruts -- sert a pre-cocher la liste
 * dans FormulaireAvis (2026-08-31).
 */
export function statutActuelSanitaire(t) {
  if (!t) return 'Disponible'
  if (t.Exists === false) return 'Inexistante'
  if (t.Statut_Operationnel === 'Hors_Service') return 'Hors_Service'
  if (t.Statut_Operationnel === 'Condamne') return 'Condamne'
  if (t.Statut_Operationnel === 'Impraticable') return 'Impraticable'
  return 'Disponible'
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
