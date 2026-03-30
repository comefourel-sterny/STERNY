const attempts = {}
const PERSISTENT_KEY = 'sterny_rate_limits'

function loadPersistent() {
  try {
    const stored = localStorage.getItem(PERSISTENT_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch { return {} }
}

function savePersistent(data) {
  try {
    localStorage.setItem(PERSISTENT_KEY, JSON.stringify(data))
  } catch { /* silently fail */ }
}

export function check(action, maxAttempts, windowMs, options = {}) {
  const now = Date.now()
  const store = options.persistent ? loadPersistent() : attempts

  if (!store[action]) store[action] = []
  store[action] = store[action].filter(t => now - t < windowMs)

  if (store[action].length >= maxAttempts) {
    const waitSec = Math.ceil((store[action][0] + windowMs - now) / 1000)
    const message = options.message ||
      `Trop de tentatives. Réessaie dans ${waitSec} seconde${waitSec > 1 ? 's' : ''}.`
    alert(message)
    if (options.persistent) savePersistent(store)
    return false
  }

  store[action].push(now)
  if (options.persistent) savePersistent(store)
  return true
}

export function reset(action) {
  delete attempts[action]
  const stored = loadPersistent()
  delete stored[action]
  savePersistent(stored)
}

export const RateLimiter = { check, reset }
