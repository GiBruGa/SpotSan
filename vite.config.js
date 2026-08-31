import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Base servie par GitHub Pages : https://gibruga.github.io/SpotSan/
// Depot renomme le 2026-08-29 (Lot 9, bascule de production) : SpotSan-V2 ->
// SpotSan, l'ancienne v1 archivee sous SpotSan-v1-archive. Le "V2" ne
// concernait que la reconstruction interne, pas un nom a montrer aux
// utilisateurs -- confusion reelle constatee par Gilles en testant
// l'installation PWA chez des proches (l'app affiche "v9.0" mais l'adresse
// disait "V2").
export default defineConfig({
  base: '/SpotSan/',
  plugins: [
    svelte(),
    VitePWA({
      // Genere un service worker (precache app-shell hache + strategie
      // reseau pour le reste) plutot qu'un fichier ecrit a la main --
      // les noms de fichiers Vite changent a chaque build.
      registerType: 'autoUpdate',
      manifest: false, // on garde notre public/manifest.json existant
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // tuiles de carte / CDN : reseau d'abord, cache en secours
            urlPattern: ({ url, sameOrigin }) => !sameOrigin,
            handler: 'NetworkFirst',
            options: { cacheName: 'runtime-externe' },
          },
        ],
      },
    }),
  ],
})
