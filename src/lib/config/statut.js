// Statut declare du sanitaire (retour Gilles du 2026-08-31 : liste a cocher
// a choix unique, remplace les boutons "Inexistant"/"Hors Service" separes
// essayes plus tot le meme jour). Extrait de FormulaireAvis.svelte le
// 2026-09-04 pour etre reutilise aussi par FicheSanitaire.svelte (tableau
// des 10 dernieres declarations, retour Gilles du 2026-09-04).
export const STATUT_OPTIONS = [
  { valeur: 'Disponible', label: 'Disponible' },
  { valeur: 'Impraticable', label: 'Impraticable' },
  { valeur: 'Hors_Service', label: 'HS' },
  { valeur: 'Condamne', label: 'Condamné' },
  { valeur: 'Inexistante', label: 'Inexistante' },
]
