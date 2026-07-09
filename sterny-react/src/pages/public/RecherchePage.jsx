import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { RateLimiter } from '../../utils/rateLimiter'
import { deduireRecherche } from '../../utils/deduireRecherche'
import { couvertureSemaines } from '../../utils/matching'
import InvitationModal from '../../components/InvitationModal'
import { VILLES_DISPONIBLES as VILLES_DISPONIBLES_RECHERCHE, VILLES_COORDS } from '../../data/villes-lancement'
import './RecherchePage.css'

// ========== CONSTANTS ==========

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY29tZWZvdXJlbCIsImEiOiJjbWx2Mmo4Nm4wMzJvM2NzYW5qYjNiMDAxIn0.9cGaskeyo5VLTt4kbeO95g'

const SIGLES_ECOLES = {
  'ENSAB': 'École nationale supérieure d\'architecture de Bretagne',
  'ENSAP': 'École nationale supérieure d\'architecture de Paris',
  'ENSAL': 'École nationale supérieure d\'architecture de Lyon',
  'ENSAM': 'École nationale supérieure d\'architecture de Marseille',
  'ENSAG': 'École nationale supérieure d\'architecture de Grenoble',
  'ENSAN': 'École nationale supérieure d\'architecture de Nancy',
  'ENSAS': 'École nationale supérieure d\'architecture de Strasbourg',
  'ENSAPM': 'École nationale supérieure d\'architecture de Paris-Malaquais',
  'ENSAPB': 'École nationale supérieure d\'architecture de Paris-Belleville',
  'ENSAPLV': 'École nationale supérieure d\'architecture de Paris-La Villette',
  'ENSA': 'École nationale supérieure d\'architecture',
  'INSA': 'Institut national des sciences appliquées',
  'ISEN': 'Institut supérieur de l\'électronique et du numérique',
  'ENSAI': 'École nationale de la statistique et de l\'analyse de l\'information',
  'ENSAE': 'École nationale de la statistique et de l\'administration économique',
  'ENSC': 'École nationale supérieure de cognitique',
  'ENSCI': 'École nationale supérieure de création industrielle',
  'EPITECH': 'Epitech école informatique',
  'EPITA': 'École pour l\'informatique et les techniques avancées',
  'ESIR': 'École supérieure d\'ingénieurs de Rennes',
  'ESCP': 'ESCP Business School',
  'ESSEC': 'ESSEC Business School',
  'HEC': 'HEC Paris',
  'EDHEC': 'EDHEC Business School',
  'KEDGE': 'KEDGE Business School',
  'SKEMA': 'SKEMA Business School',
  'NEOMA': 'NEOMA Business School',
  'EM': 'École de management',
  'ESC': 'École supérieure de commerce',
  'EESAB': 'École européenne supérieure d\'art de Bretagne',
  'ENIB': 'École nationale d\'ingénieurs de Brest',
  'ENIM': 'École nationale d\'ingénieurs de Metz',
  'ENIT': 'École nationale d\'ingénieurs de Tarbes',
  'ENISE': 'École nationale d\'ingénieurs de Saint-Étienne',
  'ECAM': 'ECAM école d\'ingénieurs',
  'ICAM': 'Institut catholique d\'arts et métiers',
  'ISAE': 'Institut supérieur de l\'aéronautique et de l\'espace',
  'SUPAERO': 'Institut supérieur de l\'aéronautique et de l\'espace',
  'ENAC': 'École nationale de l\'aviation civile',
  'ENTPE': 'École nationale des travaux publics de l\'État',
  'ENSEIRB': 'École nationale supérieure d\'électronique informatique et de radiocommunications de Bordeaux',
  'ENSEEIHT': 'École nationale supérieure d\'électrotechnique d\'informatique d\'hydraulique et des télécommunications',
  'ENSIMAG': 'École nationale supérieure d\'informatique et de mathématiques appliquées de Grenoble',
  'ENSTA': 'École nationale supérieure de techniques avancées',
  'ESTACA': 'ESTACA école d\'ingénieurs',
  'ECE': 'ECE école d\'ingénieurs',
  'EFREI': 'EFREI école d\'ingénieurs',
  'ESIEA': 'ESIEA école d\'ingénieurs',
  'ESIEE': 'ESIEE Paris',
  'ISEP': 'Institut supérieur d\'électronique de Paris',
  'TELECOM': 'Télécom Paris',
  'IMT': 'Institut Mines-Télécom',
  'MINES': 'École des Mines',
  'CENTRALE': 'École Centrale',
  'POLYTECH': 'Polytech école d\'ingénieurs',
  'UTT': 'Université de technologie de Troyes',
  'UTC': 'Université de technologie de Compiègne',
  'UTBM': 'Université de technologie de Belfort-Montbéliard',
  'IUT': 'Institut universitaire de technologie',
  'BTS': 'Brevet de technicien supérieur',
  'IFSI': 'Institut de formation en soins infirmiers',
  'IRTS': 'Institut régional du travail social',
  'ASKORIA': 'Askoria formation travail social',
  'CNAM': 'Conservatoire national des arts et métiers',
  'ENSATT': 'École nationale supérieure des arts et techniques du théâtre',
  'FEMIS': 'École nationale supérieure des métiers de l\'image et du son',
  'GOBELINS': 'Gobelins école de l\'image',
  'SUPELEC': 'École supérieure d\'électricité',
  'AGROCAMPUS': 'Agrocampus Ouest',
  'AGRONOMIQUE': 'Institut national agronomique',
  'RSB': 'Rennes School of Business',
  'IGR': 'Institut de gestion de Rennes',
  'ECOLES2I': 'École supérieure d\'informatique',
  'SUPINFO': 'Supinfo école informatique',
  'ESRA': 'ESRA école de cinéma',
  'LISAA': 'LISAA école de design',
  'STUDI': 'Studi école en ligne',
  'YNOV': 'Ynov campus numérique',
  'MYDIGITALSCHOOL': 'MyDigitalSchool',
  'WIS': 'WIS web international school',
  'HETIC': 'HETIC web école',
  'IIM': 'Institut de l\'internet et du multimédia',
  'SUPDEVINCI': 'Sup de Vinci',
  'ESAIP': 'ESAIP école d\'ingénieurs',
  'CPE': 'CPE Lyon',
  'PHELMA': 'Grenoble INP Phelma',
  'PAGORA': 'Grenoble INP Pagora',
  'ENSE3': 'Grenoble INP Ense3',
  'GÉNIE': 'Grenoble INP Génie industriel'
}

const PROFILS_DATA = {
  1: { initials: 'LM', name: 'Léa M.', genre: 'F', age: 22, type: 'Asymétrique', rythme: '2 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'ENSAB', entreprise: 'Capgemini, Nantes' },
  2: { initials: 'AC', name: 'Antoine C.', genre: 'M', age: 24, type: 'Asymétrique', rythme: '2 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'INSA Rennes', entreprise: 'Orange, Saint-Malo' },
  3: { initials: 'TR', name: 'Thomas R.', genre: 'M', age: 21, type: 'Symétrique', rythme: '1 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'ESIR', entreprise: 'OVHcloud, Rennes' },
  4: { initials: 'SM', name: 'Sophie M.', genre: 'F', age: 23, type: 'Asymétrique', rythme: '3 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'ENIB', entreprise: 'Thales, Rennes' },
  5: { initials: 'JD', name: 'Julie D.', genre: 'F', age: 20, type: 'Asymétrique', rythme: '2 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'Rennes School of Business', entreprise: 'Deloitte, Vannes' },
  6: { initials: 'MB', name: 'Maxime B.', genre: 'M', age: 25, type: 'Personnalisé', rythme: '3j / 2j', villeRecherche: 'Rennes', ecole: 'Epitech Rennes', entreprise: 'Sopra Steria, Rennes' },
  7: { initials: 'CL', name: 'Camille L.', genre: 'F', age: 22, type: 'Asymétrique', rythme: '2 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'ENSAI', entreprise: 'Crédit Mutuel, Rennes' },
  8: { initials: 'NP', name: 'Nicolas P.', genre: 'M', age: 23, type: 'Symétrique', rythme: '1 sem. / 1 sem.', villeRecherche: 'Rennes', ecole: 'INSA Rennes', entreprise: 'Naval Group, Lorient' }
}

const QUARTIERS = {
  'rennes': {
    'république': 'République', 'sainte-anne': 'Sainte-Anne', 'sainte anne': 'Sainte-Anne',
    'villejean': 'Villejean', 'thabor': 'Thabor', 'beaulieu': 'Beaulieu',
    'gare': 'Gare', 'colombier': 'Colombier', 'mail': 'Centre', 'liberté': 'Centre',
    'poterie': 'Poterie', 'cleunay': 'Cleunay', 'bréquigny': 'Bréquigny',
    'maurepas': 'Maurepas', 'patton': 'Patton', 'kennedy': 'Kennedy',
    'alma': 'Alma', 'longs champs': 'Longs Champs', 'longchamps': 'Longs Champs'
  },
  'nantes': {
    'commerce': 'Centre', 'graslin': 'Graslin', 'île de nantes': 'Île de Nantes',
    'prairie': 'Île de Nantes', 'erdre': 'Erdre', 'chantenay': 'Chantenay',
    'talensac': 'Talensac', 'procé': 'Procé', 'zola': 'Zola',
    'bouffay': 'Bouffay', 'doulon': 'Doulon', 'malakoff': 'Malakoff'
  },
  'paris': {
    'marais': 'Le Marais', 'bastille': 'Bastille', 'montmartre': 'Montmartre',
    'belleville': 'Belleville', 'république': 'République', 'nation': 'Nation',
    'oberkampf': 'Oberkampf', 'batignolles': 'Batignolles', 'pigalle': 'Pigalle',
    'châtelet': 'Châtelet', 'saint-germain': 'Saint-Germain', 'latin': 'Quartier Latin'
  },
  'lyon': {
    'presqu\'île': 'Presqu\'île', 'bellecour': 'Centre', 'part-dieu': 'Part-Dieu',
    'confluence': 'Confluence', 'guillotière': 'Guillotière', 'croix-rousse': 'Croix-Rousse',
    'vieux lyon': 'Vieux Lyon', 'gerland': 'Gerland', 'monplaisir': 'Monplaisir'
  },
  'bordeaux': {
    'saint-pierre': 'Saint-Pierre', 'chartrons': 'Chartrons', 'bastide': 'Bastide',
    'victoire': 'Victoire', 'saint-michel': 'Saint-Michel', 'mériadeck': 'Mériadeck',
    'nansouty': 'Nansouty', 'gambetta': 'Gambetta'
  },
  'toulouse': {
    'capitole': 'Capitole', 'saint-cyprien': 'Saint-Cyprien', 'minimes': 'Minimes',
    'compans': 'Compans', 'rangueil': 'Rangueil', 'jean-jaurès': 'Jean-Jaurès',
    'carmes': 'Carmes', 'esquirol': 'Esquirol'
  },
  'lille': {
    'vieux-lille': 'Vieux-Lille', 'wazemmes': 'Wazemmes', 'euralille': 'Euralille',
    'moulins': 'Moulins', 'fives': 'Fives', 'république': 'République',
    'gambetta': 'Gambetta', 'solférino': 'Solférino'
  },
  'montpellier': {
    'écusson': 'Écusson', 'antigone': 'Antigone', 'port marianne': 'Port Marianne',
    'boutonnet': 'Boutonnet', 'beaux-arts': 'Beaux-Arts', 'gare': 'Gare'
  }
}

// ========== HELPERS ==========

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-ZÀ-ÿ])/g, match => match.toUpperCase())
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = x => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getQuartier(adresse, ville) {
  if (!adresse) return 'Centre-ville'
  const addr = adresse.toLowerCase()
  const villeKey = ville ? ville.toLowerCase() : ''
  const map = QUARTIERS[villeKey]
  if (map) {
    for (const [key, name] of Object.entries(map)) {
      if (addr.includes(key)) return name
    }
  }
  return 'Centre-ville'
}

// ========== COMPONENT ==========

export default function RecherchePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(true)

  // 2a — charge le profil connecté et déduit ses villes/semaines cherchées (carburant du croisement 2b).
  const [deductionRecherche, setDeductionRecherche] = useState([])
  useEffect(() => {
    if (!user) { setDeductionRecherche([]); return }
    let annule = false
    ;(async () => {
      const { data } = await supabaseClient
        .from('users')
        .select('type_user, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar')
        .eq('id', user.id)
        .single()
      if (annule) return
      setDeductionRecherche(data ? deduireRecherche(data) : [])
    })()
    return () => { annule = true }
  }, [user])

  // Data state
  const [logements, setLogements] = useState([])
  const [logementsAffiches, setLogementsAffiches] = useState([])
  const [userFavoris, setUserFavoris] = useState([])

  // Search / filter state
  const [villeInput, setVilleInput] = useState('')
  const [villeSelectionnee, setVilleSelectionnee] = useState('')
  const [villeSecondaire, setVilleSecondaire] = useState('')
  const [showVilleSuggestions, setShowVilleSuggestions] = useState(false)
  const [villeSuggestions, setVilleSuggestions] = useState([])
  const [villeSuggestionMsg, setVilleSuggestionMsg] = useState('')
  const [showNoMatch, setShowNoMatch] = useState(false)

  // 2b — semaines de présence du croisement : déduites du profil de l'utilisateur connecté
  const semainesUtilisateur = useMemo(() => {
    const entree = deductionRecherche.find(d => d.ville === villeSelectionnee) || deductionRecherche[0]
    return entree ? entree.semaines : []
  }, [deductionRecherche, villeSelectionnee])

  // Drawer filters
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [budgetMax, setBudgetMax] = useState('')
  const [surfaceMin, setSurfaceMin] = useState('')
  const [typesLogement, setTypesLogement] = useState({ studio: false, t1: false, t2: false, t3: false, 't4+': false })
  const [equipementsFilter, setEquipementsFilter] = useState({
    'Accessible PMR': false, WiFi: false, 'Meublé': false, Parking: false, 'Cuisine équipée': false, 'Balcon/Terrasse': false
  })
  const [dynamicEquipements, setDynamicEquipements] = useState([])
  const [dynamicEquipChecked, setDynamicEquipChecked] = useState({})
  const [equipSearchQuery, setEquipSearchQuery] = useState('')
  const [equipSearchResults, setEquipSearchResults] = useState([])

  // Sort
  const [sortValue, setSortValue] = useState('')

  // Proximity
  const [proximityInput, setProximityInput] = useState('')
  const [proximityStatus, setProximityStatus] = useState('')
  const [proximitySuggestions, setProximitySuggestions] = useState([])
  const [showProximitySuggestions, setShowProximitySuggestions] = useState(false)
  const [proximiteActive, setProximiteActive] = useState(false)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const proximityTimeoutRef = useRef(null)
  const mbxSessionRef = useRef(crypto.randomUUID())

  // Search error
  const [searchError, setSearchError] = useState('')

  // Notification modal
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'warning', redirectUrl: null })

  // Alert emails
  const [alertEmail, setAlertEmail] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertEmailBottom, setAlertEmailBottom] = useState('')
  const [alertMessageBottom, setAlertMessageBottom] = useState('')
  const [alertPlaceholder, setAlertPlaceholder] = useState('')
  const [alertPlaceholderTop, setAlertPlaceholderTop] = useState('')

  // Modal profils
  const [modalProfilsOpen, setModalProfilsOpen] = useState(false)
  const [modalView, setModalView] = useState('list') // 'list' | 'detail' | 'conversation'
  const [currentProfil, setCurrentProfil] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatMessagesRef = useRef(null)

  // Filter counts
  const [filterCounts, setFilterCounts] = useState({
    studio: 0, t1: 0, coloc: 0, symmetric: 0, asymmetric: 0, custom: 0
  })

  // Refs
  const villeInputRef = useRef(null)
  const villeSuggestionsRef = useRef(null)

  // ========== NOTIFICATION ==========

  const showNotification = useCallback((title, message, type = 'warning', redirectUrl = null) => {
    setNotification({ show: true, title, message, type, redirectUrl })
  }, [])

  const closeNotification = useCallback(() => {
    const redirectUrl = notification.redirectUrl
    setNotification(prev => ({ ...prev, show: false }))
    if (redirectUrl) {
      navigate(redirectUrl)
    }
  }, [notification.redirectUrl, navigate])

  // ========== LOAD DATA ==========

  // Load annonces
  useEffect(() => {
    const villeParam = searchParams.get('ville')
    const ville2Param = searchParams.get('ville2')

    // Set initial values from URL
    if (villeParam) {
      const villeLabel = Object.keys(VILLES_DISPONIBLES_RECHERCHE).find(k =>
        VILLES_DISPONIBLES_RECHERCHE[k] === villeParam
      )
      if (villeLabel) {
        setVilleInput(villeLabel)
        setVilleSelectionnee(villeParam)
      }
    }
    if (ville2Param) {
      setVilleSecondaire(ville2Param)
    }

    async function loadData() {
      try {
        const { data, error } = await supabaseClient
          .from('annonces')
          .select('*')
          .eq('disponible', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        setLogements(data || [])
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load favorites
  useEffect(() => {
    if (!user) return
    async function loadFavoris() {
      const { data, error } = await supabaseClient
        .from('favoris')
        .select('annonce_id')
        .eq('user_id', user.id)
      if (!error && data) {
        setUserFavoris(data.map(f => f.annonce_id))
      }
    }
    loadFavoris()
  }, [user])

  // ========== FILTERING ==========

  const filtrerLogements = useCallback((villeOverride) => {
    let resultats = [...logements]

    // Ville filter — villeOverride (slug résolu au lancement) prime sur le state,
    // qui peut ne pas encore refléter setVilleSelectionnee (mise à jour asynchrone).
    const villeActive = villeOverride || villeSelectionnee
    if (villeActive) {
      const villesAcceptees = [villeActive]
      if (villeSecondaire) villesAcceptees.push(villeSecondaire)
      resultats = resultats.filter(l =>
        villesAcceptees.some(v => v.toLowerCase() === (l.ville || '').toLowerCase())
      )
    }

    // Type logement checkboxes
    const selectedTypes = Object.entries(typesLogement).filter(([, v]) => v).map(([k]) => k)
    if (selectedTypes.length > 0) {
      resultats = resultats.filter(l => selectedTypes.includes(l.type_logement))
    }

    // Budget max
    const budget = parseFloat(budgetMax)
    if (!isNaN(budget) && budget > 0) {
      resultats = resultats.filter(l => (l.prix || 0) <= budget)
    }

    // Surface min
    const surface = parseFloat(surfaceMin)
    if (!isNaN(surface) && surface > 0) {
      resultats = resultats.filter(l => (l.surface || 0) >= surface)
    }

    // Equipment checkboxes (static)
    const selectedEquip = Object.entries(equipementsFilter).filter(([, v]) => v).map(([k]) => k)
    if (selectedEquip.length > 0) {
      resultats = resultats.filter(l => {
        if (!l.equipements) return false
        return selectedEquip.every(eq =>
          l.equipements.some(e => e.toLowerCase().includes(eq.toLowerCase()))
        )
      })
    }

    // Dynamic equipment checkboxes
    const selectedDynamic = Object.entries(dynamicEquipChecked).filter(([, v]) => v).map(([k]) => k)
    if (selectedDynamic.length > 0) {
      resultats = resultats.filter(l => {
        if (!l.equipements) return false
        return selectedDynamic.every(kw =>
          l.equipements.some(e => e.startsWith('Autre: ') && e.toLowerCase().includes(kw))
        )
      })
    }

    // Match scoring with user disponibilites (exclude past dates)
    if (semainesUtilisateur.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10)
      const futurUserDates = semainesUtilisateur.filter(d => d >= todayStr)
      const userDatesSet = new Set(futurUserDates)
      resultats = resultats.filter(logement => {
        if (!logement.disponibilites_pattern || logement.disponibilites_pattern.length === 0) return false
        return logement.disponibilites_pattern.some(d => d >= todayStr && userDatesSet.has(d))
      })
      resultats = resultats.map(logement => {
        // Couverture : combien des semaines cherchées (Y) ce logement couvre (X).
        // Dénominateur = TOUTES les semaines cherchées (pas la fenêtre de l'annonce). semainesReservees vide (registre non branché).
        const { couvertes, totalCherchees, semainesCouvertes } = couvertureSemaines({
          semainesCherchees: futurUserDates,
          disponibilitesOffre: logement.disponibilites_pattern || [],
        })
        return { ...logement, couvertes, totalCherchees, semainesCouvertes }
      })
      resultats.sort((a, b) => b.couvertes - a.couvertes)
    } else {
      resultats.sort((a, b) => (a.prix || 0) - (b.prix || 0))
    }

    setLogementsAffiches(resultats)
  }, [logements, villeSelectionnee, villeSecondaire,
      typesLogement, budgetMax, surfaceMin, equipementsFilter,
      dynamicEquipChecked, semainesUtilisateur])

  // Run filter when dependencies change
  useEffect(() => {
    if (logements.length > 0) {
      filtrerLogements()
    }
  }, [logements, filtrerLogements])

  // Update filter counts
  useEffect(() => {
    setFilterCounts({
      studio: logements.filter(l => l.type_logement === 'studio').length,
      t1: logements.filter(l => l.type_logement === 't1').length,
      t2: logements.filter(l => l.type_logement === 't2').length,
      t3: logements.filter(l => l.type_logement === 't3').length,
      't4+': logements.filter(l => l.type_logement === 't4+').length,
      symmetric: logements.filter(l => l.type_alternance === 'symmetric').length,
      asymmetric: logements.filter(l => l.type_alternance === 'asymmetric').length,
      custom: logements.filter(l => l.type_alternance === 'custom').length,
    })
  }, [logements])

  // Analyze dynamic equipements
  useEffect(() => {
    const compteur = {}
    logements.forEach(logement => {
      if (!logement.equipements || !Array.isArray(logement.equipements)) return
      logement.equipements.forEach(equip => {
        if (equip.startsWith('Autre: ')) {
          const texte = equip.substring(7)
          texte.split(',').forEach(mot => {
            const cleaned = mot.trim().toLowerCase()
            if (cleaned.length > 1) {
              const displayName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
              if (!compteur[cleaned]) compteur[cleaned] = { count: 0, displayName }
              compteur[cleaned].count++
            }
          })
        }
      })
    })
    const populaires = Object.entries(compteur)
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
    setDynamicEquipements(populaires)
  }, [logements])

  // ========== SORTING ==========

  const trierLogements = useCallback((critere) => {
    setSortValue(critere)
    setLogementsAffiches(prev => {
      let sorted = [...prev]
      if (critere === 'prix-asc') {
        sorted.sort((a, b) => (a.prix || 0) - (b.prix || 0))
      } else if (critere === 'prix-desc') {
        sorted.sort((a, b) => (b.prix || 0) - (a.prix || 0))
      } else if (critere === 'recent') {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }
      return sorted
    })
  }, [])

  // ========== VILLE AUTOCOMPLETE ==========

  const handleVilleInput = useCallback((e) => {
    const raw = e.target.value
    const pos = e.target.selectionStart
    const capitalized = capitalizeWords(raw)
    setVilleInput(capitalized)
    setVilleSelectionnee('')

    // Need to restore cursor position after React re-render
    setTimeout(() => {
      if (villeInputRef.current) {
        villeInputRef.current.setSelectionRange(pos, pos)
      }
    }, 0)

    const query = raw.trim().toLowerCase()
    if (query.length === 0) {
      setShowVilleSuggestions(false)
      setShowNoMatch(false)
      setVilleSuggestions([])
      return
    }

    const matches = Object.keys(VILLES_DISPONIBLES_RECHERCHE).filter(v =>
      v.toLowerCase().startsWith(query)
    )

    if (matches.length > 0) {
      setVilleSuggestions(matches.map(v => ({
        label: v,
        value: VILLES_DISPONIBLES_RECHERCHE[v]
      })))
      setShowVilleSuggestions(true)
      setShowNoMatch(false)
    } else {
      setVilleSuggestions([])
      setShowVilleSuggestions(false)
      if (query.length >= 2) {
        setShowNoMatch(true)
      } else {
        setShowNoMatch(false)
      }
    }
  }, [])

  const handleVilleSelect = useCallback((label, value) => {
    setVilleInput(label)
    setVilleSelectionnee(value)
    setShowVilleSuggestions(false)
    setShowNoMatch(false)
  }, [])

  const handleVilleBlur = useCallback(() => {
    setTimeout(() => {
      setShowVilleSuggestions(false)
      setShowNoMatch(false)
      const val = villeInput.trim()
      if (val && !villeSelectionnee) {
        const exactMatch = Object.keys(VILLES_DISPONIBLES_RECHERCHE).find(v =>
          v.toLowerCase() === val.toLowerCase()
        )
        if (exactMatch) {
          setVilleInput(exactMatch)
          setVilleSelectionnee(VILLES_DISPONIBLES_RECHERCHE[exactMatch])
        }
      }
    }, 200)
  }, [villeInput, villeSelectionnee])

  // Lancement centralisé de la recherche ville (loupe + touche Entrée).
  const lancerRechercheVille = useCallback(() => {
    // Résolution du slug : soit sélection dans la liste, soit texte exact tapé
    // sans clic sur une suggestion (résolution de secours).
    let slug = villeSelectionnee
    if (!slug) {
      const val = villeInput.trim()
      if (val) {
        const exactMatch = Object.keys(VILLES_DISPONIBLES_RECHERCHE).find(v =>
          v.toLowerCase() === val.toLowerCase()
        )
        if (exactMatch) {
          slug = VILLES_DISPONIBLES_RECHERCHE[exactMatch]
          // Cohérence d'affichage si l'utilisateur revient sur le champ.
          setVilleInput(exactMatch)
          setVilleSelectionnee(slug)
        }
      }
    }

    // Erreur + shake seulement si AUCUNE résolution possible (ni state, ni texte exact).
    if (!slug) {
      setSearchError('Complète ta recherche avant de continuer')
      if (villeInputRef.current) {
        villeInputRef.current.style.borderColor = '#ff6b6b'
        villeInputRef.current.style.animation = 'shake 0.4s ease'
        setTimeout(() => { villeInputRef.current.style.borderColor = ''; villeInputRef.current.style.animation = '' }, 2000)
      }
      setTimeout(() => setSearchError(''), 3000)
      return
    }

    setShowVilleSuggestions(false)
    // On filtre avec le slug résolu, pas l'état villeSelectionnee (mise à jour asynchrone).
    filtrerLogements(slug)
  }, [villeSelectionnee, villeInput, filtrerLogements])

  // ========== DRAWER ==========

  const ouvrirFiltres = useCallback(() => {
    setDrawerOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const fermerFiltres = useCallback(() => {
    setDrawerOpen(false)
    document.body.style.overflow = ''
  }, [])

  const reinitialiserFiltres = useCallback(() => {
    setTypesLogement({ studio: false, t1: false, t2: false, t3: false, 't4+': false })
    setEquipementsFilter({ 'Accessible PMR': false, WiFi: false, 'Meublé': false, Parking: false, 'Cuisine équipée': false, 'Balcon/Terrasse': false })
    setEquipSearchQuery('')
    setEquipSearchResults([])
    setDynamicEquipChecked({})
    setBudgetMax('')
    setSurfaceMin('')
    setVilleInput('')
    setVilleSelectionnee('')
    setVilleSecondaire('')
    setSortValue('')
    setProximityInput('')
    setProximityStatus('')
    setProximiteActive(false)
    setUserLat(null)
    setUserLng(null)
  }, [])

  const activeFilterCount = (() => {
    let count = 0
    Object.values(typesLogement).forEach(v => { if (v) count++ })
    Object.values(equipementsFilter).forEach(v => { if (v) count++ })
    Object.values(dynamicEquipChecked).forEach(v => { if (v) count++ })
    if (budgetMax) count++
    if (surfaceMin) count++
    return count
  })()

  // ========== PROXIMITY ==========

  const trierParProximite = useCallback(async () => {
    const input = proximityInput.trim()
    if (!input) {
      setProximityStatus('<span style="color: var(--error);">Saisis une adresse ou un lieu</span>')
      return
    }

    setProximityStatus('<span style="color: #6B7280;">Recherche en cours...</span>')

    let query = input
    if (villeSelectionnee) {
      const villeLabel = Object.keys(VILLES_DISPONIBLES_RECHERCHE).find(k =>
        VILLES_DISPONIBLES_RECHERCHE[k] === villeSelectionnee
      )
      if (villeLabel && !input.toLowerCase().includes(villeLabel.toLowerCase())) {
        query += ' ' + villeLabel
      }
    }

    try {
      const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`)
      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        setProximityStatus('<span style="color: var(--error);">Adresse introuvable. Essaie avec plus de détails.</span>')
        return
      }

      const [lng, lat] = data.features[0].geometry.coordinates
      const label = data.features[0].properties.label
      setUserLat(lat)
      setUserLng(lng)
      setProximiteActive(true)
      setProximityStatus(`<span style="color: var(--success);">Tri par proximité de : <strong>${label}</strong></span>`)

      // Calculate distances and sort
      setLogementsAffiches(prev => {
        const mapped = prev.map(logement => {
          if (logement.latitude && logement.longitude) {
            return { ...logement, distance: haversineKm(lat, lng, logement.latitude, logement.longitude) }
          }
          return { ...logement, distance: 9999 }
        })
        mapped.sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
        return mapped
      })
      setSortValue('proximite')
    } catch (error) {
      console.error('Erreur géocodage:', error)
      setProximityStatus('<span style="color: var(--error);">Erreur réseau. Réessaie.</span>')
    }
  }, [proximityInput, villeSelectionnee])

  const selectProximitySuggestion = useCallback((lat, lng, label) => {
    setProximityInput(label)
    setShowProximitySuggestions(false)
    setUserLat(lat)
    setUserLng(lng)
    setProximiteActive(true)
    setProximityStatus(`<span style="color: var(--success);">Tri par proximité de : <strong>${label}</strong></span>`)

    setLogementsAffiches(prev => {
      const mapped = prev.map(logement => {
        if (logement.latitude && logement.longitude) {
          return { ...logement, distance: haversineKm(lat, lng, logement.latitude, logement.longitude) }
        }
        return { ...logement, distance: 9999 }
      })
      mapped.sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
      return mapped
    })
    setSortValue('proximite')
  }, [])

  // Proximity autocomplete
  const searchProximitySchool = useCallback(async (query) => {
    try {
      const seen = new Map()
      const villeCoords = villeSelectionnee ? VILLES_COORDS[villeSelectionnee] : null
      const proximity = villeCoords ? villeCoords.lng + ',' + villeCoords.lat : '2.2137,46.2276'
      const villeLabel = Object.keys(VILLES_DISPONIBLES_RECHERCHE).find(k =>
        VILLES_DISPONIBLES_RECHERCHE[k] === villeSelectionnee
      ) || ''

      const queryUpper = query.trim().toUpperCase()
      const expandedName = SIGLES_ECOLES[queryUpper] || null
      const searchQueries = [query]
      if (expandedName) searchQueries.push(expandedName)

      const allPromises = []
      const promiseLabels = []

      for (const q of searchQueries) {
        const eq = encodeURIComponent(q)
        const mbxQ = villeLabel ? q + ' ' + villeLabel : q

        allPromises.push(
          fetch('https://api.mapbox.com/search/searchbox/v1/suggest?q=' + encodeURIComponent(mbxQ) + '&language=fr&types=poi&proximity=' + proximity + '&limit=5&session_token=' + mbxSessionRef.current + '&access_token=' + MAPBOX_TOKEN)
            .then(r => r.ok ? r.json() : { suggestions: [] }).catch(() => ({ suggestions: [] }))
        )
        promiseLabels.push('mapbox')

        const psupBase = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records'
        const psupFields = 'g_ea_lib_vx%2Cville_etab%2Cg_olocalisation_des_formations'
        if (villeLabel) {
          allPromises.push(
            fetch(psupBase + '?where=search(g_ea_lib_vx%2C%22' + eq + '%22)%20AND%20search(ville_etab%2C%22' + encodeURIComponent(villeLabel) + '%22)&limit=10&select=' + psupFields)
              .then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
          )
          promiseLabels.push('parcoursup')
        }
        allPromises.push(
          fetch(psupBase + '?where=search(g_ea_lib_vx%2C%22' + eq + '%22)&limit=10&select=' + psupFields)
            .then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        )
        promiseLabels.push('parcoursup')

        const photonQ = villeLabel ? q + ' ' + villeLabel : q
        allPromises.push(
          fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(photonQ) + '&limit=5&lang=fr')
            .then(r => r.ok ? r.json() : { features: [] }).catch(() => ({ features: [] }))
        )
        promiseLabels.push('photon')
      }

      const allResults = await Promise.all(allPromises)

      function normalKey(name, city) {
        const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
        return norm(name) + '|' + norm(city || '')
      }

      const eduTypes = ['college', 'university', 'school']
      const allRetrievePromises = []

      for (let i = 0; i < allResults.length; i++) {
        const data = allResults[i]
        const label = promiseLabels[i]

        if (label === 'mapbox' && data.suggestions) {
          data.suggestions.filter(s => s.mapbox_id && s.name).slice(0, 3).forEach(s => {
            allRetrievePromises.push(
              fetch('https://api.mapbox.com/search/searchbox/v1/retrieve/' + s.mapbox_id + '?session_token=' + mbxSessionRef.current + '&access_token=' + MAPBOX_TOKEN)
                .then(r => r.ok ? r.json() : null).catch(() => null)
            )
          })
        } else if (label === 'parcoursup' && data.results) {
          data.results.forEach(r => {
            if (r.g_olocalisation_des_formations && r.g_olocalisation_des_formations.lat && r.g_olocalisation_des_formations.lon) {
              const key = normalKey(r.g_ea_lib_vx, r.ville_etab)
              if (!seen.has(key)) {
                seen.set(key, { name: r.g_ea_lib_vx, city: r.ville_etab || '', lat: r.g_olocalisation_des_formations.lat, lng: r.g_olocalisation_des_formations.lon })
              }
            }
          })
        } else if (label === 'photon' && data.features) {
          data.features.forEach(f => {
            const props = f.properties || {}
            const geom = f.geometry || {}
            const osmValue = props.osm_value || ''
            const osmKey = props.osm_key || ''
            const isEdu = (osmKey === 'amenity' && eduTypes.includes(osmValue)) ||
                          (osmKey === 'building' && eduTypes.includes(osmValue))
            if (!isEdu) return
            if (props.name && geom.coordinates) {
              const city = props.city || props.county || ''
              const key = normalKey(props.name, city)
              if (!seen.has(key)) {
                seen.set(key, { name: props.name, city, lat: geom.coordinates[1], lng: geom.coordinates[0] })
              }
            }
          })
        }
      }

      const eduCategories = ['school', 'college', 'university', 'education', 'training', 'library']
      const eduKeywords = ['école', 'ecole', 'université', 'universite', 'lycée', 'lycee', 'institut', 'campus', 'faculté', 'faculte', 'ensa', 'insa', 'isen', 'iut', 'cfa', 'formation', 'supérieur', 'superieur', 'académie', 'academie', 'conservatoire', 'polytech', 'business school', 'school of']
      const retrieveResults = await Promise.all(allRetrievePromises)
      retrieveResults.forEach(rData => {
        if (rData && rData.features && rData.features[0]) {
          const f = rData.features[0]
          const coords = f.geometry.coordinates
          const props = f.properties || {}
          const name = props.name || ''
          const city = props.context?.place?.name || props.context?.locality?.name || ''
          const categories = (props.poi_category || []).map(c => c.toLowerCase())
          const nameLower = name.toLowerCase()
          const isSchool = categories.some(c => eduCategories.includes(c)) ||
                           eduKeywords.some(kw => nameLower.includes(kw))
          if (!isSchool) return
          const key = normalKey(name, city)
          if (name && !seen.has(key)) {
            seen.set(key, { name, city, lat: coords[1], lng: coords[0] })
          }
        }
      })

      let unique = Array.from(seen.values())
      if (villeCoords) {
        unique = unique.filter(r => haversineKm(villeCoords.lat, villeCoords.lng, r.lat, r.lng) < 100)
        unique.sort((a, b) =>
          haversineKm(villeCoords.lat, villeCoords.lng, a.lat, a.lng) -
          haversineKm(villeCoords.lat, villeCoords.lng, b.lat, b.lng)
        )
      }
      unique = unique.slice(0, 7)

      setProximitySuggestions(unique)
      setShowProximitySuggestions(true)
    } catch (e) {
      console.error('Erreur recherche proximité:', e)
    }
  }, [villeSelectionnee])

  const handleProximityInput = useCallback((e) => {
    const value = e.target.value
    setProximityInput(value)
    clearTimeout(proximityTimeoutRef.current)

    if (value.trim().length < 2) {
      setShowProximitySuggestions(false)
      return
    }

    proximityTimeoutRef.current = setTimeout(() => {
      searchProximitySchool(value.trim())
    }, 300)
  }, [searchProximitySchool])

  // Close proximity suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.proximity-search-wrapper')) {
        setShowProximitySuggestions(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // ========== FAVORITES ==========

  const toggleFavorite = useCallback(async (annonceId) => {
    if (!user) {
      showNotification('Connexion requise', 'Connecte-toi pour ajouter des favoris !', 'warning', '/connexion')
      return
    }

    const isFavorite = userFavoris.includes(annonceId)

    if (isFavorite) {
      const { error } = await supabaseClient
        .from('favoris')
        .delete()
        .eq('user_id', user.id)
        .eq('annonce_id', annonceId)
      if (error) {
        showNotification('Erreur', 'Erreur lors du retrait du favori', 'error')
      } else {
        setUserFavoris(prev => prev.filter(id => id !== annonceId))
      }
    } else {
      const { error } = await supabaseClient
        .from('favoris')
        .insert([{ user_id: user.id, annonce_id: annonceId }])
      if (error) {
        showNotification('Erreur', 'Erreur lors de l\'ajout du favori', 'error')
      } else {
        setUserFavoris(prev => [...prev, annonceId])
      }
    }
  }, [user, userFavoris, showNotification])

  // ========== ALERTS ==========

  const envoyerAlerte = useCallback(async (email, setMsg, setBtnDisabled) => {
    if (!email) {
      setMsg('<span style="color: #EF4444;">Merci de renseigner ton email</span>')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg('<span style="color: #EF4444;">Email invalide</span>')
      return
    }

    if (!RateLimiter.check('alerte', 3, 300000)) return

    if (setBtnDisabled) setBtnDisabled(true)

    const ville = villeSelectionnee || null
    const rythme = null

    try {
      const { error } = await supabaseClient.from('alertes').insert({
        email, ville, rythme
      })
      if (error) throw error

      try {
        await supabaseClient.functions.invoke('send-alert-email', {
          body: { email, ville, rythme }
        })
      } catch (emailErr) {
        console.warn('Email de confirmation non envoyé:', emailErr)
      }

      setMsg('<span style="color: #10B981;">C\'est noté ! Un email de confirmation t\'a été envoyé.</span>')
    } catch (e) {
      console.error('Erreur alerte:', e)
      if (e.message && e.message.includes('duplicate')) {
        setMsg('<span style="color: #E8622A;">Tu es déjà inscrit à cette alerte !</span>')
      } else {
        setMsg('<span style="color: #EF4444;">Une erreur est survenue, réessaie plus tard.</span>')
      }
    }

    if (setBtnDisabled) setBtnDisabled(false)
    setTimeout(() => setMsg(''), 5000)
  }, [villeSelectionnee])

  // ========== MODAL PROFILS ==========

  const openProfilDetail = useCallback((profilId) => {
    const profil = PROFILS_DATA[profilId]
    if (!profil) return
    setCurrentProfil(profil)
    setModalView('detail')
  }, [])

  const openConversation = useCallback(() => {
    setModalView('conversation')
    setChatMessages([])
    setChatInput('')
  }, [])

  const envoyerMessageProfil = useCallback(() => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatMessages(prev => [...prev, msg])
    setChatInput('')
    setTimeout(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
      }
    }, 50)
  }, [chatInput])

  const closeModal = useCallback(() => {
    setModalProfilsOpen(false)
    setModalView('list')
    setCurrentProfil(null)
    setChatMessages([])
    setChatInput('')
  }, [])

  // ========== RENDER HELPERS ==========

  const villeAffichee = villeSelectionnee
    ? villeSelectionnee.charAt(0).toUpperCase() + villeSelectionnee.slice(1)
    : 'ta ville'

  const hasRythme = semainesUtilisateur.length > 0
  const noResults = logementsAffiches.length === 0 && logements.length >= 0

  const villeText = villeSelectionnee
    ? ` à ${villeSelectionnee.charAt(0).toUpperCase() + villeSelectionnee.slice(1)}`
    : ''

  // ========== RENDER ==========

  return (
    <>
      {/* HERO */}
      <section className="recherche-hero">
        <div className="hero-content">
          <div className="hero-badge rch-stagger" style={{ animationDelay: '0.05s' }}>
            <img
              src="/PP-Sterny-White.png"
              alt="Sterny"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                flexShrink: 0,
                marginRight: '6px',
                verticalAlign: 'middle',
              }}
            />
            La plateforme des alternants en France
          </div>
          <h1 className="rch-stagger" style={{ animationDelay: '0.15s' }}>Trouve ton <span>logement</span></h1>
          <p className="hero-subtitle rch-stagger" style={{ animationDelay: '0.25s' }}>Flexible, meublé, adapté à ton rythme d&apos;alternance.</p>

          {/* SEARCH BAR */}
          <div className="search-bar rch-stagger" style={{ animationDelay: '0.35s' }}>
            {/* Ville */}
            <div className="search-field" style={{ overflow: 'visible', zIndex: 10 }}>
              <input
                type="text"
                ref={villeInputRef}
                value={villeInput}
                onChange={handleVilleInput}
                onBlur={handleVilleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowVilleSuggestions(false)
                    lancerRechercheVille()
                  }
                }}
                placeholder="Dans quelle ville cherches-tu ?"
                aria-label="Ville"
                autoComplete="off"
              />
              {showVilleSuggestions && villeSuggestions.length > 0 && (
                <div className="ville-suggestions" ref={villeSuggestionsRef} style={{ display: 'block' }}>
                  {villeSuggestions.map((s) => (
                    <div
                      key={s.value}
                      className="ville-suggestion-item"
                      onMouseDown={() => handleVilleSelect(s.label, s.value)}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
              {showNoMatch && (
                <div className="ville-suggestions" style={{ display: 'block' }}>
                  <div style={{ padding: '12px 16px', color: '#E8622A', fontWeight: 600, fontSize: '14px', cursor: 'default' }}>
                    STERNY arrive bient&ocirc;t dans ta ville !
                  </div>
                </div>
              )}
            </div>

            {/* Search button */}
            <button className="search-btn" aria-label="Rechercher" onClick={lancerRechercheVille}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
          </div>
          {searchError && (
            <div className="search-error-msg">{searchError}</div>
          )}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className={`recherche-main-content${noResults ? ' no-results-mode' : ''}`}>
        {/* Results header */}
        <div className="results-header">
          <div className="results-left">
            <div className="results-count">
              <strong>{logementsAffiches.length} logement{logementsAffiches.length > 1 ? 's' : ''}</strong> disponible{logementsAffiches.length > 1 ? 's' : ''}{villeText}
            </div>
          </div>
          <div className="results-right">
            <select
              className="sort-select"
              value={sortValue}
              onChange={(e) => trierLogements(e.target.value)}
            >
              <option value="" disabled>Trier par</option>
              <option value="prix-asc">Prix croissant</option>
              <option value="prix-desc">Prix décroissant</option>
              <option value="recent">Plus récent</option>
            </select>
            <button className={`btn-filtres${activeFilterCount > 0 ? ' has-filters' : ''}`} onClick={ouvrirFiltres}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="6" y1="12" x2="18" y2="12" />
                <line x1="8" y1="18" x2="16" y2="18" />
              </svg>
              Filtres
              {activeFilterCount > 0 && (
                <span className="filtres-count">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Results grid */}
        <div className="results-grid">
          {logementsAffiches.length === 0 ? (
            // No results
            hasRythme ? (
              <>
                {/* Bloc aucun résultat */}
                <div className="nr-enriched">
                  <div className="nr-full-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <h2 className="nr-full-title">Aucun logement disponible pour l&apos;instant</h2>
                  <p className="nr-full-sub">Pas de panique, de nouvelles annonces arrivent régulièrement</p>
                </div>
                {/* Bloc CTA 2 colonnes */}
                <div className="bottom-cta">
                  {/* Gauche : profils compatibles */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-avatars">
                        <div className="avatar">LM</div>
                        <div className="avatar">AC</div>
                        <div className="avatar">TR</div>
                        <span className="avatar-more">+9</span>
                      </div>
                      <p className="bottom-cta-text"><strong>12 étudiants</strong> à {villeAffichee} sont compatibles avec toi</p>
                    </div>
                    <div className="bottom-cta-buttons">
                      <button className="bottom-cta-btn" onClick={() => setModalProfilsOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Voir les profils
                      </button>
                      <Link to="/agences-partenaires" className="bottom-cta-btn bottom-cta-btn-orange" onClick={() => window.scrollTo(0, 0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Agences partenaires
                      </Link>
                    </div>
                  </div>
                  {/* Droite : alerte email */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </div>
                      <p className="bottom-cta-text">Sois notifié dès qu&apos;une annonce ou personne compatible apparaît</p>
                    </div>
                    <div className="bottom-cta-form">
                      <input
                        type="email"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmail(''); setAlertPlaceholderTop({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholderTop(''), 3000) }; envoyerAlerte(alertEmail.trim(), cb) } }}
                        placeholder={alertPlaceholderTop ? alertPlaceholderTop.text : 'ton@email.com'}
                        className={alertPlaceholderTop ? (alertPlaceholderTop.error ? 'has-msg-error' : 'has-msg-success') : ''}
                      />
                      <button onClick={() => { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmail(''); setAlertPlaceholderTop({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholderTop(''), 3000) }; envoyerAlerte(alertEmail.trim(), cb) }}>M&apos;alerter</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="nr-enriched">
                  <div className="nr-full-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <h2 className="nr-full-title">Aucun logement disponible pour l&apos;instant</h2>
                  <p className="nr-full-sub">Pas de panique, de nouvelles annonces arrivent régulièrement</p>
                </div>
                <div className="bottom-cta">
                  {/* Gauche : profils compatibles */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-avatars">
                        <div className="avatar">LM</div>
                        <div className="avatar">AC</div>
                        <div className="avatar">TR</div>
                        <span className="avatar-more">+9</span>
                      </div>
                      <p className="bottom-cta-text"><strong>12 étudiants</strong> à {villeAffichee} sont compatibles avec toi</p>
                    </div>
                    <div className="bottom-cta-buttons">
                      <button className="bottom-cta-btn" onClick={() => setModalProfilsOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Voir les profils
                      </button>
                      <Link to="/agences-partenaires" className="bottom-cta-btn bottom-cta-btn-orange" onClick={() => window.scrollTo(0, 0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Agences partenaires
                      </Link>
                    </div>
                  </div>
                  {/* Droite : alerte email */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </div>
                      <p className="bottom-cta-text">Sois notifié dès qu&apos;un logement ou une personne correspond</p>
                    </div>
                    <div className="bottom-cta-form">
                      <input
                        type="email"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmail(''); setAlertPlaceholderTop({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholderTop(''), 3000) }; envoyerAlerte(alertEmail.trim(), cb) } }}
                        placeholder={alertPlaceholderTop ? alertPlaceholderTop.text : 'ton@email.com'}
                        className={alertPlaceholderTop ? (alertPlaceholderTop.error ? 'has-msg-error' : 'has-msg-success') : ''}
                      />
                      <button onClick={() => { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmail(''); setAlertPlaceholderTop({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholderTop(''), 3000) }; envoyerAlerte(alertEmail.trim(), cb) }}>M&apos;alerter</button>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              {logementsAffiches.map(logement => {
                const svgPlaceholder = (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
                    <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
                    <circle cx="13" cy="7" r="1" fill="white" />
                    <rect x="8" y="2" width="14" height="14" rx="2" />
                  </svg>
                )

                const hasPhoto = logement.photos && logement.photos.length > 0
                const villeFormatee = getQuartier(logement.adresse, logement.ville)
                const surfaceText = logement.surface ? ` \u00B7 ${logement.surface} m\u00B2` : ''

                let matchBadge = null
                if (logement.totalCherchees > 0) {
                  if (logement.couvertes === logement.totalCherchees) {
                    matchBadge = <span className="match-badge" style={{ background: '#10b981', color: 'white' }}>✓ Couvert</span>
                  } else {
                    matchBadge = <span className="match-badge" style={{ background: '#E8622A', color: 'white' }}>{logement.couvertes}/{logement.totalCherchees} sem.</span>
                  }
                }

                const distanceBadge = (proximiteActive && logement.distance !== undefined && logement.distance < 9999)
                  ? <div className="distance-badge">{logement.distance.toFixed(1)} km</div>
                  : null

                return (
                  <Link
                    key={logement.id}
                    to={`/logement?id=${logement.id}`}
                    className="rch-card"
                  >
                    <div
                      className="rch-card-img"
                      style={hasPhoto
                        ? { backgroundImage: `url('${logement.photos[0]}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                      }
                    >
                      {!hasPhoto && svgPlaceholder}
                      {matchBadge}
                      {distanceBadge}
                    </div>
                    <div className="rch-card-body">
                      <div className="rch-card-price">{logement.prix}&euro;<span> / semaine</span></div>
                      <div className="rch-card-title">{logement.titre}</div>
                      <div className="rch-card-loc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {villeFormatee}{surfaceText}
                      </div>
                    </div>
                  </Link>
                )
              })}

              {/* Bloc bottom — social proof + alerte */}
              {hasRythme ? (
                <div className="bottom-cta">
                  {/* Gauche : profils compatibles */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-avatars">
                        <div className="avatar">LM</div>
                        <div className="avatar">AC</div>
                        <div className="avatar">TR</div>
                        <span className="avatar-more">+9</span>
                      </div>
                      <p className="bottom-cta-text"><strong>12 étudiants</strong> à {villeAffichee} sont compatibles avec toi</p>
                    </div>
                    <div className="bottom-cta-buttons">
                      <button className="bottom-cta-btn" onClick={() => setModalProfilsOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Voir les profils
                      </button>
                      <Link to="/agences-partenaires" className="bottom-cta-btn bottom-cta-btn-orange" onClick={() => window.scrollTo(0, 0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Agences partenaires
                      </Link>
                    </div>
                  </div>
                  {/* Droite : alerte email */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </div>
                      <p className="bottom-cta-text">Sois notifié dès qu&apos;une annonce ou personne compatible apparaît</p>
                    </div>
                    <div className="bottom-cta-form">
                      <input
                        type="email"
                        value={alertEmailBottom}
                        onChange={(e) => setAlertEmailBottom(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmailBottom(''); setAlertPlaceholder({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholder(''), 3000) }; envoyerAlerte(alertEmailBottom.trim(), cb) } }}
                        placeholder={alertPlaceholder ? alertPlaceholder.text : 'ton@email.com'}
                        className={alertPlaceholder ? (alertPlaceholder.error ? 'has-msg-error' : 'has-msg-success') : ''}
                      />
                      <button onClick={() => { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmailBottom(''); setAlertPlaceholder({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholder(''), 3000) }; envoyerAlerte(alertEmailBottom.trim(), cb) }}>M&apos;alerter</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bottom-cta">
                  {/* Gauche : profils compatibles */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-avatars">
                        <div className="avatar">LM</div>
                        <div className="avatar">AC</div>
                        <div className="avatar">TR</div>
                        <span className="avatar-more">+9</span>
                      </div>
                      <p className="bottom-cta-text"><strong>12 étudiants</strong> à {villeAffichee} sont compatibles avec toi</p>
                    </div>
                    <div className="bottom-cta-buttons">
                      <button className="bottom-cta-btn" onClick={() => setModalProfilsOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Voir les profils
                      </button>
                      <Link to="/agences-partenaires" className="bottom-cta-btn bottom-cta-btn-orange" onClick={() => window.scrollTo(0, 0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Agences partenaires
                      </Link>
                    </div>
                  </div>
                  {/* Droite : alerte email */}
                  <div className="bottom-cta-side">
                    <div className="bottom-cta-row-icon">
                      <div className="bottom-cta-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </div>
                      <p className="bottom-cta-text">Sois notifié dès qu&apos;un logement ou une personne correspond</p>
                    </div>
                    <div className="bottom-cta-form">
                      <input
                        type="email"
                        value={alertEmailBottom}
                        onChange={(e) => setAlertEmailBottom(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmailBottom(''); setAlertPlaceholder({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholder(''), 3000) }; envoyerAlerte(alertEmailBottom.trim(), cb) } }}
                        placeholder={alertPlaceholder ? alertPlaceholder.text : 'ton@email.com'}
                        className={alertPlaceholder ? (alertPlaceholder.error ? 'has-msg-error' : 'has-msg-success') : ''}
                      />
                      <button onClick={() => { const cb = (msg) => { const txt = msg.replace(/<[^>]*>/g, ''); const isErr = msg.includes('EF4444'); setAlertEmailBottom(''); setAlertPlaceholder({ text: txt, error: isErr }); setTimeout(() => setAlertPlaceholder(''), 3000) }; envoyerAlerte(alertEmailBottom.trim(), cb) }}>M&apos;alerter</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DRAWER OVERLAY */}
      <div className={`drawer-overlay${drawerOpen ? ' active' : ''}`} onClick={fermerFiltres} />

      {/* DRAWER FILTRES */}
      <div className={`drawer-filtres${drawerOpen ? ' active' : ''}`}>
        <div className="drawer-header">
          <h3>Filtres</h3>
          <button className="drawer-close" onClick={fermerFiltres}>&times;</button>
        </div>
        <div className="drawer-body">
          {/* Proximity */}
          <div className="filter-group">
            <h4>Proximité</h4>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '10px' }}>Trie les résultats par distance de ton école ou lieu de travail</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="proximity-search-wrapper" style={{ flex: 1 }}>
                <input
                  type="text"
                  value={proximityInput}
                  onChange={handleProximityInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setShowProximitySuggestions(false)
                      trierParProximite()
                    }
                  }}
                  placeholder="Ex: Université Rennes 2..."
                  autoComplete="off"
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#1E293B', outline: 'none', boxSizing: 'border-box' }}
                />
                {showProximitySuggestions && (
                  <div className="proximity-suggestions" style={{ display: 'block' }}>
                    {proximitySuggestions.length === 0 ? (
                      <div className="proximity-suggestion-item" style={{ color: '#6B7280', cursor: 'default' }}>Aucun établissement trouvé</div>
                    ) : (
                      proximitySuggestions.map((r, i) => (
                        <div
                          key={i}
                          className="proximity-suggestion-item"
                          onClick={() => selectProximitySuggestion(r.lat, r.lng, r.name + (r.city ? ' \u2014 ' + r.city : ''))}
                        >
                          <strong>{r.name}</strong>
                          {r.city && <small>{r.city}</small>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={trierParProximite}
                style={{ padding: '12px 16px', background: '#E8622A', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
              >
                Trier
              </button>
            </div>
            {proximityStatus && (
              <div className="proximity-status" style={{ fontSize: '13px', marginTop: '8px', minHeight: '18px' }} dangerouslySetInnerHTML={{ __html: proximityStatus }} />
            )}
          </div>

          {/* Budget & Surface */}
          <div className="filter-group">
            <h4>Budget &amp; Surface</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Budget max (&euro;/sem.)</label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Ex: 300"
                  min="0"
                  step="10"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#1E293B', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Surface min (m&sup2;)</label>
                <input
                  type="number"
                  value={surfaceMin}
                  onChange={(e) => setSurfaceMin(e.target.value)}
                  placeholder="Ex: 15"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#1E293B', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Type de logement */}
          <div className="filter-group">
            <h4>Type de logement</h4>
            {[
              { key: 'studio', label: 'Studio', countKey: 'studio' },
              { key: 't1', label: 'T1', countKey: 't1' },
              { key: 't2', label: 'T2', countKey: 't2' },
              { key: 't3', label: 'T3', countKey: 't3' },
              { key: 't4+', label: 'T4+', countKey: 't4+' },
            ].map(item => (
              <div className="checkbox-item" key={item.key}>
                <input
                  type="checkbox"
                  id={`type-${item.key}`}
                  checked={typesLogement[item.key]}
                  onChange={() => setTypesLogement(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                />
                <label htmlFor={`type-${item.key}`}>{item.label}</label>
                <span className="filter-count">({filterCounts[item.countKey]})</span>
              </div>
            ))}
          </div>

          {/* Equipements */}
          <div className="filter-group">
            <h4>Équipements</h4>
            {Object.keys(equipementsFilter).map(equip => (
              <div className={`checkbox-item${equip === 'Accessible PMR' ? ' checkbox-pmr' : ''}`} key={equip}>
                <input
                  type="checkbox"
                  id={`equip-${equip}`}
                  checked={equipementsFilter[equip]}
                  onChange={() => setEquipementsFilter(prev => ({ ...prev, [equip]: !prev[equip] }))}
                />
                <label htmlFor={`equip-${equip}`}>{equip === 'Accessible PMR' ? '♿ Accessible PMR' : equip}</label>
              </div>
            ))}
            {/* Dynamic equipments */}
            {dynamicEquipements.length > 0 && (
              <div style={{ borderTop: '1px solid #E8EAF0', margin: '8px 0', paddingTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Les plus demandés</span>
                {dynamicEquipements.map(([key, data], idx) => (
                  <div className="checkbox-item" key={key} style={{ marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      id={`equipDyn-${idx}`}
                      checked={!!dynamicEquipChecked[key]}
                      onChange={() => setDynamicEquipChecked(prev => ({ ...prev, [key]: !prev[key] }))}
                    />
                    <label htmlFor={`equipDyn-${idx}`}>{data.displayName} <span style={{ color: '#9CA3AF', fontSize: '12px' }}>({data.count})</span></label>
                  </div>
                ))}
              </div>
            )}
            {/* Recherche équipement */}
            <div className="equip-search">
              <input
                type="text"
                value={equipSearchQuery}
                onChange={(e) => {
                  const q = e.target.value
                  setEquipSearchQuery(q)
                  if (q.trim().length < 2) { setEquipSearchResults([]); return }
                  const matches = logements.reduce((acc, l) => {
                    if (!l.equipements) return acc
                    l.equipements.forEach(eq => {
                      if (eq.toLowerCase().includes(q.toLowerCase()) && !acc.includes(eq)) acc.push(eq)
                    })
                    return acc
                  }, [])
                  setEquipSearchResults(matches.slice(0, 5))
                }}
                placeholder="Rechercher un équipement..."
              />
              {equipSearchResults.length > 0 && (
                <div className="equip-search-results">
                  {equipSearchResults.map(eq => (
                    <button key={eq} className="equip-search-item" onClick={() => {
                      setEquipementsFilter(prev => ({ ...prev, [eq]: true }))
                      setEquipSearchQuery('')
                      setEquipSearchResults([])
                    }}>{eq}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="clear-filters" onClick={reinitialiserFiltres}>Tout effacer</button>
          <button className="btn-apply" onClick={() => { filtrerLogements(); fermerFiltres() }}>Appliquer</button>
        </div>
      </div>

      {/* NOTIFICATION MODAL */}
      <div className={`custom-notification${notification.show ? ' show' : ''}`}>
        <div className="notification-content">
          <div
            className="notification-icon"
            style={{
              background: notification.type === 'error' ? '#DC2626' : notification.type === 'warning' ? '#1E293B' : '#E8622A',
              color: 'white'
            }}
          >
            {notification.type === 'error' ? '\u2715' : notification.type === 'warning' ? '!' : '\u2713'}
          </div>
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }} />
          <button className="notification-btn" onClick={closeNotification}>OK</button>
        </div>
      </div>

      {/* MODAL PROFILS COMPATIBLES */}
      <div
        className={`modal-profils-overlay${modalProfilsOpen ? ' active' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
      >
        <div className={`modal-profils${modalView === 'conversation' ? ' conversation-mode' : ''}`}>
          {/* LIST VIEW */}
          {modalView === 'list' && (
            <>
              <div className="modal-profils-header">
                <h3>{Object.keys(PROFILS_DATA).length} profils compatibles</h3>
                <button className="modal-close" onClick={closeModal}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <p className="modal-profils-subtitle">Leur rythme matche avec le tien</p>
              <div className="modal-profils-list">
                {Object.entries(PROFILS_DATA).map(([id, profil]) => (
                  <div className="mp-card" key={id} onClick={() => openProfilDetail(id)}>
                    <div className="mp-avatar">{profil.initials}</div>
                    <div className="mp-info">
                      <span className="mp-name">{profil.name}</span>
                      <span className="mp-rythme-chip">{profil.rythme}</span>
                    </div>
                    <span className="mp-voir">Voir</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* DETAIL VIEW */}
          {modalView === 'detail' && currentProfil && (
            <div className="profil-detail visible">
              <div className="profil-detail-topbar">
                <button className="profil-back" onClick={() => setModalView('list')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button className="modal-close-detail" onClick={closeModal}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="profil-detail-header">
                <div className="profil-detail-avatar">{currentProfil.initials}</div>
                <h3 className="profil-detail-name">{currentProfil.name}</h3>
                <span className="profil-detail-status">{currentProfil.genre === 'F' ? 'ÉTUDIANTE' : 'ÉTUDIANT'}</span>
              </div>
              <div className="profil-detail-content">
                <div className="profil-detail-info">
                  <div className="profil-info-item">
                    <span className="profil-info-label">Âge</span>
                    <span className="profil-info-value">{currentProfil.age} ans</span>
                  </div>
                  <div className="profil-info-item">
                    <span className="profil-info-label">École</span>
                    <span className="profil-info-value">{currentProfil.ecole}</span>
                  </div>
                  <div className="profil-info-item">
                    <span className="profil-info-label">Entreprise</span>
                    <span className="profil-info-value">{currentProfil.entreprise}</span>
                  </div>
                  <div className="profil-info-item">
                    <span className="profil-info-label">Ville recherchée</span>
                    <span className="profil-info-value">{currentProfil.villeRecherche}</span>
                  </div>
                  <div className="profil-info-item">
                    <span className="profil-info-label">Type</span>
                    <span className="profil-info-value">{currentProfil.type}</span>
                  </div>
                  <div className="profil-info-item">
                    <span className="profil-info-label">Rythme</span>
                    <span className="profil-info-value">{currentProfil.rythme}</span>
                  </div>
                </div>
              </div>
              <div className="profil-detail-footer">
                <button className="btn-envoyer-message" onClick={openConversation}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  Envoyer un message
                </button>
              </div>
            </div>
          )}

          {/* CONVERSATION VIEW */}
          {modalView === 'conversation' && currentProfil && (
            <div className="rch-conversation" style={{ display: 'flex' }}>
              <div className="rch-chat-header">
                <button className="rch-chat-back" onClick={() => setModalView('detail')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <div className="rch-chat-contact">
                  <div className="rch-chat-avatar">{currentProfil.initials}</div>
                  <div className="rch-chat-user-info">
                    <span className="rch-chat-name">{currentProfil.name}</span>
                    <span className="rch-chat-status">{currentProfil.genre === 'F' ? 'ÉTUDIANTE' : 'ÉTUDIANT'}</span>
                  </div>
                </div>
                <button className="rch-chat-close" onClick={closeModal}>&times;</button>
              </div>
              <div className="rch-chat-body">
                <div className="rch-chat-messages" ref={chatMessagesRef}>
                  {chatMessages.length === 0 ? (
                    <div className="rch-chat-empty">Envoie ton premier message !</div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="chat-msg sent">
                        <div className="chat-bubble">{msg}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="rch-chat-input">
                  <textarea
                    className="rch-chat-textarea"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        envoyerMessageProfil()
                      }
                    }}
                    placeholder="Ecris ton message..."
                    rows="1"
                  />
                  <button className="rch-chat-send" onClick={envoyerMessageProfil} disabled={!chatInput.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'invitation visiteur non-connecté (conv 55) */}
      {!user && inviteOpen && <InvitationModal open onClose={() => setInviteOpen(false)} />}
    </>
  )
}
