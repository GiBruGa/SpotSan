import { supabase } from './supabaseClient.js'

// Colonnes necessaires au rendu carte + a la classification par famille de
// source et aux filtres d'affinage (repris fidelement de v1, cf. classify()
// et passesRefinements() dans SpotSan/app.js).
const COLONNES_CARTE = 'UB_id, Name, Latitude, Longitude, Sources, Verified, Certified, Exists, Automatic, PMR, Adapte_Enfant, Rating_Overall'

/**
 * Sanitaires dans une zone (bbox), pour l'affichage sur la carte -- inclut
 * aussi les sanitaires supprimes (Exists=false), comme en v1 (chip
 * "Supprimées", masquee par defaut mais activable).
 *
 * limite : la limite fixe a 500 sous-comptait enormement en vue dezoomee
 * (33 000+ sanitaires au niveau France, contre quelques centaines a
 * l'echelle d'une ville) -- Carte.svelte fait varier ce parametre selon
 * le zoom (bug remonte par Gilles le 2026-08-31 : "400 sur la France mais
 * 200 sur Bordeaux seul"). Pas de limite serveur PostgREST (db_max_rows
 * non defini) donc une limite haute est sans risque cote base.
 */
export async function chargerSanitairesDansZone(bounds, limite = 40000) {
  const { data, error } = await supabase
    .from('SanitaryBlocks_Inventory')
    .select(COLONNES_CARTE)
    .gte('Latitude', bounds.getSouth())
    .lte('Latitude', bounds.getNorth())
    .gte('Longitude', bounds.getWest())
    .lte('Longitude', bounds.getEast())
    .order('UB_id')
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
