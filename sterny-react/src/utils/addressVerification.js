const VILLES_CODES_POSTAUX = {
  'rennes': ['35000', '35100', '35200', '35700'],
  'paris': ['75001','75002','75003','75004','75005','75006','75007','75008','75009','75010',
            '75011','75012','75013','75014','75015','75016','75017','75018','75019','75020'],
  'lyon': ['69001','69002','69003','69004','69005','69006','69007','69008','69009'],
  'bordeaux': ['33000','33100','33200','33300','33800'],
  'nantes': ['44000','44100','44200','44300']
}

const SUSPICIOUS_KEYWORDS = [
  'test', 'fake', 'exemple', 'sample', 'xxx', 'zzz', 'aaa',
  'rue de test', 'avenue test', 'inconnu', 'à définir'
]

export function validateAddressFormat(address) {
  if (!address || address.trim().length < 5) {
    return { valid: false, message: "L'adresse est trop courte", severity: 'error' }
  }
  const hasNumber = /^\d+/.test(address.trim())
  if (!hasNumber) {
    return { valid: false, message: "L'adresse doit commencer par un numéro (ex: 15 rue...)", severity: 'error' }
  }
  const addressLower = address.toLowerCase()
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (addressLower.includes(keyword)) {
      return { valid: false, message: 'Cette adresse semble suspecte ou fictive', severity: 'error' }
    }
  }
  return { valid: true, message: "Format d'adresse valide", severity: 'success' }
}

export function extractPostalCode(address) {
  const match = address.match(/\b\d{5}\b/)
  return match ? match[0] : null
}

export function verifyPostalCodeCity(address, selectedCity) {
  const postalCode = extractPostalCode(address)
  if (!postalCode) {
    return { valid: false, message: "Code postal non trouvé dans l'adresse", severity: 'warning' }
  }
  const validCodes = VILLES_CODES_POSTAUX[selectedCity.toLowerCase()]
  if (!validCodes) {
    return { valid: true, message: 'Ville non vérifiable', severity: 'warning' }
  }
  if (!validCodes.includes(postalCode)) {
    return { valid: false, message: `Le code postal ${postalCode} ne correspond pas à ${selectedCity}`, severity: 'error' }
  }
  return { valid: true, message: 'Code postal cohérent avec la ville', severity: 'success' }
}

export async function geocodeAddress(address, selectedCity) {
  try {
    const fullAddress = `${address}, ${selectedCity}, France`
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return { valid: false, message: 'Adresse non trouvée dans la base nationale', severity: 'error', coordinates: null }
    }

    const result = data.features[0]
    const score = result.properties.score

    if (score < 0.5) {
      return { valid: false, message: 'Adresse introuvable ou imprécise', severity: 'error', coordinates: null }
    }
    if (score < 0.7) {
      return {
        valid: true, message: "Adresse trouvée mais peu précise. Vérifie l'orthographe.",
        severity: 'warning', coordinates: result.geometry.coordinates,
        formattedAddress: result.properties.label
      }
    }
    return {
      valid: true, message: 'Adresse vérifiée et validée', severity: 'success',
      coordinates: result.geometry.coordinates, formattedAddress: result.properties.label, score
    }
  } catch (error) {
    console.error('Erreur géolocalisation:', error)
    return { valid: false, message: "Impossible de vérifier l'adresse actuellement", severity: 'warning', coordinates: null }
  }
}

export async function validateAddress(address, selectedCity) {
  const formatCheck = validateAddressFormat(address)
  if (!formatCheck.valid) return formatCheck

  const postalCheck = verifyPostalCodeCity(address, selectedCity)
  if (!postalCheck.valid && postalCheck.severity === 'error') return postalCheck

  const geoCheck = await geocodeAddress(address, selectedCity)
  return {
    valid: geoCheck.valid, message: geoCheck.message, severity: geoCheck.severity,
    coordinates: geoCheck.coordinates, formattedAddress: geoCheck.formattedAddress, score: geoCheck.score
  }
}

export async function storeVerifiedAddress(annonce_id, coordinates, supabaseClient) {
  try {
    const { error } = await supabaseClient
      .from('annonces')
      .update({
        adresse_verifiee: true,
        latitude: coordinates[1],
        longitude: coordinates[0],
        adresse_verification_date: new Date().toISOString()
      })
      .eq('id', annonce_id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erreur stockage adresse:', error)
    return { success: false, error }
  }
}

export async function validateBeforePublish(address, city) {
  const validation = await validateAddress(address, city)
  if (!validation.valid) {
    return { canPublish: false, message: `Adresse invalide : ${validation.message}` }
  }
  if (validation.severity === 'warning') {
    const confirmed = confirm(`Attention : ${validation.message}\n\nVeux-tu quand même publier l'annonce ?`)
    return { canPublish: confirmed, message: validation.message, coordinates: validation.coordinates }
  }
  return {
    canPublish: true, message: 'Adresse validée',
    coordinates: validation.coordinates, formattedAddress: validation.formattedAddress
  }
}
