// Normalise un label de ville pour comparaison robuste (accents strip + minuscules + trim).
// Extrait de LogementPage.jsx (était locale, non exportée) — DETTE #144.
export function normalizeVilleLabel(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
