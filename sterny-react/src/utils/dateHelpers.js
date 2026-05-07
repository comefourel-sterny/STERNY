/**
 * dateHelpers.js
 *
 * Helpers de conversion / validation de dates au format français JJ/MM/AAAA.
 * Pattern repris de ModifierProfilPage.jsx handleDateInput (lignes 264-274) et
 * extrait en fonctions pures pour réutilisation par le wizard d'inscription E-6.
 *
 * NOTE — pas de check d'âge minimum ici. La règle "âge ≥ 18 ans" mentionnée
 * dans UNIFICATION-INSCRIPTION § 1.5 / § 3.10 / § 6.3 reste en attente d'avis
 * professionnel (Q-AVO-001 + Q-DPO-002, cf. CONTEXTE-PROJET §3 sur les
 * mineurs alternants). À ajouter ultérieurement dans une itération dédiée.
 */

/**
 * Vérifie qu'une date au format JJ/MM/AAAA est valide.
 *
 * Critères :
 * - format strict 10 caractères "JJ/MM/AAAA" (séparateurs "/", 2 chiffres jour, 2 chiffres mois, 4 chiffres année)
 * - jour 1-31, mois 1-12
 * - année >= 1900 et <= année courante (borne haute dynamique pour rester valide en 2027+)
 * - cohérence calendaire : "31/02/2024" est invalide même si chaque champ est dans les bornes
 * - pas de date strictement future (date <= aujourd'hui)
 *
 * @param {string} dateFR - chaîne au format "JJ/MM/AAAA"
 * @returns {boolean}
 *
 * Exemples mentaux :
 *   isValidDateFR("31/12/2005") → true
 *   isValidDateFR("31/02/2024") → false (cohérence calendaire)
 *   isValidDateFR("01/01/2099") → false (date future)
 *   isValidDateFR("00/01/2000") → false (jour 0)
 *   isValidDateFR("01/13/2000") → false (mois 13)
 *   isValidDateFR("01/01/1899") → false (année < 1900)
 *   isValidDateFR("1/1/2000")   → false (format non strict — manque les 0 de tête)
 *   isValidDateFR("")           → false
 *   isValidDateFR(null)         → false
 */
export function isValidDateFR(dateFR) {
  if (typeof dateFR !== 'string') return false
  const match = dateFR.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  if (day < 1 || day > 31) return false
  if (month < 1 || month > 12) return false

  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear) return false

  // Cohérence calendaire via construction Date — JS rebondit silencieusement
  // sur le mois suivant si le jour dépasse (ex. new Date(2024, 1, 31) → 02/03/2024).
  // On vérifie que les 3 champs sont bien préservés après round-trip.
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return false
  }

  // Pas de date dans le futur (acceptation incluse de la date du jour)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (d > today) return false

  return true
}

/**
 * Convertit une date "JJ/MM/AAAA" en ISO "AAAA-MM-JJ".
 *
 * @param {string} dateFR - chaîne au format "JJ/MM/AAAA"
 * @returns {string|null} chaîne ISO ou null si invalide
 *
 * Exemples mentaux :
 *   parseDateFRtoISO("31/12/2005") → "2005-12-31"
 *   parseDateFRtoISO("01/01/2000") → "2000-01-01"
 *   parseDateFRtoISO("31/02/2024") → null (cohérence calendaire)
 *   parseDateFRtoISO("")           → null
 */
export function parseDateFRtoISO(dateFR) {
  if (!isValidDateFR(dateFR)) return null
  const [day, month, year] = dateFR.split('/')
  return `${year}-${month}-${day}`
}

/**
 * Convertit une date ISO "AAAA-MM-JJ" en format français "JJ/MM/AAAA".
 * Utile pour pré-remplir un input texte FR depuis un state ISO (ex. récap E-7,
 * édition profil ultérieure).
 *
 * @param {string} dateISO - chaîne au format "AAAA-MM-JJ"
 * @returns {string} chaîne FR ou "" si invalide
 *
 * Exemples mentaux :
 *   formatDateISOtoFR("2005-12-31") → "31/12/2005"
 *   formatDateISOtoFR("2000-01-01") → "01/01/2000"
 *   formatDateISOtoFR("invalid")    → ""
 *   formatDateISOtoFR("")           → ""
 *   formatDateISOtoFR(null)         → ""
 */
export function formatDateISOtoFR(dateISO) {
  if (typeof dateISO !== 'string') return ''
  const match = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * Formatte la saisie partielle d'une date pendant la frappe utilisateur.
 * Reproduction pure de ModifierProfilPage.jsx handleDateInput (lignes 264-274) :
 * extrait les chiffres uniquement, tronque à 8, insère les "/" automatiquement
 * aux bonnes positions.
 *
 * Pas de validation — accepte toute saisie en cours, même incomplète ou
 * invalide à terme. La validation finale se fait via isValidDateFR au submit.
 *
 * @param {string} rawInput - valeur brute saisie par l'utilisateur
 * @returns {string} valeur formatée à afficher dans l'input
 *
 * Exemples mentaux :
 *   formatPartialDateInput("3")        → "3"
 *   formatPartialDateInput("31")       → "31"
 *   formatPartialDateInput("311")      → "31/1"
 *   formatPartialDateInput("3112")     → "31/12"
 *   formatPartialDateInput("31122")    → "31/12/2"
 *   formatPartialDateInput("31122005") → "31/12/2005"
 *   formatPartialDateInput("311220059") → "31/12/2005" (tronqué à 8 chiffres)
 *   formatPartialDateInput("31/12/2005") → "31/12/2005" (les "/" sont strippés puis ré-injectés)
 *   formatPartialDateInput("abc12def")   → "12" (lettres ignorées)
 *   formatPartialDateInput("")           → ""
 */
export function formatPartialDateInput(rawInput) {
  let value = String(rawInput ?? '').replace(/\D/g, '')
  if (value.length > 8) value = value.slice(0, 8)
  let formatted = ''
  if (value.length > 0) formatted = value.slice(0, 2)
  if (value.length > 2) formatted += '/' + value.slice(2, 4)
  if (value.length > 4) formatted += '/' + value.slice(4, 8)
  return formatted
}
