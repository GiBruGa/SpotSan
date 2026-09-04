import { supabase } from './supabaseClient.js'

/**
 * Taxonomie des IVER : vit desormais dans la table partagee
 * Incivilites_Taxonomie (source commune avec l'admin EkoMa, cf. Regles
 * Generales de Conception des Modules UrBizia -- meme principe que la
 * table acronymes pour l'identite visuelle). Lue a chaque ouverture du
 * formulaire plutot que mise en cache : un ajout/retrait fait depuis
 * EkoMa doit se repercuter sans redeploiement de l'app.
 *
 * propose_utilisateur (2026-09-04, decide avec Gilles) : filtre en plus
 * d'actif -- ne pas montrer tout le catalogue (des centaines de tags
 * proposes par l'IA, non tries) sinon les usagers n'utilisent plus l'outil.
 * Curation explicite depuis le Catalogue IRUM (fiche d'un tag), pas un
 * simple alias d'actif -- voir Regles Generales, "Curation des tags
 * proposes aux usagers".
 */
export async function chargerTaxonomieIncivilites() {
  const { data, error } = await supabase
    .from('Incivilites_Taxonomie')
    .select('tag')
    .eq('actif', true)
    .eq('propose_utilisateur', true)
    .order('ordre')
  if (error) throw error
  return (data || []).map((r) => r.tag)
}

/**
 * Signalement d'Incivilités/Vandalismes (Lot 6, §5.6.3) : photo + au moins un
 * tag obligatoires (le tag sert de label d'entrainement IA, pas juste de
 * confort de navigation), texte libre optionnel. Multi-tag depuis
 * 2026-08-30 (un signalement peut couvrir plusieurs problemes a la fois,
 * ex. Excréments + Tags sur la meme photo) -- p_tags est un tableau.
 * Append-only, comme v1 -- jamais modifiable ni supprimable cote Usager
 * (seul un admin le peut, depuis EkoMa). Passe par le RPC
 * signaler_incivilite : verifie la contrainte de proximite cote serveur
 * avant d'ecrire -- user_id vient de auth.uid(), plus besoin de le passer.
 */
export async function signalerIncivilite({ ubId, photoUrl, tags, description, lat, lon }) {
  const { error } = await supabase.rpc('signaler_incivilite', {
    p_ub_id: ubId,
    p_lat: lat,
    p_lon: lon,
    p_tags: tags,
    p_description: description?.trim() || null,
    p_photo: photoUrl,
  })
  if (error) throw error
}
