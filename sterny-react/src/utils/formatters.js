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
