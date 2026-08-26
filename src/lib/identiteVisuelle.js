// Identite visuelle UrBizia : icones/logos toujours a jour, servis
// dynamiquement depuis acronymes.icon_svg (categorie 'Identite_Visuelle')
// plutot qu'embarques en fichiers PNG statiques figes -- convention deja
// en place sur EkoMa/StatSan/SpotSan v1/FBS/RFQ, voir memoire projet
// "shared visual identity". Corrige le 2026-08-22 : V2 utilisait par
// erreur des .png statiques copies de l'ancien SpotSan v1 au lieu de
// cette source, donc desynchronises de l'evolution de la marque.

import { supabase } from './supabaseClient.js'
import { SPOTSAN_ICON_SVG_REPLI } from './identiteVisuelleRepli.js'

const cache = new Map()

/** Recupere icon_svg pour un id d'acronymes (categorie Identite_Visuelle, lecture publique). Mis en cache en memoire pour la session. */
export async function chargerIconeSvg(id) {
  if (cache.has(id)) return cache.get(id)
  const promesse = supabase
    .from('acronymes')
    .select('icon_svg')
    .eq('id', id)
    .maybeSingle()
    .then(({ data, error }) => (error ? null : data?.icon_svg ?? null))
    .catch(() => null)
  cache.set(id, promesse)
  return promesse
}

/**
 * Icone d'avatar par defaut, conditionnee par le sexe declare (demande du
 * 2026-08-22) et, depuis le 2026-08-24, par le statut PMR qui devient
 * prioritaire sur le sexe des qu'il est vrai (SpotSan-Avatar-PMR).
 * Statut PMR detecte via profil.Is_PMR (colonne existante, utilisee par
 * le module badge SitInZen) OU profil.handicaps contenant 'Moteur' (seul
 * champ PMR-like reellement saisi par l'ecran d'inscription V2 aujourd'hui)
 * -- les deux sources ne sont pas encore unifiees cote schema (question
 * ouverte notee dans V2-PLAN.md §4.1), donc on les verifie toutes les deux
 * plutot que de choisir arbitrairement l'une ou l'autre.
 * Cascade de repli : icone genree -> icone SpotSan generique -> SVG
 * integre en dur (hors-ligne ou si aucune icone n'est encore fournie).
 */
export async function chargerAvatarParDefaut(sexeDeclare, estPMR) {
  const id = estPMR
    ? 'SpotSan-Avatar-PMR'
    : sexeDeclare === 'Homme' ? 'SpotSan-Avatar-Homme' : sexeDeclare === 'Femme' ? 'SpotSan-Avatar-Femme' : 'SpotSan-Avatar-NonPrecise'
  const svg = (await chargerIconeSvg(id)) ?? (await chargerIconeSvg('SpotSan')) ?? SPOTSAN_ICON_SVG_REPLI
  return svgVersDataUri(svg)
}

export function svgVersDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
