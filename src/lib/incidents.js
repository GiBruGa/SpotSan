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
 * confort de navigation), texte libre optionnel. Append-only, comme v1 --
 * jamais modifiable ni supprimable cote Usager (seul un admin le peut,
 * depuis EkoMa). Passe par le RPC signaler_incivilite (2026-08-29) plutot
 * qu'un insert direct : verifie la contrainte de proximite cote serveur
 * avant d'ecrire -- user_id vient de auth.uid(), plus besoin de le passer.
 */
export async function signalerIncivilite({ ubId, photoUrl, tag, description, lat, lon }) {
  const { error } = await supabase.rpc('signaler_incivilite', {
    p_ub_id: ubId,
    p_lat: lat,
    p_lon: lon,
    p_tag: tag,
    p_description: description?.trim() || null,
    p_photo: photoUrl,
  })
  if (error) throw error
}
