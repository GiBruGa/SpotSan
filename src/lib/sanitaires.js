import { supabase } from './supabaseClient.js'

// Colonnes necessaires au rendu carte + a la classification par famille de
// source et aux filtres d'affinage (repris fidelement de v1, cf. classify()
// et passesRefinements() dans SpotSan/app.js).
const COLONNES_CARTE = 'UB_id, Name, Latitude, Longitude, Sources, Verified, Certified, Exists, Automatic, PMR, Adapte_Enfant, Rating_Overall'

/**
 * Sanitaires dans une zone (bbox), pour l'affichage sur la carte -- inclut
 * aussi les sanitaires supprimes (Exists=false), comme en v1 (chip
 * "Supprimées", masquee par defaut mais activable).
 */
export async function chargerSanitairesDansZone(bounds, limite = 500) {
  const { data, error } = await supabase
    .from('SanitaryBlocks_Inventory')
    .select(COLONNES_CARTE)
    .gte('Latitude', bounds.getSouth())
    .lte('Latitude', bounds.getNorth())
    .gte('Longitude', bounds.getWest())
    .lte('Longitude', bounds.getEast())
    .limit(limite)
  if (error) throw error
  return data
}

/** Fiche complete d'un sanitaire (donnees de base StatSan/v1 + tags/comptages hérités). */
export async function chargerSanitaire(ubId) {
  const { data, error } = await supabase
    .from('SanitaryBlocks_Inventory')
    .select('*')
    .eq('UB_id', ubId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Stats agregees des avis (algorithme §6, fonction get_avis_summary cote base). */
export async function chargerResumeAvis(ubId) {
  const { data, error } = await supabase.rpc('get_avis_summary', { p_ub_id: ubId })
  if (error) throw error
  return data
}
