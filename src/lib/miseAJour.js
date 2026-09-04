// Reinitialisation complete de l'installation (retour Gilles du 2026-09-04) :
// desinstaller/reinstaller la PWA ne vide pas forcement le cache navigateur
// ni le Service Worker de l'origine -- constate en conditions reelles
// (session encore active apres reinstallation, alors qu'un nouveau build
// avait ete deploye). Ce bouton force un etat vierge : Service Worker(s)
// desenregistres, Cache Storage vide, stockage local vide, puis rechargement
// complet -- plus fiable que d'attendre la detection automatique
// (useRegisterSW / needRefresh, cf. App.svelte) qui suppose un Service
// Worker deja en place pour comparer les versions.
export async function reinitialiserApplication() {
  if ('serviceWorker' in navigator) {
    const enregistrements = await navigator.serviceWorker.getRegistrations()
    await Promise.all(enregistrements.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const noms = await caches.keys()
    await Promise.all(noms.map((n) => caches.delete(n)))
  }
  localStorage.clear()
  sessionStorage.clear()
  window.location.reload()
}
