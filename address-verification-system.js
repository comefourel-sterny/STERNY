// ==========================================
// SYSTÈME DE VÉRIFICATION D'ADRESSES - AlternHome
// ==========================================

/**
 * OBJECTIF : Éviter les fausses annonces en vérifiant que les adresses sont réelles
 * 
 * Fonctionnalités :
 * 1. Validation du format de l'adresse
 * 2. Géolocalisation via API (Google Maps ou API Adresse Data Gouv)
 * 3. Vérification que l'adresse correspond à la ville
 * 4. Détection d'adresses suspectes (incomplètes, fictives)
 */

// Liste des villes supportées avec leurs codes postaux
const VILLES_CODES_POSTAUX = {
    'rennes': ['35000', '35100', '35200', '35700'],
    'paris': ['75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008', '75009', '75010',
              '75011', '75012', '75013', '75014', '75015', '75016', '75017', '75018', '75019', '75020'],
    'lyon': ['69001', '69002', '69003', '69004', '69005', '69006', '69007', '69008', '69009'],
    'bordeaux': ['33000', '33100', '33200', '33300', '33800'],
    'nantes': ['44000', '44100', '44200', '44300']
};

// Mots suspects dans les adresses (à adapter selon tes besoins)
const SUSPICIOUS_KEYWORDS = [
    'test', 'fake', 'exemple', 'sample', 'xxx', 'zzz', 'aaa',
    'rue de test', 'avenue test', 'inconnu', 'à définir'
];

/**
 * Valider le format basique de l'adresse
 */
function validateAddressFormat(address) {
    if (!address || address.trim().length < 5) {
        return {
            valid: false,
            message: 'L\'adresse est trop courte',
            severity: 'error'
        };
    }
    
    // Vérifier la présence d'un numéro au début
    const hasNumber = /^\d+/.test(address.trim());
    if (!hasNumber) {
        return {
            valid: false,
            message: 'L\'adresse doit commencer par un numéro (ex: 15 rue...)',
            severity: 'error'
        };
    }
    
    // Vérifier les mots suspects
    const addressLower = address.toLowerCase();
    for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (addressLower.includes(keyword)) {
            return {
                valid: false,
                message: 'Cette adresse semble suspecte ou fictive',
                severity: 'error'
            };
        }
    }
    
    return {
        valid: true,
        message: 'Format d\'adresse valide',
        severity: 'success'
    };
}

/**
 * Extraire le code postal d'une adresse
 */
function extractPostalCode(address) {
    // Chercher un code postal français (5 chiffres)
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : null;
}

/**
 * Vérifier la cohérence ville/code postal
 */
function verifyPostalCodeCity(address, selectedCity) {
    const postalCode = extractPostalCode(address);
    
    if (!postalCode) {
        return {
            valid: false,
            message: 'Code postal non trouvé dans l\'adresse',
            severity: 'warning'
        };
    }
    
    const validCodes = VILLES_CODES_POSTAUX[selectedCity.toLowerCase()];
    
    if (!validCodes) {
        return {
            valid: true,
            message: 'Ville non vérifiable',
            severity: 'warning'
        };
    }
    
    if (!validCodes.includes(postalCode)) {
        return {
            valid: false,
            message: `Le code postal ${postalCode} ne correspond pas à ${selectedCity}`,
            severity: 'error'
        };
    }
    
    return {
        valid: true,
        message: 'Code postal cohérent avec la ville',
        severity: 'success'
    };
}

/**
 * Géolocaliser une adresse via l'API Adresse Data Gouv (GRATUITE)
 * https://api-adresse.data.gouv.fr/
 */
async function geocodeAddress(address, selectedCity) {
    try {
        const fullAddress = `${address}, ${selectedCity}, France`;
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
            return {
                valid: false,
                message: 'Adresse non trouvée dans la base nationale',
                severity: 'error',
                coordinates: null
            };
        }
        
        const result = data.features[0];
        const score = result.properties.score;
        
        // Score de confiance (0 à 1)
        if (score < 0.5) {
            return {
                valid: false,
                message: 'Adresse introuvable ou imprécise',
                severity: 'error',
                coordinates: null
            };
        }
        
        if (score < 0.7) {
            return {
                valid: true,
                message: 'Adresse trouvée mais peu précise. Vérifie l\'orthographe.',
                severity: 'warning',
                coordinates: result.geometry.coordinates,
                formattedAddress: result.properties.label
            };
        }
        
        return {
            valid: true,
            message: 'Adresse vérifiée et validée',
            severity: 'success',
            coordinates: result.geometry.coordinates,
            formattedAddress: result.properties.label,
            score: score
        };
        
    } catch (error) {
        console.error('Erreur géolocalisation:', error);
        return {
            valid: false,
            message: 'Impossible de vérifier l\'adresse actuellement',
            severity: 'warning',
            coordinates: null
        };
    }
}

/**
 * Validation complète de l'adresse
 * Combine toutes les vérifications
 */
async function validateAddress(address, selectedCity) {
    // 1. Validation du format
    const formatCheck = validateAddressFormat(address);
    if (!formatCheck.valid) {
        return formatCheck;
    }
    
    // 2. Vérification code postal / ville
    const postalCheck = verifyPostalCodeCity(address, selectedCity);
    if (!postalCheck.valid && postalCheck.severity === 'error') {
        return postalCheck;
    }
    
    // 3. Géolocalisation (vérification finale)
    const geoCheck = await geocodeAddress(address, selectedCity);
    
    return {
        valid: geoCheck.valid,
        message: geoCheck.message,
        severity: geoCheck.severity,
        coordinates: geoCheck.coordinates,
        formattedAddress: geoCheck.formattedAddress,
        score: geoCheck.score
    };
}

/**
 * Vérifier une adresse et afficher le résultat dans un élément HTML
 */
async function checkAddressInForm(addressInputId, citySelectId, messageElementId) {
    const address = document.getElementById(addressInputId).value.trim();
    const city = document.getElementById(citySelectId).value;
    const messageDiv = document.getElementById(messageElementId);
    
    if (!address) {
        messageDiv.style.display = 'none';
        return;
    }
    
    if (!city) {
        showMessage(messageDiv, 'Sélectionne d\'abord une ville', 'warning');
        return;
    }
    
    // Afficher un loader
    showMessage(messageDiv, 'Vérification de l\'adresse...', 'info');
    
    // Valider l'adresse
    const result = await validateAddress(address, city);
    
    // Afficher le résultat
    showMessage(messageDiv, result.message, result.severity);
    
    // Si l'adresse est validée, afficher l'adresse formatée
    if (result.valid && result.formattedAddress) {
        const formattedDiv = document.createElement('div');
        formattedDiv.style.marginTop = '8px';
        formattedDiv.style.fontSize = '13px';
        formattedDiv.style.color = '#6B7280';
        formattedDiv.textContent = `Adresse formatée : ${result.formattedAddress}`;
        messageDiv.appendChild(formattedDiv);
    }
    
    return result;
}

/**
 * Afficher un message dans un élément
 */
function showMessage(element, message, severity) {
    element.innerHTML = message;
    element.style.display = 'block';
    
    // Changer la couleur selon la sévérité
    if (severity === 'error') {
        element.style.background = '#FEE2E2';
        element.style.borderColor = '#EF4444';
        element.style.color = '#991B1B';
    } else if (severity === 'warning') {
        element.style.background = '#FEF3C7';
        element.style.borderColor = '#F59E0B';
        element.style.color = '#92400E';
    } else if (severity === 'success') {
        element.style.background = '#D1FAE5';
        element.style.borderColor = '#10B981';
        element.style.color = '#065F46';
    } else {
        element.style.background = '#DBEAFE';
        element.style.borderColor = '#3B82F6';
        element.style.color = '#1E40AF';
    }
}

/**
 * Stocker les coordonnées vérifiées dans Supabase
 */
async function storeVerifiedAddress(annonce_id, address, coordinates, supabaseClient) {
    try {
        const { error } = await supabaseClient
            .from('annonces')
            .update({
                adresse_verifiee: true,
                latitude: coordinates[1],  // [longitude, latitude] dans GeoJSON
                longitude: coordinates[0],
                adresse_verification_date: new Date().toISOString()
            })
            .eq('id', annonce_id);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Erreur stockage adresse:', error);
        return { success: false, error };
    }
}

/**
 * Validation avant publication d'annonce
 * À appeler dans la fonction publierAnnonce()
 */
async function validateBeforePublish(address, city) {
    const validation = await validateAddress(address, city);
    
    if (!validation.valid) {
        return {
            canPublish: false,
            message: `Adresse invalide : ${validation.message}`
        };
    }
    
    if (validation.severity === 'warning') {
        // Demander confirmation pour les adresses avec avertissement
        const confirmed = confirm(
            `Attention : ${validation.message}\n\n` +
            `Veux-tu quand même publier l'annonce ?`
        );
        
        return {
            canPublish: confirmed,
            message: validation.message,
            coordinates: validation.coordinates
        };
    }
    
    return {
        canPublish: true,
        message: 'Adresse validée',
        coordinates: validation.coordinates,
        formattedAddress: validation.formattedAddress
    };
}
