// Constantes partagees pour le formulaire "Donner son avis" (plan V2-PLAN.md §5.5).

// Refonte de l'etape "Configuration" (retour Gilles du 2026-09-03, apres
// rediscussion avec ses parents/oncles/tantes qui testent l'appli) : au lieu
// d'un compte unique + une accessibilite "Separe/Mixte" par cellule, chaque
// groupe expose desormais un compte INDEPENDANT par genre (Mixte/Femmes/
// Hommes) -- un lieu peut avoir a la fois des toilettes Femmes ET Hommes
// separement, ce que l'ancien modele ne permettait pas. "Toilettes compactes"
// (pas "Standard", pour ne pas se confondre avec l'option de type
// Standards/Automatiques ci-dessous) remplace "Toilettes Standard".
// Vestiaires retire du perimetre de cette etape (absent de la maquette).
export const GENRES = [
  { cle: 'mixte', label: 'Mixtes', couleur: 'mixte' },
  { cle: 'femmes', label: 'Femmes', couleur: 'femmes' },
  { cle: 'hommes', label: 'Hommes', couleur: 'hommes' },
]

export const GROUPES_CELLULES = [
  { cle: 'toilettes_pmr', label: 'Toilettes PMR', avecType: true, genres: ['mixte', 'femmes', 'hommes'] },
  { cle: 'toilettes_compactes', label: 'Toilettes compactes', avecType: true, genres: ['mixte', 'femmes', 'hommes'] },
  { cle: 'toilettes_enfant', label: 'Toilettes Enfant', avecType: true, note: 'avec siège surbaissé', genres: ['mixte'] },
  { cle: 'urinoirs', label: 'Urinoirs', avecType: false, genres: ['hommes', 'femmes'] },
  { cle: 'douches', label: 'Douches', avecType: true, genres: ['mixte', 'femmes', 'hommes'] },
]

// Ordre impose par Gilles le 2026-09-03 : Standards avant Automatiques.
export const TYPE_OPTIONS = ['Standards', 'Automatiques']

export const CHANGE_BEBE_OPTIONS = [
  'Indépendant sans lave-main',
  'Indépendant avec lave-main',
  'Dans une cellule Toilette Mixte',
  'Dans une cellule Toilette Femme',
]

// Ordre HS avant Abs (coherence avec l'echelle de comptage de l'etape
// "Configuration" -- 1/2/3/4/>4/HS/Abs -- retour Gilles du 2026-08-31).
export const EQUIPEMENTS = [
  { cle: 'siege_toilette', label: 'Siège de toilette', extensions: ['HS', 'Abs'], sousChoix: ['Adulte', 'Enfant'] },
  { cle: 'papier_toilette', label: 'Distributeur papier toilette', extensions: ['HS', 'Vide', 'Abs'] },
  { cle: 'lave_main', label: 'Lave-main', extensions: ['HS', 'Abs'], sousChoix: ['Par cellule', 'Commun'] },
  { cle: 'savon', label: 'Distributeur de savon', extensions: ['HS', 'Vide', 'Abs'] },
  { cle: 'seche_main', label: 'Sèche-main', extensions: ['HS', 'Abs'] },
  { cle: 'essuie_tout', label: "Distributeur d'essuie-tout", extensions: ['HS', 'Vide', 'Abs'] },
  { cle: 'poubelle', label: 'Poubelle', extensions: ['Débordante', 'Abs'] },
]
