// Bascule manuelle clair/sombre (retour utilisateur du 2026-08-22).
// 'systeme' = suit prefers-color-scheme (comportement par defaut,
// comme les tuiles de carte deja en place) ; 'clair'/'sombre' = force.
// Persiste dans localStorage, applique via data-theme sur <html>.

const CLE = 'spotsan_v2_theme'

export function themeActuel() {
  return localStorage.getItem(CLE) ?? 'systeme'
}

export function appliquerTheme(theme) {
  const racine = document.documentElement
  if (theme === 'systeme') {
    racine.removeAttribute('data-theme')
  } else {
    racine.setAttribute('data-theme', theme)
  }
}

export function definirTheme(theme) {
  localStorage.setItem(CLE, theme)
  appliquerTheme(theme)
}

export function initTheme() {
  appliquerTheme(themeActuel())
}
