import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { VILLES_DISPONIBLES } from '../../data/villes-lancement'
import './HomePage.css'

/* ── Static test listings data ── */
const CITY_LISTINGS = {
  rennes: {
    name: 'Rennes',
    listings: [
      { price: '320', title: 'Studio meublé - Rennes Centre', loc: 'Quartier Sainte-Anne', badge: 'available', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=540&h=360&fit=crop' },
      { price: '280', title: 'T2 lumineux proche campus', loc: 'Villejean', badge: 'available', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=540&h=360&fit=crop' },
      { price: '240', title: 'Chambre en colocation', loc: 'Thabor', badge: 'available', img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=540&h=360&fit=crop' },
      { price: '295', title: 'Studio cosy République', loc: 'République', badge: 'soon', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=540&h=360&fit=crop' },
      { price: '350', title: 'T3 meublé Beaulieu', loc: 'Beaulieu', badge: 'available', img: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=540&h=360&fit=crop' },
      { price: '275', title: 'Studio proche gare', loc: 'Gare Sud', badge: 'available', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=540&h=360&fit=crop' },
      { price: '230', title: 'Chambre coloc La Poterie', loc: 'La Poterie', badge: 'soon', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=540&h=360&fit=crop' }
    ]
  },
  nantes: {
    name: 'Nantes',
    listings: [
      { price: '310', title: 'Studio design centre-ville', loc: '\u00CEle de Nantes', badge: 'available', img: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=540&h=360&fit=crop' },
      { price: '340', title: 'T2 meublé avec balcon', loc: 'Graslin', badge: 'available', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=540&h=360&fit=crop' },
      { price: '250', title: 'Colocation proche fac', loc: 'Chantenay', badge: 'soon', img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=540&h=360&fit=crop' },
      { price: '290', title: 'Studio moderne équipé', loc: 'Talensac', badge: 'available', img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=540&h=360&fit=crop' },
      { price: '360', title: 'Loft quartier Commerce', loc: 'Commerce', badge: 'available', img: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=540&h=360&fit=crop' },
      { price: '265', title: 'T2 calme à Doulon', loc: 'Doulon', badge: 'soon', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=540&h=360&fit=crop' },
      { price: '330', title: 'Studio cosy Bouffay', loc: 'Bouffay', badge: 'available', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=540&h=360&fit=crop' }
    ]
  },
  brest: {
    name: 'Brest',
    listings: [
      { price: '220', title: 'Studio vue mer Recouvrance', loc: 'Recouvrance', badge: 'available', img: 'https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=540&h=360&fit=crop' },
      { price: '260', title: 'T2 lumineux centre-ville', loc: 'Siam', badge: 'available', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=540&h=360&fit=crop' },
      { price: '190', title: 'Chambre meublée calme', loc: 'Saint-Marc', badge: 'soon', img: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=540&h=360&fit=crop' },
      { price: '245', title: 'T2 calme avec balcon', loc: 'Lamb\u00e9zellec', badge: 'available', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=540&h=360&fit=crop' },
      { price: '185', title: 'Colocation étudiante', loc: 'Quatre Moulins', badge: 'soon', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=540&h=360&fit=crop' },
      { price: '310', title: 'T3 spacieux Bellevue', loc: 'Bellevue', badge: 'available', img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=540&h=360&fit=crop' },
      { price: '205', title: 'Studio moderne r\u00e9nov\u00e9', loc: 'Europe', badge: 'soon', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=540&h=360&fit=crop' }
    ]
  },
  'saint-brieuc': {
    name: 'Saint-Brieuc',
    listings: [
      { price: '200', title: 'Studio centre historique', loc: 'Centre-ville', badge: 'available', img: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=540&h=360&fit=crop' },
      { price: '230', title: 'T2 rénové proche gare', loc: 'Gare', badge: 'available', img: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=540&h=360&fit=crop' },
      { price: '270', title: 'T3 familial Cesson', loc: 'Cesson', badge: 'soon', img: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=540&h=360&fit=crop' },
      { price: '180', title: 'Chambre meubl\u00e9e \u00e9tudiante', loc: 'Robien', badge: 'available', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=540&h=360&fit=crop' },
      { price: '195', title: 'Studio lumineux Gou\u00e9dic', loc: 'Gou\u00e9dic', badge: 'soon', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=540&h=360&fit=crop' },
      { price: '190', title: 'Colocation proche IUT', loc: 'Ploufragan', badge: 'available', img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=540&h=360&fit=crop' }
    ]
  },
  quimper: {
    name: 'Quimper',
    listings: [
      { price: '210', title: 'Studio charme vieille ville', loc: 'Centre historique', badge: 'available', img: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=540&h=360&fit=crop' },
      { price: '240', title: "T2 meubl\u00e9 bord de l'Odet", loc: 'Locmaria', badge: 'soon', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=540&h=360&fit=crop' },
      { price: '185', title: "Chambre chez l'habitant", loc: 'Ergu\u00e9-Armel', badge: 'available', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=540&h=360&fit=crop' },
      { price: '295', title: 'T3 jardin Penhars', loc: 'Penhars', badge: 'soon', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=540&h=360&fit=crop' },
      { price: '215', title: 'Studio r\u00e9nov\u00e9 Moulin Vert', loc: 'Moulin Vert', badge: 'available', img: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=540&h=360&fit=crop' },
      { price: '195', title: 'Colocation proche campus', loc: "Creac'h Gwen", badge: 'soon', img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=540&h=360&fit=crop' }
    ]
  },
  lorient: {
    name: 'Lorient',
    listings: [
      { price: '215', title: 'Studio port de plaisance', loc: 'Centre', badge: 'available', img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=540&h=360&fit=crop' },
      { price: '250', title: 'T2 rénové lumineux', loc: 'Merville', badge: 'available', img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=540&h=360&fit=crop' },
      { price: '175', title: 'Chambre meubl\u00e9e port', loc: 'Port-Louis', badge: 'soon', img: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=540&h=360&fit=crop' },
      { price: '320', title: 'T3 vue rade Lanester', loc: 'Lanester', badge: 'available', img: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=540&h=360&fit=crop' },
      { price: '190', title: 'Colocation Kerv\u00e9nanec', loc: 'Kerv\u00e9nanec', badge: 'soon', img: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=540&h=360&fit=crop' },
      { price: '225', title: 'Studio Nouvelle Ville', loc: 'Nouvelle Ville', badge: 'available', img: 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=540&h=360&fit=crop' }
    ]
  },
  vannes: {
    name: 'Vannes',
    listings: [
      { price: '260', title: 'Studio intra-muros', loc: 'Vieille ville', badge: 'available', img: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=540&h=360&fit=crop' },
      { price: '210', title: 'Colocation proche port', loc: 'Conleau', badge: 'soon', img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=540&h=360&fit=crop' },
      { price: '275', title: 'T2 lumineux S\u00e9n\u00e9', loc: 'S\u00e9n\u00e9', badge: 'available', img: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=540&h=360&fit=crop' },
      { price: '195', title: 'Chambre calme M\u00e9nimur', loc: 'M\u00e9nimur', badge: 'soon', img: 'https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=540&h=360&fit=crop' },
      { price: '340', title: 'T3 r\u00e9sidence Tohannic', loc: 'Tohannic', badge: 'available', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=540&h=360&fit=crop' },
      { price: '230', title: 'Studio moderne gare', loc: 'Gare', badge: 'soon', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=540&h=360&fit=crop' }
    ]
  },
  'saint-malo': {
    name: 'Saint-Malo',
    listings: [
      { price: '280', title: 'Studio vue remparts', loc: 'Intra-muros', badge: 'available', img: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=540&h=360&fit=crop' },
      { price: '255', title: 'T2 proche plage du Sillon', loc: 'Param\u00e9', badge: 'soon', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=540&h=360&fit=crop' },
      { price: '240', title: 'Chambre vue mer Roth\u00e9neuf', loc: 'Roth\u00e9neuf', badge: 'available', img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=540&h=360&fit=crop' },
      { price: '350', title: 'T3 familial Saint-Servan', loc: 'Saint-Servan', badge: 'soon', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=540&h=360&fit=crop' },
      { price: '205', title: 'Colocation Courtoisville', loc: 'Courtoisville', badge: 'available', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=540&h=360&fit=crop' },
      { price: '265', title: 'Studio cosy proche gare', loc: 'Gare', badge: 'soon', img: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=540&h=360&fit=crop' }
    ]
  },
  fougeres: {
    name: 'Fougères',
    listings: [
      { price: '175', title: 'Studio meublé centre', loc: 'Centre-ville', badge: 'available', img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=540&h=360&fit=crop' },
      { price: '210', title: 'T2 r\u00e9nov\u00e9 ch\u00e2teau', loc: 'Quartier du Ch\u00e2teau', badge: 'soon', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=540&h=360&fit=crop' },
      { price: '155', title: 'Chambre meubl\u00e9e calme', loc: 'Bonabry', badge: 'available', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=540&h=360&fit=crop' },
      { price: '165', title: 'Colocation \u00e9tudiante', loc: 'Rill\u00e9', badge: 'soon', img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=540&h=360&fit=crop' },
      { price: '250', title: 'T3 spacieux avec jardin', loc: 'La For\u00eat', badge: 'available', img: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=540&h=360&fit=crop' },
      { price: '185', title: 'Studio proche gare', loc: 'Gare', badge: 'soon', img: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=540&h=360&fit=crop' }
    ]
  },
  vitre: {
    name: 'Vitré',
    listings: [
      { price: '165', title: 'Studio cosy médiéval', loc: 'Centre historique', badge: 'available', img: 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=540&h=360&fit=crop' },
      { price: '220', title: 'T2 vue ch\u00e2teau', loc: 'Le Rachapt', badge: 'soon', img: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=540&h=360&fit=crop' },
      { price: '150', title: 'Chambre meubl\u00e9e gare', loc: 'Gare', badge: 'available', img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=540&h=360&fit=crop' },
      { price: '160', title: 'Colocation \u00e9tudiante', loc: 'Saint-Martin', badge: 'soon', img: 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=540&h=360&fit=crop' },
      { price: '280', title: 'T3 jardin clos', loc: 'Les Tertres Noirs', badge: 'available', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=540&h=360&fit=crop' },
      { price: '175', title: 'Studio lumineux Beauregard', loc: 'Beauregard', badge: 'soon', img: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=540&h=360&fit=crop' }
    ]
  }
}

/* ── Location pin SVG (reused in cards) ── */
function LocationPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/* ── Chevron right SVG ── */
function ChevronRight({ size = 16, strokeWidth = 2.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/* ── Capitalize words helper ── */
function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, (match) => match.toUpperCase())
}

/* ══════════════════════════════════════════
   CITY SECTION COMPONENT (carousel row)
   ══════════════════════════════════════════ */
function CitySection({ cityKey, cityData }) {
  const scrollRef = useRef(null)

  /* Drag-scroll for carousels */
  useEffect(() => {
    const carousel = scrollRef.current
    if (!carousel) return

    let isDown = false
    let startX
    let scrollL

    const onMouseDown = (e) => {
      isDown = true
      carousel.classList.add('grabbing')
      startX = e.pageX - carousel.offsetLeft
      scrollL = carousel.scrollLeft
      e.preventDefault()
    }
    const onMouseUp = () => {
      if (!isDown) return
      isDown = false
      carousel.classList.remove('grabbing')
    }
    const onMouseMove = (e) => {
      if (!isDown) return
      e.preventDefault()
      carousel.scrollLeft = scrollL - (e.pageX - carousel.offsetLeft - startX) * 1.5
    }

    carousel.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    carousel.addEventListener('mousemove', onMouseMove)

    return () => {
      carousel.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      carousel.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className="city-section" data-city={cityKey}>
      <div className="city-section-header">
        <h2>Logements à <span>{cityData.name}</span></h2>
        <Link to={`/recherche?ville=${cityKey}`} className="city-see-all">
          Tout voir <ChevronRight />
        </Link>
      </div>
      <div className="city-scroll-wrapper">
        <div className="city-scroll-row" ref={scrollRef}>
          {cityData.listings.map((l, i) => (
            <Link className="lgt-card" to={`/recherche?ville=${cityKey}`} key={i}>
              <img className="lgt-card-img" src={l.img} alt={l.title} loading="lazy" />
              <div className="lgt-card-body">
                <div className="lgt-card-price">{l.price}&euro; <small>/ semaine</small></div>
                <div className="lgt-card-title">{l.title}</div>
                <div className="lgt-card-loc"><LocationPin /> {l.loc}</div>
                <span className={`lgt-card-badge ${l.badge === 'available' ? 'available' : 'soon'}`}>
                  {l.badge === 'available' ? 'Disponible maintenant' : `Disponible dans ${(i % 3) + 2} semaines`}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 90, background: 'linear-gradient(to right, transparent, #F4F5F7)', pointerEvents: 'none', zIndex: 5 }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   HOMEPAGE COMPONENT
   ══════════════════════════════════════════ */
export default function HomePage() {
  const navigate = useNavigate()

  /* ── Search bar state ── */
  const [villeInput, setVilleInput] = useState('')
  const [villeSelectionnee, setVilleSelectionnee] = useState('')
  const [villeSuggestions, setVilleSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showNoMatch, setShowNoMatch] = useState(false)

  const [villeMessage, setVilleMessage] = useState('')
  const [showVilleMessage, setShowVilleMessage] = useState(false)
  const [searchError, setSearchError] = useState('')

  /* Error highlight refs */
  const villeInputRef = useRef(null)

  /* ── Ville autocomplete handler ── */
  const handleVilleInput = useCallback((e) => {
    const raw = e.target.value
    const capitalized = capitalizeWords(raw)
    setVilleInput(capitalized)
    setVilleSelectionnee('')
    setShowVilleMessage(false)

    const query = capitalized.trim().toLowerCase()
    if (query.length === 0) {
      setShowSuggestions(false)
      setShowNoMatch(false)
      setVilleSuggestions([])
      return
    }

    const matches = Object.keys(VILLES_DISPONIBLES).filter(v =>
      v.toLowerCase().startsWith(query)
    )

    if (matches.length > 0) {
      setVilleSuggestions(matches)
      setShowSuggestions(true)
      setShowNoMatch(false)
    } else {
      setVilleSuggestions([])
      setShowSuggestions(false)
      if (query.length >= 2) {
        setShowNoMatch(true)
      } else {
        setShowNoMatch(false)
      }
    }
  }, [])

  const selectVille = useCallback((villeName) => {
    const slug = VILLES_DISPONIBLES[villeName]
    setVilleInput(villeName)
    setVilleSelectionnee(slug)
    setShowSuggestions(false)
    setShowNoMatch(false)
    setShowVilleMessage(false)
    // Clic sur une suggestion = lance la recherche directement (même navigation que la loupe).
    // On navigue avec le slug cliqué, pas l'état villeSelectionnee (mise à jour asynchrone).
    const params = new URLSearchParams()
    params.set('ville', slug)
    navigate(`/recherche?${params.toString()}`)
  }, [navigate])

  const handleVilleBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false)
      setShowNoMatch(false)
      const val = villeInput.trim()
      if (val && !villeSelectionnee) {
        const exactMatch = Object.keys(VILLES_DISPONIBLES).find(v =>
          v.toLowerCase() === val.toLowerCase()
        )
        if (exactMatch) {
          setVilleInput(exactMatch)
          setVilleSelectionnee(VILLES_DISPONIBLES[exactMatch])
        }
      }
    }, 200)
  }, [villeInput, villeSelectionnee])

  /* ── Highlight error ── */
  const highlightError = useCallback((ref) => {
    if (!ref?.current) return
    const el = ref.current
    el.style.borderColor = '#ff6b6b'
    el.style.animation = 'shake 0.4s ease'
    setTimeout(() => {
      el.style.borderColor = ''
      el.style.animation = ''
    }, 2000)
  }, [])

  /* ── Search submit ── */
  const rechercher = useCallback(() => {
    setSearchError('')

    // Résolution du slug : soit la ville a été sélectionnée dans la liste,
    // soit l'utilisateur a tapé le nom exact sans cliquer sur une suggestion
    // (résolution de secours — même logique que le commentaire de selectVille :
    // on ne dépend pas de villeSelectionnee mis à jour de façon asynchrone).
    let slug = villeSelectionnee
    if (!slug) {
      const val = villeInput.trim()
      if (val) {
        const exactMatch = Object.keys(VILLES_DISPONIBLES).find(v =>
          v.toLowerCase() === val.toLowerCase()
        )
        if (exactMatch) {
          slug = VILLES_DISPONIBLES[exactMatch]
          // Cohérence d'affichage si l'utilisateur revient sur le champ.
          setVilleInput(exactMatch)
          setVilleSelectionnee(slug)
        }
      }
    }

    // Conv 55 — la ville seule suffit à lancer la recherche (type/rythme optionnels).
    // Erreur seulement si AUCUNE résolution n'a été possible (ni state, ni texte exact).
    if (!slug) {
      highlightError(villeInputRef)
      setSearchError('Choisis une ville pour lancer ta recherche')
      setTimeout(() => setSearchError(''), 3000)
      return
    }

    // On navigue avec le slug résolu, pas l'état villeSelectionnee (mise à jour asynchrone).
    const params = new URLSearchParams()
    params.set('ville', slug)

    navigate(`/recherche?${params.toString()}`)
  }, [villeSelectionnee, villeInput, navigate, highlightError])

  /* ── Handle Enter key in search bar ── */
  const handleSearchKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false)
      rechercher()
    }
  }, [rechercher])

  return (
    <>
      {/* ===== 1. HERO ===== */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge hp-stagger" style={{ animationDelay: '0.05s' }}>
            <img
              src="/PP-Sterny-White.png"
              alt="Sterny"
              style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0, marginRight: 3, verticalAlign: 'middle' }}
            />
            LA plateforme des alternants en France
          </div>
          <h1 className="hp-stagger" style={{ animationDelay: '0.15s' }}>Le logement pens&eacute;<br />pour ton <span>alternance</span></h1>
          <p className="hero-subtitle hp-stagger" style={{ animationDelay: '0.25s' }}>Flexible, meubl&eacute;, adapt&eacute; &agrave; ton rythme.</p>

          {/* BARRE DE RECHERCHE */}
          <div className="search-bar hp-stagger" style={{ animationDelay: '0.35s' }}>
            {/* Ville field */}
            <div className="search-field" style={{ overflow: 'visible', zIndex: 10 }}>
              <input
                type="text"
                ref={villeInputRef}
                value={villeInput}
                onChange={handleVilleInput}
                onBlur={handleVilleBlur}
                onKeyPress={handleSearchKeyPress}
                placeholder="Dans quelle ville cherches-tu ?"
                autoComplete="off"
              />
              {showSuggestions && villeSuggestions.length > 0 && (
                <div className="ville-suggestions" style={{ display: 'block' }}>
                  {villeSuggestions.map(v => (
                    <div
                      key={v}
                      className="ville-suggestion-item"
                      onMouseDown={() => selectVille(v)}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              )}
              {showNoMatch && (
                <div className="ville-suggestions" style={{ display: 'block' }}>
                  <div style={{ padding: '12px 16px 12px 36px', color: '#E8622A', fontWeight: 600, fontSize: 14, cursor: 'default' }}>
                    STERNY arrive bient&ocirc;t dans ta ville !
                  </div>
                </div>
              )}
            </div>

            {/* Conv 55 — barre ville seule : champs TYPE D'ALTERNANCE + Rythme + Dates
                retirés de l'UI (pattern abstrait = fiction, VISION §29). États/handlers
                conservés volontairement (nettoyage = commit chore ultérieur). */}

            <button className="search-btn" onClick={rechercher} aria-label="Rechercher">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
          </div>

          {showVilleMessage && (
            <div id="villeMessage" className="ville-message">{villeMessage}</div>
          )}
          {searchError && (
            <div className="search-error-msg">{searchError}</div>
          )}
        </div>
      </section>

      {/* ===== 2. BANDE DE REASSURANCE ===== */}
      <section className="reassurance">
        <div className="reassurance-inner">
          <div className="reassurance-item">
            <div className="reassurance-icon orange" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, minWidth: 44, padding: 0, flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: 0, position: 'relative', left: 2 }}>
                <path d="M17 6C15.5 4.8 13.5 4 11.5 4C7.4 4 4 7.4 4 11.5C4 15.6 7.4 19 11.5 19C13.5 19 15.5 18.2 17 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="2" y1="9.5" x2="13" y2="9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="2" y1="13.5" x2="13" y2="13.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="reassurance-text">Sans frais d'agence<small>Crée ton annonce gratuitement</small></div>
          </div>
          <div className="reassurance-item">
            <div className="reassurance-icon navy">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div className="reassurance-text">Flexible semaine par semaine<small>Tu paies que quand tu es l&agrave;</small></div>
          </div>
          <div className="reassurance-item">
            <div className="reassurance-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            </div>
            <div className="reassurance-text">V&eacute;rifi&eacute; par STERNY<small>Identit&eacute; et logements contr&ocirc;l&eacute;s</small></div>
          </div>
        </div>
      </section>

      {/* ===== 3. LOGEMENTS PAR VILLE ===== */}
      <section className="city-sections">
        {Object.entries(CITY_LISTINGS).map(([key, data]) => (
          <CitySection key={key} cityKey={key} cityData={data} />
        ))}
      </section>

      {/* ===== 4. SECTION CONFIANCE ===== */}
      <section className="trust-section">
        <div className="trust-header">
          <h2>Pourquoi choisir STERNY ?</h2>
          <p>Une plateforme con&ccedil;ue pour simplifier la vie des alternants</p>
        </div>

        <div className="trust-grid">
          <div className="trust-card">
            <div className="trust-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            </div>
            <h3>Logements v&eacute;rifi&eacute;s</h3>
            <p>Chaque annonce est v&eacute;rifi&eacute;e avant publication. Photos r&eacute;elles, descriptions conformes, propri&eacute;taires contr&ocirc;l&eacute;s.</p>
          </div>
          <div className="trust-card">
            <div className="trust-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <h3>Adapt&eacute; &agrave; ton rythme</h3>
            <p>R&eacute;serve semaine par semaine selon ton planning entreprise/&eacute;cole. Plus de loyer les semaines o&ugrave; tu n'es pas l&agrave;.</p>
          </div>
          <div className="trust-card">
            <div className="trust-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h3>100% en ligne</h3>
            <p>Candidature, contrat et paiement d&eacute;mat&eacute;rialis&eacute;s. Pas besoin de te d&eacute;placer pour trouver ton logement.</p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="testimonials">
          <div className="testimonial">
            <div className="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-text">"J'ai trouv&eacute; mon studio &agrave; Rennes en 2 jours. Le syst&egrave;me semaine par semaine est parfait pour mon alternance 2/1."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">L</div>
              <div>
                <div className="testimonial-name">Lucas M.</div>
                <div className="testimonial-role">Alternant en informatique, Rennes</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <div className="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-text">"Enfin une plateforme qui comprend le quotidien d'un alternant. Plus de double loyer, merci STERNY !"</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">S</div>
              <div>
                <div className="testimonial-name">Sarah K.</div>
                <div className="testimonial-role">Alternante en marketing, Nantes</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <div className="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-text">"Mon propri&eacute;taire est super et tout s'est fait en ligne. L'inscription a pris 5 minutes, top !"</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">A</div>
              <div>
                <div className="testimonial-name">Amine B.</div>
                <div className="testimonial-role">Alternant en commerce, Brest</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. SECTION PROPRIETAIRES ===== */}
      <section className="proprio-section">
        <div className="proprio-inner">
          <div className="proprio-text">
            <h2>Vous &ecirc;tes propri&eacute;taire ?</h2>
            <p>Proposez votre logement aux &eacute;tudiants en alternance et b&eacute;n&eacute;ficiez d'un revenu r&eacute;gulier sans engagement long terme.</p>
            <ul className="proprio-perks">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Publication gratuite de votre annonce
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Locataires v&eacute;rifi&eacute;s par STERNY
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Paiements s&eacute;curis&eacute;s chaque mois
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Gestion simplifi&eacute;e 100% en ligne
              </li>
            </ul>
            <Link to="/inscription" className="btn-cta">
              Proposer mon logement <ChevronRight />
            </Link>
          </div>
          <div className="proprio-visual">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
        </div>
      </section>
    </>
  )
}
