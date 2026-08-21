import { createClient } from '@supabase/supabase-js'

// Cle publique (anon/publishable), sans danger cote client -- meme
// convention que StatSan/FBS/RFQ/SpotSan v1 (voir leur CLAUDE.md).
const SUPABASE_URL = 'https://mnsfstjgrueyuvejfvvk.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KQWKxJs7tWgvI4lJQqSw3g_nIwmDXkT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

/**
 * "Connexion declarative" (plan V2-PLAN.md §4.1) : pas d'OTP SMS pour
 * l'instant, mais chaque appareil a quand meme une vraie session Supabase
 * Auth (anonyme), stable tant que le stockage local n'est pas efface.
 * Plus tard, verifier le telephone reviendra a *lier* cette session
 * anonyme a un vrai numero (supabase.auth.updateUser({ phone })), sans
 * rien reprendre dans le modele de donnees -- c'est tout l'interet de ne
 * pas faire reposer l'identite sur le telephone des le depart.
 */
export async function assurerSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}
