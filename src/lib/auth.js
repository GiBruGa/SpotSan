import { supabase } from './supabaseClient.js'

/**
 * Met en forme un numero de portable pour Supabase Auth (format attendu :
 * "+33 761 761 559", sans le 0 initial francais). Diagnostique le
 * 2026-09-03 : Connexion/SecuriserCompte/MesInformations dupliquaient toutes
 * la meme decoupe en groupes de 3 sans jamais retirer un 0 initial -- si
 * l'utilisateur tape son numero "a la francaise" (ex. 0761761559, reflexe
 * naturel), la decoupe tronque silencieusement le dernier chiffre au lieu de
 * retirer le 0, produisant un numero qui ne correspond a rien en base
 * ("Numero ou mot de passe incorrect" alors que le mot de passe est bon).
 */
export function formaterTelephone(indicatif, numeroLocal) {
  const chiffres = numeroLocal.replace(/\D/g, '').replace(/^0/, '')
  return `${indicatif} ${chiffres.slice(0, 3)} ${chiffres.slice(3, 6)} ${chiffres.slice(6, 9)}`.trim()
}

/**
 * Regle de mot de passe Usager (demande de Gilles, 2026-08-29) : au moins
 * 6 caracteres, 2 majuscules, 2 chiffres, 2 caracteres speciaux. Les 2+2+2
 * couvrent deja la longueur minimale, le check explicite reste pour la clarte.
 */
export function motDePasseValide(mdp) {
  if (!mdp || mdp.length < 6) return false
  const majuscules = (mdp.match(/[A-Z]/g) || []).length
  const chiffres = (mdp.match(/[0-9]/g) || []).length
  const speciaux = (mdp.match(/[^A-Za-z0-9]/g) || []).length
  return majuscules >= 2 && chiffres >= 2 && speciaux >= 2
}

/**
 * Retrouve un profil SitInZen_Users existant par numero de telephone et le
 * reattache a l'utilisateur Auth actuellement connecte (Edge Function
 * `retrouver-compte-par-telephone`, service_role cote serveur -- seule
 * facon de deplacer une ligne appartenant a un autre user_id sous RLS).
 * Appeler seulement APRES verification reelle du telephone (verifyOtp),
 * jamais avant -- voir SecuriserCompte.svelte, seul appelant.
 * Renvoie le profil (deja bon si rien a deplacer, deplace sinon), ou
 * `null` si aucun compte n'existe pour ce numero (nouvelle inscription).
 */
export async function retrouverCompteParTelephone(telephone) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Pas de session active')

  const { data, error } = await supabase.functions.invoke('retrouver-compte-par-telephone', {
    body: { telephone },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) {
    const contexte = await error.context?.json?.().catch(() => null)
    throw new Error(contexte?.error || 'recherche_impossible')
  }
  return data.profil
}
