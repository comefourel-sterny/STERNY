export function formatTimeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return "a l'instant"
  if (diff < 3600) return Math.floor(diff / 60) + ' min'
  if (diff < 86400) return Math.floor(diff / 3600) + ' h'
  if (diff < 604800) return Math.floor(diff / 86400) + ' j'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function getInitials(prenom, nom) {
  // Support single argument (full name string) or two arguments (prenom, nom)
  if (nom === undefined && typeof prenom === 'string' && prenom.includes(' ')) {
    const parts = prenom.split(' ')
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
  }
  if (nom === undefined && typeof prenom === 'string') {
    return prenom.substring(0, 2).toUpperCase()
  }
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase()
}

export function getCountdown(dateFin) {
  if (!dateFin) return null
  const now = new Date()
  const fin = new Date(dateFin)
  const diff = Math.ceil((fin - now) / (1000 * 60 * 60 * 24))
  return diff
}

// Plage d'une semaine en français à partir du lundi ISO "YYYY-MM-DD".
// Ex : "8 – 14 juin" ; si la semaine chevauche 2 mois : "30 juin – 6 juillet".
// Option tight : séparateur compact "–" (sans espaces) pour les petites tuiles.
export function formatWeekRangeFR(weekStart, { tight = false } = {}) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const lundi = new Date(y, m - 1, d)
  const dimanche = new Date(y, m - 1, d + 6)
  const sep = tight ? '–' : ' – '
  const moisLundi = lundi.toLocaleDateString('fr-FR', { month: 'long' })
  const moisDimanche = dimanche.toLocaleDateString('fr-FR', { month: 'long' })
  if (lundi.getMonth() === dimanche.getMonth()) {
    return `${lundi.getDate()}${sep}${dimanche.getDate()} ${moisDimanche}`
  }
  return `${lundi.getDate()} ${moisLundi}${sep}${dimanche.getDate()} ${moisDimanche}`
}
