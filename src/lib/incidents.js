import { supabase } from './supabaseClient.js'

export const TAXONOMIE_INCIVILITES = [
  'Excès de papier / corps étranger',
  'Déchets/fluides non identifiés (lave-main)',
  'Défaut de nettoyage',
  'Dégradation matérielle',
  'Graffiti / Tag',
  'Déchets / encombrants abandonnés',
  'Équipement arraché',
  'Feu / Brûlure',
  'Salissures volontaires',
  'Serrure ou porte forcée',
  'Excréments au sol ou sur les murs',
  'Autre',
]

/**
 * Signalement d'Incivilité/Vandalisme (Lot 6, §5.6.3) : photo + tag
 * obligatoires (le tag sert de label d'entrainement IA, pas juste de
 * confort de navigation), texte libre optionnel. Append-only, comme v1
 * -- un INSERT direct, pas d'update possible (pas de policy UPDATE).
 */
export async function signalerIncivilite({ userId, ubId, photoUrl, tag, description }) {
  const { error } = await supabase.from('Incident_Reports').insert({
    UB_id: ubId,
    user_id: userId,
    Photo: photoUrl,
    tag,
    Description: description?.trim() || null,
  })
  if (error) throw error
}
