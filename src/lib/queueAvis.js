// Queue locale pour la sauvegarde d'avis hors-ligne (V2-PLAN.md §4.7 --
// portage du moteur offline/sync de v1). Reecrit le 2026-09-18 pour
// s'appuyer sur IndexedDB (stockageHorsLigne.js) au lieu de localStorage :
// suite aux nombreux problemes reseau signales par Gilles sur le terrain,
// les PHOTOS elles-memes doivent pouvoir attendre en cache, pas seulement
// le texte de l'avis -- voir BoutonPhoto.svelte, qui stocke desormais un
// jeton `horsligne:<id>` a la place de l'URL quand le televersement echoue.

import { supabase } from './supabaseClient.js'
import { televerserBlob } from './photos.js'
import { lirePhoto, supprimerPhoto, stockerAvisEnAttente, listerAvisEnAttente, supprimerAvisEnAttente, compterAvisEnAttente } from './stockageHorsLigne.js'

const PREFIXE_HORS_LIGNE = 'horsligne:'

function estJetonHorsLigne(valeur) {
  return typeof valeur === 'string' && valeur.startsWith(PREFIXE_HORS_LIGNE)
}

function idPhoto(jeton) {
  return Number(jeton.slice(PREFIXE_HORS_LIGNE.length))
}

/**
 * Remplace tout jeton `horsligne:<id>` dans les champs photo du payload par
 * une vraie URL Supabase, en televersant le blob correspondant (lu en
 * IndexedDB). Si un blob echoue encore a s'envoyer, le jeton reste tel
 * quel et la fonction leve -- l'appelant sait alors que l'avis doit
 * repartir en attente.
 */
async function resoudrePhotosEnAttente(donnees) {
  const idsUtilises = []
  const champsSimples = ['photo_vue_loin', 'photo_signaletique', 'photo_acces']
  for (const champ of champsSimples) {
    if (estJetonHorsLigne(donnees[champ])) {
      const id = idPhoto(donnees[champ])
      const blob = await lirePhoto(id)
      if (!blob) continue // deja resolu/supprime -- ignore
      donnees[champ] = await televerserBlob(blob, { bucket: 'PointSan-Photos', dossier: 'avis' })
      idsUtilises.push(id)
    }
  }
  if (Array.isArray(donnees.photos_confort)) {
    for (const p of donnees.photos_confort) {
      if (estJetonHorsLigne(p.url)) {
        const id = idPhoto(p.url)
        const blob = await lirePhoto(id)
        if (!blob) continue
        p.url = await televerserBlob(blob, { bucket: 'PointSan-Photos', dossier: 'avis' })
        idsUtilises.push(id)
      }
    }
  }
  return idsUtilises
}

async function envoyer(payload) {
  const idsPhotos = await resoudrePhotosEnAttente(payload.donnees)
  const { error } = await supabase.rpc('soumettre_avis', {
    p_ub_id: payload.ub_id,
    p_lat: payload.lat,
    p_lon: payload.lon,
    p_donnees: payload.donnees,
  })
  if (error) throw error
  await Promise.all(idsPhotos.map((id) => supprimerPhoto(id)))
}

/**
 * Sauvegarde un avis. Si le reseau echoue (ou si des photos sont encore en
 * attente de televersement), l'avis est mis en attente localement et sera
 * renvoye au prochain `viderQueue()` (appele au demarrage de l'appli et sur
 * l'evenement `online`) -- rien n'est perdu, comme en v1. Une erreur de
 * proximite ("trop_loin") n'est PAS un probleme reseau -- la remettre en
 * attente reessaierait indefiniment sans jamais reussir tant que l'Usager
 * n'est pas physiquement revenu sur place, donc on la relance immediatement
 * plutot que de la mettre en queue.
 */
export async function sauvegarderAvis(payload) {
  try {
    await envoyer(payload)
    return { horsLigne: false }
  } catch (e) {
    if (e.message?.includes('trop_loin')) throw e
    console.warn('Sauvegarde impossible en direct, mise en attente locale.', e)
    await stockerAvisEnAttente(payload)
    return { horsLigne: true }
  }
}

/** Rejoue les avis en attente (texte + photos). Appeler au demarrage et sur `window.online`. */
export async function viderQueue() {
  const items = await listerAvisEnAttente()
  if (!items.length) return { restants: 0, envoyes: 0 }

  let envoyes = 0
  for (const item of items) {
    try {
      await envoyer(item)
      await supprimerAvisEnAttente(item.ub_id)
      envoyes++
    } catch {
      // reste en attente, reessaiera au prochain passage
    }
  }
  const restants = await compterAvisEnAttente()
  return { restants, envoyes }
}

export async function nombreEnAttente() {
  return compterAvisEnAttente()
}
