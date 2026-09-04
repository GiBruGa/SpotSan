// Bascule manuelle clair/sombre (retour utilisateur du 2026-08-22).
// 'systeme' = suit prefers-color-scheme (comportement par defaut,
// comme les tuiles de carte deja en place) ; 'clair'/'sombre' = force.
// Persiste dans localStorage, applique via data-theme sur <html>.

const CLE = 'spotsan_v2_theme'

export function themeActuel() {
  return localStorage.getItem(CLE) ?? 'systeme'
}

// app.css attend data-theme="light"/"dark" (convention CSS habituelle) --
// traduction ici pour garder 'clair'/'sombre'/'systeme' en francais partout
// ailleurs (localStorage, etat des boutons). Bug corrige le 2026-09-03 :
// l'attribut posait auparavant la valeur francaise brute ('clair'/'sombre'),
// qui ne correspondait a aucun selecteur CSS -- le choix explicite de
// l'utilisateur etait donc silencieusement ignore, seule la preference
// systeme s'appliquait (retour Gilles : "le passage du mode sombre a clair
// ne change rien").
const DATA_THEME = { clair: 'light', sombre: 'dark' }

export function appliquerTheme(theme) {
  const racine = document.documentElement
  if (theme === 'systeme') {
    racine.removeAttribute('data-theme')
  } else {
    racine.setAttribute('data-theme', DATA_THEME[theme])
  }
}

export function definirTheme(theme) {
  localStorage.setItem(CLE, theme)
  appliquerTheme(theme)
}

export function initTheme() {
  appliquerTheme(themeActuel())
}
