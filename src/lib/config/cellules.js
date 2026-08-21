// Constantes partagees pour le formulaire "Donner son avis" (plan V2-PLAN.md §5.5).

export const CELLULES = [
  { cle: 'toilettes_pmr', label: 'Toilettes PMR', avecType: true },
  { cle: 'toilettes_standard', label: 'Toilettes Standard', avecType: true },
  { cle: 'urinoir_hommes', label: 'Urinoir Hommes', avecType: false },
  { cle: 'urinoir_femmes', label: 'Urinoir Femmes', avecType: false },
  { cle: 'douches_pmr', label: 'Douches PMR', avecType: false },
  { cle: 'douches_standard', label: 'Douches Standard', avecType: false },
  { cle: 'vestiaires_pmr', label: 'Vestiaires PMR', avecType: false },
  { cle: 'vestiaires_standard', label: 'Vestiaires Standards', avecType: false },
]

export const ACCESSIBILITE_OPTIONS = ['Séparé Dames/Messieurs', 'Mixte']
export const TYPE_OPTIONS = ['Classique', 'Automatique', 'Chimique', 'Sèche']

export const EQUIPEMENTS = [
  { cle: 'siege_toilette', label: 'Siège de toilette', extensions: ['Abs', 'HS'], sousChoix: ['Adulte', 'Enfant'] },
  { cle: 'papier_toilette', label: 'Distributeur papier toilette', extensions: ['Abs', 'HS', 'Vide'] },
  { cle: 'lave_main', label: 'Lave-main', extensions: ['Abs', 'HS'], sousChoix: ['Par cellule', 'Commun'] },
  { cle: 'savon', label: 'Distributeur de savon', extensions: ['Abs', 'HS', 'Vide'] },
  { cle: 'seche_main', label: 'Sèche-main', extensions: ['Abs', 'HS'] },
  { cle: 'essuie_tout', label: "Distributeur d'essuie-tout", extensions: ['Abs', 'HS', 'Vide'] },
  { cle: 'poubelle', label: 'Poubelle', extensions: ['Abs', 'Débordante'] },
]
