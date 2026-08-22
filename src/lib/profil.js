import { supabase } from './supabaseClient.js'

export async function chargerProfil(userId) {
  const { data, error } = await supabase
    .from('SitInZen_Users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * @param {string} userId
 * @param {{
 *   telephone: string,
 *   pseudo: string,
 *   avatar: string,
 *   sexe: 'Homme' | 'Femme' | null,
 *   anneeNaissance: number | null,
 *   handicaps: string[],
 * }} profil
 */
export async function creerProfil(userId, profil) {
  const { data, error } = await supabase
    .from('SitInZen_Users')
    .insert({
      user_id: userId,
      Phone: profil.telephone,
      pseudo: profil.pseudo,
      avatar_url: profil.avatar,
      Sexe_Declare: profil.sexe,
      Birthdate: profil.anneeNaissance ? `${profil.anneeNaissance}-01-01` : null,
      handicaps: profil.handicaps.length ? profil.handicaps : null,
      consent_at: new Date().toISOString(),
      phone_verified: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Supprime le compte et toutes les donnees personnelles (Edge Function, cote serveur). */
export async function supprimerCompte() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Pas de session active')

  const { error } = await supabase.functions.invoke('delete-own-account', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) throw error

  await supabase.auth.signOut()
}

/**
 * Met a jour les informations personnelles (pseudo/avatar/telephone/sexe/
 * annee/handicaps). Ne touche jamais phone_verified/consent_at.
 */
export async function mettreAJourProfil(userId, profil) {
  const { data, error } = await supabase
    .from('SitInZen_Users')
    .update({
      Phone: profil.telephone,
      pseudo: profil.pseudo,
      avatar_url: profil.avatar,
      Sexe_Declare: profil.sexe,
      Birthdate: profil.anneeNaissance ? `${profil.anneeNaissance}-01-01` : null,
      handicaps: profil.handicaps.length ? profil.handicaps : null,
    })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Se deconnecte sans supprimer le compte -- une nouvelle session anonyme sera creee au prochain chargement. */
export async function seDeconnecter() {
  await supabase.auth.signOut()
}
