import { supabase } from './supabaseClient.js'
import { flouterVisages } from './anonymisation.js'

const LARGEUR_MAX = 1600
const QUALITE_JPEG = 0.72

/** Compresse une image (comme v1 : redimensionnement + JPEG) avant envoi, pour rester sous la limite de 5 Mo du bucket. Floute les visages si demande. */
function compresserImage(fichier, { anonymiser = false } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(fichier)
    img.onload = async () => {
      const echelle = Math.min(1, LARGEUR_MAX / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * echelle)
      canvas.height = Math.round(img.height * echelle)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      if (anonymiser) {
        await flouterVisages(canvas)
      }

      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Compression impossible'))), 'image/jpeg', QUALITE_JPEG)
    }
    img.onerror = reject
    img.src = url
  })
}

/**
 * Compresse et televerse une photo. Renvoie l'URL publique (bucket
 * `PointSan-Photos`, deja utilise par v1) ou le chemin de stockage
 * (bucket `PointSan-Incidents`, prive -- lecture reservee aux comptes
 * avec acces outil `pointsan_mobile`, cf. policies existantes).
 *
 * `anonymiser` : floute automatiquement les visages detectes avant
 * l'envoi (voir anonymisation.js). A laisser a `false` pour l'avatar
 * (montrer son visage est justement le but), `true` partout ailleurs.
 */
export async function televerserPhoto(fichier, { bucket = 'PointSan-Photos', dossier = '', anonymiser = false } = {}) {
  const blob = await compresserImage(fichier, { anonymiser })
  const chemin = `${dossier ? dossier + '/' : ''}${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage.from(bucket).upload(chemin, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error

  if (bucket === 'PointSan-Photos') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(chemin)
    return data.publicUrl
  }
  return chemin
}
