// Floutage automatique des visages avant envoi (chantier lance le
// 2026-08-22, suite au point non tranche du plan §5.6.3). Entierement
// cote client, aucune API externe payante. Modele choisi : BlazeFace
// (TensorFlow.js) plutot que MediaPipe Tasks Vision -- son runtime WASM
// fait ~11 Mo (toutes taches vision confondues), bien trop lourd pour une
// PWA mobile terrain ; BlazeFace + tfjs est nettement plus leger.
//
// Import dynamique volontaire (pas de `import ... from` en tete de
// fichier) : tf+blazeface ne doivent PAS alourdir le bundle principal
// charge par tout le monde des l'ouverture de l'app -- seulement etre
// telecharges au moment reel d'une prise de photo (et mis en cache par
// le service worker ensuite, cf. Lot 0bis).
//
// Limite connue et assumee : ne detecte que les visages, pas les plaques
// d'immatriculation (pas d'equivalent aussi mature/leger cote outils
// gratuits) -- reste un point de vigilance manuel, voir V2-PLAN.md.
// Autre limite : `blazeface.load()` telecharge les poids du modele
// depuis le CDN TensorFlow Hub (tfhub.dev/storage.googleapis.com) au
// premier usage -- gratuit, mais pas un fichier local comme le reste de
// l'app ; necessite un reseau au tout premier floutage.

let modelePromesse = null

function chargerModele() {
  if (!modelePromesse) {
    modelePromesse = Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow/tfjs-backend-webgl'),
      import('@tensorflow-models/blazeface'),
    ]).then(([tf, , blazeface]) => tf.ready().then(() => blazeface.load()))
  }
  return modelePromesse
}

function pixeliser(ctx, x, y, w, h) {
  const pas = 10
  const largeurPetit = Math.max(1, Math.round(w / pas))
  const hauteurPetit = Math.max(1, Math.round(h / pas))
  const petit = document.createElement('canvas')
  petit.width = largeurPetit
  petit.height = hauteurPetit
  const ctxPetit = petit.getContext('2d')
  ctxPetit.drawImage(ctx.canvas, x, y, w, h, 0, 0, largeurPetit, hauteurPetit)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(petit, 0, 0, largeurPetit, hauteurPetit, x, y, w, h)
  ctx.imageSmoothingEnabled = true
}

/**
 * Detecte les visages sur le canvas et les pixelise en place. Degrade
 * silencieusement (photo envoyee telle quelle) si le modele ne charge
 * pas ou si la detection echoue -- ne doit jamais bloquer un envoi.
 */
export async function flouterVisages(canvas) {
  try {
    const modele = await chargerModele()
    const visages = await modele.estimateFaces(canvas, false)
    if (!visages.length) return canvas

    const ctx = canvas.getContext('2d')
    const marge = 0.3 // agrandit la zone floutee pour couvrir les bords du visage/cheveux

    for (const visage of visages) {
      const [x1, y1] = visage.topLeft
      const [x2, y2] = visage.bottomRight
      const largeur = x2 - x1
      const hauteur = y2 - y1
      const bx = Math.max(0, x1 - largeur * marge)
      const by = Math.max(0, y1 - hauteur * marge)
      const bw = Math.min(canvas.width - bx, largeur * (1 + 2 * marge))
      const bh = Math.min(canvas.height - by, hauteur * (1 + 2 * marge))
      pixeliser(ctx, bx, by, bw, bh)
    }
    return canvas
  } catch (e) {
    console.warn('Détection de visages indisponible, photo envoyée sans floutage automatique.', e)
    return canvas
  }
}
