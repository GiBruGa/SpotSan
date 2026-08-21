import { supabase } from './supabaseClient.js'

export async function chargerDernierAvis(userId, ubId) {
  const { data, error } = await supabase
    .from('Sanitary_Reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('ub_id', ubId)
    .maybeSingle()
  if (error) throw error
  return data
}
