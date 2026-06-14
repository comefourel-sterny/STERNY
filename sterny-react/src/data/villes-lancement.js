// Source unique des villes de lancement Sterny (DETTE #78, décision conv 57).
// Notion « villes de lancement » (curé) — à NE PAS confondre avec VILLES_FRANCE
// (saisie all-France, data/inscription-options.js) ni avec une dérivation des
// villes ayant des annonces (notion 3, différée). L'ordre des clés de
// VILLES_DISPONIBLES pilote l'ordre d'affichage des suggestions : ne pas le changer.
// Branché : HomePage (conv 57, T2). À brancher : RecherchePage, InscriptionPartagerPage,
// CompleterProfilPage, InscriptionRecherchePage, DashboardLocatairePage, ModifierProfilPage (T3).

/* ── Villes de lancement : { 'Label': 'slug' } ── */
export const VILLES_DISPONIBLES = {
  'Rennes': 'rennes',
  'Nantes': 'nantes',
  'Brest': 'brest',
  'Quimper': 'quimper',
  'Lorient': 'lorient',
  'Vannes': 'vannes',
  'Saint-Malo': 'saint-malo',
  'Saint-Brieuc': 'saint-brieuc',
  'Fougères': 'fougeres',
  'Vitré': 'vitre'
}

/* ── Coordonnées GPS par slug : { slug: { lat, lng } } (additif, pour T3) ── */
export const VILLES_COORDS = {
  'rennes': { lat: 48.1173, lng: -1.6778 },
  'nantes': { lat: 47.2184, lng: -1.5536 },
  'brest': { lat: 48.3904, lng: -4.4861 },
  'quimper': { lat: 47.9960, lng: -4.1024 },
  'lorient': { lat: 47.7486, lng: -3.3660 },
  'vannes': { lat: 47.6583, lng: -2.7608 },
  'saint-malo': { lat: 48.6493, lng: -1.9890 },
  'saint-brieuc': { lat: 48.5141, lng: -2.7602 },
  'fougeres': { lat: 48.3524, lng: -1.1996 },
  'vitre': { lat: 48.1246, lng: -1.2131 }
}
