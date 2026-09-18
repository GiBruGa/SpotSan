// Stockage hors-ligne en IndexedDB (2026-09-18, remplace le localStorage de
// queueAvis.js) : suite aux nombreux problemes reseau signales par Gilles
// sur le terrain, la queue doit desormais pouvoir contenir des PHOTOS
// (blobs compresses), pas seulement le texte de l'avis. localStorage
// plafonne a 5-10 Mo selon le navigateur -- largement insuffisant des la
// 2e ou 3e photo en attente. IndexedDB n'a pas cette limite pratique
// (typiquement des centaines de Mo a quelques Go, selon l'espace disque
// disponible sur l'appareil -- l'exact quota depend du navigateur/OS et
// n'est pas garanti a l'avance, voir navigator.storage.estimate()).

const NOM_BASE = 'spotsan_hors_ligne'
const VERSION = 1
const MAGASIN_PHOTOS = 'photos_en_attente'
const MAGASIN_AVIS = 'avis_en_attente'

function ouvrirBase() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(NOM_BASE, VERSION)
    requete.onupgradeneeded = () => {
      const db = requete.result
      if (!db.objectStoreNames.contains(MAGASIN_PHOTOS)) {
        db.createObjectStore(MAGASIN_PHOTOS, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(MAGASIN_AVIS)) {
        db.createObjectStore(MAGASIN_AVIS, { keyPath: 'ub_id' })
      }
    }
    requete.onsuccess = () => resolve(requete.result)
    requete.onerror = () => reject(requete.error)
  })
}

/** Stocke un blob de photo compressee en attente d'envoi, renvoie son id local. */
export async function stockerPhoto(blob) {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_PHOTOS, 'readwrite')
    const requete = tx.objectStore(MAGASIN_PHOTOS).add({ blob, quand: Date.now() })
    requete.onsuccess = () => resolve(requete.result)
    requete.onerror = () => reject(requete.error)
  })
}

export async function lirePhoto(id) {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_PHOTOS, 'readonly')
    const requete = tx.objectStore(MAGASIN_PHOTOS).get(id)
    requete.onsuccess = () => resolve(requete.result?.blob ?? null)
    requete.onerror = () => reject(requete.error)
  })
}

export async function supprimerPhoto(id) {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_PHOTOS, 'readwrite')
    tx.objectStore(MAGASIN_PHOTOS).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Un seul avis en attente par ub_id -- le plus recent remplace le precedent. */
export async function stockerAvisEnAttente(item) {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_AVIS, 'readwrite')
    tx.objectStore(MAGASIN_AVIS).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listerAvisEnAttente() {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_AVIS, 'readonly')
    const requete = tx.objectStore(MAGASIN_AVIS).getAll()
    requete.onsuccess = () => resolve(requete.result ?? [])
    requete.onerror = () => reject(requete.error)
  })
}

export async function supprimerAvisEnAttente(ubId) {
  const db = await ouvrirBase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN_AVIS, 'readwrite')
    tx.objectStore(MAGASIN_AVIS).delete(ubId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function compterAvisEnAttente() {
  const items = await listerAvisEnAttente()
  return items.length
}
