// Fait en sorte que le bouton "retour" materiel/geste du telephone ferme un
// panneau ouvert plutot que de quitter la PWA (demande Gilles du
// 2026-08-31 : le geste "<" de son telephone sortait systematiquement de
// l'appli au lieu de fermer le menu). En SPA sans routeur, il n'y a par
// defaut aucune autre entree d'historique -- "retour" quitte donc l'appli
// directement. On pousse une entree d'historique factice a l'ouverture ;
// l'evenement popstate qui la consomme (retour materiel OU navigateur) sert
// de signal de fermeture, pas une vraie navigation.
export function ouvrirAvecRetour(onFermer) {
  history.pushState({ ...history.state, panneauOuvert: true }, '')

  function gestion() {
    window.removeEventListener('popstate', gestion)
    onFermer()
  }
  window.addEventListener('popstate', gestion)

  // A appeler lors d'une fermeture normale (bouton, clic ailleurs) --
  // consomme l'entree factice sans re-declencher onFermer.
  return function fermer() {
    window.removeEventListener('popstate', gestion)
    if (history.state?.panneauOuvert) history.back()
  }
}
