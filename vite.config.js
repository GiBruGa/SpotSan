import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Base servie par GitHub Pages : https://gibruga.github.io/SpotSan-V2/
// A remettre a jour au Lot 9 (bascule de production) si l'adresse change.
export default defineConfig({
  base: '/SpotSan-V2/',
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
