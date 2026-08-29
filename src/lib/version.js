// Version affichee de l'application (bandeau, titre de page). A incrementer
// pour tout changement visible par l'utilisateur -- meme convention que
// v1 (APP_VERSION dans SpotSan/app.js, actuellement v6.0).
// V2 redemarre a v8.0 (choix de Gilles, 2026-08-21).
export const APP_VERSION = 'v9.0'

// Consignation des principales evolutions (demande de Gilles, 2026-08-29) --
// entree la plus recente en premier, affichee dans le panneau "A propos".
export const CHANGELOG = [
  { version: 'v9.0', date: '29/08/2026', items: [
    "Nom, prénom et adresse ajoutés au profil Usager",
    "Connexion par téléphone + mot de passe, avec vérification par code SMS (remplace l'ancienne connexion déclarative)",
    "Un avis ou un signalement d'incivilité ne peut plus être envoyé que si tu es physiquement près du sanitaire concerné",
  ] },
]
