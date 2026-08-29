// Queue locale pour la sauvegarde d'avis hors-ligne (V2-PLAN.md §4.7 --
// portage du moteur offline/sync de v1, le risque principal identifie au
// Lot 0bis). Volontairement simple, dans le meme esprit que le
// `dirtyFeedback`/`pushDirty()` de v1 : on stocke en localStorage tant que
// la sauvegarde reseau echoue, et on reessaie plus tard.

import { supabase } from './supabaseClient.js'

const CLE_STOCKAGE = 'spotsan_v2_avis_en_attente'

function lireQueue() {
  try {
    return JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '[]')
  } catch {
    return []
  }
}

function ecrireQueue(items) {
  localStorage.setItem(CLE_STOCKAGE, JSON.stringify(items))
}

/** Ajoute/replace l'avis en attente pour ce ub_id -- un seul en attente a la fois, le plus recent gagne. */
function mettreEnAttente(payload) {
  const items = lireQueue().filter((i) => i.ub_id !== payload.ub_id)
  items.push(payload)
  ecrireQueue(items)
}

/**
 * Passe par le RPC soumettre_avis (2026-08-29) plutot qu'un upsert direct :
 * verifie la contrainte de proximite cote serveur avant d'ecrire. lat/lon
 * sont captures au moment de la soumission (voir geolocalisation.js) et
 * voyagent avec le payload -- y compris dans la queue hors-ligne, pour que
 * la position enregistree reste celle du moment ou l'Usager etait
 * effectivement sur place, pas celle du moment ou la reconnexion survient.
 */
async function envoyer(payload) {
  const { error } = await supabase.rpc('soumettre_avis', {
    p_ub_id: payload.ub_id,
    p_lat: payload.lat,
    p_lon: payload.lon,
    p_donnees: payload.donnees,
  })
  if (error) throw error
}

/**
 * Sauvegarde un avis. Si le reseau echoue, l'avis est mis en attente
 * localement et sera renvoye au prochain `viderQueue()` (appele au
 * demarrage de l'appli et sur l'evenement `online`) -- rien n'est perdu,
 * comme en v1. Une erreur de proximite ("trop_loin") n'est PAS un probleme
 * reseau -- la remettre en attente reessaierait indefiniment sans jamais
 * reussir tant que l'Usager n'est pas physiquement revenu sur place, donc
 * on la relance immediatement plutot que de la mettre en queue.
 */
export async function sauvegarderAvis(payload) {
  try {
    await envoyer(payload)
    return { horsLigne: false }
  } catch (e) {
    if (e.message?.includes('trop_loin')) throw e
    console.warn('Sauvegarde impossible en direct, mise en attente locale.', e)
    mettreEnAttente(payload)
    return { horsLigne: true }
  }
}

/** Rejoue les avis en attente. Appeler au demarrage et sur `window.online`. */
export async function viderQueue() {
  const items = lireQueue()
  if (!items.length) return { restants: 0, envoyes: 0 }

  const restants = []
  let envoyes = 0
  for (const item of items) {
    try {
      await envoyer(item)
      envoyes++
    } catch {
      restants.push(item)
    }
  }
  ecrireQueue(restants)
  return { restants: restants.length, envoyes }
}

export function nombreEnAttente() {
  return lireQueue().length
}
