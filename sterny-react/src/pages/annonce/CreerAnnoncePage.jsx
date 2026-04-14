import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { validateAddress } from '../../utils/addressVerification'
import Cropper from 'cropperjs'
import './CreerAnnoncePage.css'

function CaSelect({ value, onChange, options, placeholder, className, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => o.value === value)

  const updateOpen = (val) => {
    setOpen(val)
    if (onOpenChange) onOpenChange(val)
  }

  const handleBlur = (e) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) updateOpen(false)
  }

  return (
    <div className={`ca-select ${className || ''}`} ref={ref} tabIndex={-1} onBlur={handleBlur}>
      <div className={`ca-select-trigger${!selected ? ' ca-placeholder' : ''}`} onClick={() => updateOpen(!open)}>
        <span>{selected ? selected.label : placeholder}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1l5 5 5-5" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div className="ca-select-dropdown">
          {options.map(o => (
            <div key={o.value} className={`ca-select-option${o.value === value ? ' selected' : ''}`} onMouseDown={() => { onChange(o.value); updateOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==========================================
// CONSTANTS
// ==========================================

const CODE_POSTAL_VILLE = {
  '35000': 'Rennes', '35200': 'Rennes', '35700': 'Rennes',
  '44000': 'Nantes', '44100': 'Nantes', '44200': 'Nantes', '44300': 'Nantes',
  '29200': 'Brest', '29000': 'Quimper', '56100': 'Lorient',
  '56000': 'Vannes', '35400': 'Saint-Malo', '22000': 'Saint-Brieuc',
  '35300': 'Fougères', '35500': 'Vitré'
}

const MOTS_INTERDITS = [
  'connard', 'connasse', 'enculé', 'enculer', 'putain', 'pute', 'salope', 'salaud',
  'merde', 'nique', 'niquer', 'ntm', 'fdp', 'tg', 'ta gueule', 'ferme ta gueule',
  'bâtard', 'batard', 'fils de pute', 'pd', 'tapette', 'gogol', 'débile', 'abruti',
  'crétin', 'ordure', 'pourriture', 'sous-merde', 'enfoiré',
  'sexe', 'escort', 'massage sensuel', 'plan cul', 'nude', 'onlyfans', 'webcam',
  'rencontre coquine', 'call girl', 'gigolo',
  'bitcoin', 'crypto', 'investissement garanti', 'gagner de l\'argent facilement',
  'cliquez ici', 'offre exceptionnelle', 'telegram', 'whatsapp.me',
  'cannabis', 'weed', 'drogue', 'dealer', 'shit', 'coke', 'cocaïne',
  'sale arabe', 'sale noir', 'sale blanc', 'sale juif', 'racaille', 'nègre'
]

const PATTERNS_SUSPECTS = [
  /https?:\/\/(?!sterny\.|localhost)/i,
  /t\.me\//i, /wa\.me\//i,
  /bit\.ly|tinyurl|shorturl/i,
  /\b\d{10}\b/,
  /(?:0|\+33)\s*[1-9](?:[\s.-]*\d{2}){4}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /(.)\1{5,}/
]

const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const joursNoms = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toLocalISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateForInput(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function parseDate(dateStr) {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const day = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const year = parseInt(parts[2])
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2020 || year > 2100) return null
  return new Date(year, month, day)
}

function capitalizeAddress(str) {
  const petitsMots = ['rue', 'avenue', 'av', 'boulevard', 'bd', 'blvd', 'place', 'allée', 'impasse', 'chemin', 'passage', 'cours', 'quai', 'route', 'de', 'du', 'la', 'le', 'les', 'des', 'au', 'aux', 'et', 'en']
  return str.replace(/\S+/g, function (mot, index) {
    if (/^[lLdD]'/.test(mot)) {
      return mot.charAt(0).toLowerCase() + "'" + mot.charAt(2).toUpperCase() + mot.slice(3).toLowerCase()
    }
    if (index === 0 && /^\d/.test(mot)) return mot
    if (index > 0 && petitsMots.includes(mot.toLowerCase())) return mot.toLowerCase()
    return mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase()
  })
}

function verifierContenuTexte(texte, nomChamp) {
  if (!texte || texte.trim().length === 0) return { valide: true, message: '' }
  const texteLower = texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const mot of MOTS_INTERDITS) {
    const motNormalise = mot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (texteLower.includes(motNormalise)) {
      return { valide: false, message: `Le champ "${nomChamp}" contient du contenu inapproprié. Merci de rester respectueux et pertinent.` }
    }
  }
  for (const pattern of PATTERNS_SUSPECTS) {
    if (pattern.test(texte)) {
      return { valide: false, message: `Le champ "${nomChamp}" contient des éléments non autorisés (liens, numéros de téléphone ou emails). Les échanges de coordonnées se font via la messagerie STERNY.` }
    }
  }
  const lettres = texte.replace(/[^a-zA-ZÀ-ÿ]/g, '')
  if (lettres.length > 10) {
    const majuscules = lettres.replace(/[^A-ZÀ-Ý]/g, '').length
    if (majuscules / lettres.length > 0.7) {
      return { valide: false, message: `Le champ "${nomChamp}" contient trop de majuscules. Merci d'écrire normalement.` }
    }
  }
  return { valide: true, message: '' }
}

function formatEtage(numero) {
  if (!numero || numero === '') return null
  const num = parseInt(numero)
  if (isNaN(num)) return null
  if (num === 0) return 'Rez-de-chaussée'
  if (num === 1) return '1er étage'
  return num + 'ème étage'
}

// PDF date extraction helpers
function findDatesInText(text) {
  if (!text || text.length < 10) return null
  const moisMap = {
    'janvier': '01', 'janv': '01', 'fevrier': '02', 'février': '02', 'fev': '02', 'fév': '02',
    'mars': '03', 'avril': '04', 'avr': '04', 'mai': '05', 'juin': '06',
    'juillet': '07', 'juil': '07', 'aout': '08', 'août': '08',
    'septembre': '09', 'sept': '09', 'sep': '09', 'octobre': '10', 'oct': '10',
    'novembre': '11', 'nov': '11', 'decembre': '12', 'décembre': '12', 'dec': '12', 'déc': '12'
  }
  const tousLesMois = Object.keys(moisMap).join('|')
  const foundDates = []
  let match

  const dateRegex = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g
  while ((match = dateRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3]
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31 && parseInt(year) >= 2024 && parseInt(year) <= 2030) {
      foundDates.push({ dateStr: `${day}/${month}/${year}`, position: match.index })
    }
  }

  const moisRegex = new RegExp('(\\d{1,2})(?:er|ER|ème|eme)?\\s*(' + tousLesMois + ')(?:\\.|\\s)\\s*(\\d{4})', 'gi')
  while ((match = moisRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0')
    const moisBrut = match[2].toLowerCase()
    const moisNormalise = moisBrut.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const month = moisMap[moisBrut] || moisMap[moisNormalise]
    const year = match[3]
    if (month && parseInt(year) >= 2024 && parseInt(year) <= 2030) {
      const dateStr = `${day}/${month}/${year}`
      if (!foundDates.some(d => d.dateStr === dateStr && Math.abs(d.position - match.index) < 5)) {
        foundDates.push({ dateStr, position: match.index })
      }
    }
  }

  if (foundDates.length === 0) return null

  const textLower = text.toLowerCase()
  let startDate = null
  let endDate = null

  const datePattern = '\\d{1,2}(?:er)?\\s*(?:' + tousLesMois + ')\\s*\\d{4}|\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{4}'
  const regexDebut = new RegExp("(?:prise d'effet|prend effet|date de d[ée]but|[àa] compter|commence|[àa] partir du|entr[ée]e en jouissance)[^\\d]{0,50}(" + datePattern + ")", "gi")
  const regexFin = new RegExp("(?:fin de bail|fin du bail|date de fin|jusqu'au|expire|terme du bail|[ée]ch[ée]ance|prendra fin)[^\\d]{0,50}(" + datePattern + ")", "gi")

  function normalizeFoundDate(raw) {
    const numMatch = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
    if (numMatch) return numMatch[1].padStart(2, '0') + '/' + numMatch[2].padStart(2, '0') + '/' + numMatch[3]
    const moisMatch = raw.match(new RegExp('(\\d{1,2})(?:er)?\\s*(' + tousLesMois + ')\\s*(\\d{4})', 'i'))
    if (moisMatch) {
      const d = moisMatch[1].padStart(2, '0')
      const mb = moisMatch[2].toLowerCase()
      const mn = mb.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const mo = moisMap[mb] || moisMap[mn]
      if (mo) return d + '/' + mo + '/' + moisMatch[3]
    }
    return null
  }

  let m = regexDebut.exec(textLower)
  if (m) { const n = normalizeFoundDate(m[1]); if (n) startDate = n }
  m = regexFin.exec(textLower)
  if (m) { const n = normalizeFoundDate(m[1]); if (n) endDate = n }

  if (!startDate) {
    const sorted = [...foundDates].sort((a, b) => {
      const [dA, mA, yA] = a.dateStr.split('/').map(Number)
      const [dB, mB, yB] = b.dateStr.split('/').map(Number)
      return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB)
    })
    startDate = sorted[0].dateStr
    if (sorted.length >= 2 && !endDate) endDate = sorted[sorted.length - 1].dateStr
  }

  const result = { startDate }
  if (endDate && endDate !== startDate) result.endDate = endDate
  return result
}

// ==========================================
// BAIL SECTION PARSER — Extraction intelligente par sections ALUR
// ==========================================

function splitBailIntoSections(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const sectionMarkers = [
    { id: 'bailleur', patterns: [/\bd[ée]signation\s+des\s+parties/i, /\b(?:le\s+)?bailleur\b/i, /\bpropri[ée]taire\b/i, /\brepr[ée]sent[ée]\s+par\b/i, /\bparties?\s*:\s*(?:le\s+)?bailleur/i] },
    { id: 'locataire', patterns: [/\b(?:le\s+)?(?:locataire|preneur)\b/i, /\bd[ée]sign[ée]\s+ci-apr[eè]s\s+(?:le\s+)?locataire/i] },
    { id: 'designation', patterns: [/\bconsistance\s+(?:et\s+)?destination/i, /\blogement\s+objet\b/i, /\ble\s+bien\s+lou[ée]\b/i, /\bdescription\s+du\s+logement\b/i, /\bconsistance\s+du\s+logement\b/i, /\bcaract[ée]ristiques?\s+du\s+logement\b/i, /\bcomposition\s+du\s+logement\b/i, /\bobjet\s+du\s+(?:pr[ée]sent\s+)?(?:contrat|bail)\b/i, /\bsurface\s+habitable\b/i] },
    { id: 'loyer', patterns: [/\bconditions?\s+financi[eè]res?\b/i, /\bmontant\s+du\s+loyer\b/i, /\bloyer\s+et\s+charges?\b/i, /\bloyer\s+mensuel\b/i, /\bfixation\s+du\s+loyer\b/i] },
    { id: 'duree', patterns: [/\bdur[ée]e\s+du\s+(?:contrat|bail)\b/i, /\bprise\s+d['']effet\b/i, /\bdate\s+de\s+d[ée]but\b/i, /\bentr[ée]e\s+en\s+jouissance\b/i] },
    { id: 'dpe', patterns: [/\bdiagnostic\s+de\s+performance\b/i, /\bclasse\s+[ée]nerg[ée]tique\b/i, /\bDPE\b/, /\bperformance\s+[ée]nerg[ée]tique\b/i] },
    { id: 'depot', patterns: [/\bd[ée]p[oô]t\s+de\s+garantie\b/i, /\bcaution\b/i, /\bgarantie\s+locative\b/i] },
  ]

  const found = []
  const textLower = normalized.toLowerCase()

  for (const marker of sectionMarkers) {
    let earliestPos = -1
    for (const pattern of marker.patterns) {
      const match = textLower.match(pattern)
      if (match) {
        const pos = textLower.indexOf(match[0])
        if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) earliestPos = pos
      }
    }
    if (earliestPos !== -1) found.push({ id: marker.id, pos: earliestPos })
  }

  found.sort((a, b) => a.pos - b.pos)

  const sections = {}
  for (let i = 0; i < found.length; i++) {
    const start = found[i].pos
    const end = i + 1 < found.length ? found[i + 1].pos : normalized.length
    const content = normalized.substring(start, Math.min(end, start + 5000))
    if (!sections[found[i].id]) sections[found[i].id] = content
    else sections[found[i].id] += '\n' + content
  }

  sections._full = normalized
  console.log('[Bail sections]', Object.keys(sections).filter(k => k !== '_full'))
  if (sections.designation) console.log('[Section DESIGNATION]', sections.designation.substring(0, 500))
  if (sections.loyer) console.log('[Section LOYER]', sections.loyer.substring(0, 500))
  if (sections.dpe) console.log('[Section DPE]', sections.dpe.substring(0, 500))
  if (sections.depot) console.log('[Section DEPOT]', sections.depot.substring(0, 500))
  return sections
}

function extractFromSections(sections) {
  const result = { propertyInfo: {}, pricing: null, dpe: null }

  // === DÉSIGNATION DU BIEN (adresse, surface, type, étage, pièces) ===
  const desig = sections.designation || sections._full
  const desigLower = desig.toLowerCase()

  // Adresse — chercher dans la section désignation uniquement
  // Format 1: "localisation du logement : ADRESSE CODEPOSTAL VILLE"
  // Format 2: "situé(e) ADRESSE"
  // Format 3: "N° rue ... CODEPOSTAL"
  const addrPatterns = [
    /localisation\s+du\s+logement\s*:\s*\n?\s*(.+?)(?:\n|Entr[ée]e|etage|étage|\s{3,})/i,
    /(?:situ[ée]e?\s+(?:au\s+|[àa]\s+)?|sis(?:e)?\s+(?:au\s+|[àa]\s+)?)(\d+[^,\n]{5,100})/gi,
    /(\d+\s+(?:RUE|AVENUE|AV|BOULEVARD|BD|PLACE|ALL[ÉEE]+|IMPASSE|CHEMIN|PASSAGE|COURS|QUAI|ROUTE|rue|avenue|boulevard|place|all[ée]e|impasse|chemin|r[ée]sidence)[^,\n]{3,80})/gi,
  ]
  for (const pattern of addrPatterns) {
    const match = pattern.exec(desig)
    if (match && match[1]) {
      let addr = match[1].trim().replace(/\s+/g, ' ')
      // Nettoyer le bruit en fin d'adresse
      addr = addr.replace(/\s*(?:désigné|ci-après|d[ée]sign[ée]).*$/i, '').trim()
      if (addr.length >= 8 && addr.length <= 120) {
        // Séparer adresse et ville si code postal présent
        const cpInAddr = addr.match(/\b(\d{5})\s+([A-ZÀ-Ý][a-zà-ÿA-ZÀ-Ý\s-]+)$/)
        if (cpInAddr) {
          result.propertyInfo.codePostal = cpInAddr[1]
          result.propertyInfo.adresse = addr.replace(/\s*\d{5}\s+[A-ZÀ-Ý][a-zà-ÿA-ZÀ-Ý\s-]+$/, '').trim()
        } else {
          result.propertyInfo.adresse = addr
          const cpContext = desig.substring(match.index, match.index + 300)
          const cpMatch = cpContext.match(/\b(\d{5})\b/)
          if (cpMatch) result.propertyInfo.codePostal = cpMatch[1]
        }
        break
      }
    }
  }

  // Surface — priorité section désignation
  const surfMatch = desigLower.match(/(?:surface\s+(?:habitable|totale)?\s*(?:de|:)?\s*|superficie\s*(?:de|:)?\s*)(\d[\d,.\s]*\d|\d+)\s*m[²2]/i)
    || desigLower.match(/(\d[\d,.\s]*\d|\d+)\s*m[²2]\s*(?:habitable)?/i)
  if (surfMatch) {
    const val = parseFloat(surfMatch[1].replace(/\s/g, '').replace(',', '.'))
    if (val >= 8 && val <= 300) result.propertyInfo.surface = String(Math.round(val))
  }

  // Type de logement — section désignation
  if (/\bstudio\b/i.test(desig)) result.propertyInfo.type = 'Studio'
  else if (/\b[TF]1\b/i.test(desig)) result.propertyInfo.type = 'T1'
  else if (/\b[TF]2\b/i.test(desig)) result.propertyInfo.type = 'T2'
  else if (/\b[TF]3\b/i.test(desig)) result.propertyInfo.type = 'T3'
  else if (/\b[TF][4-9]\b/i.test(desig)) result.propertyInfo.type = 'T4+'

  // Pièces — déduit du type ou explicite dans désignation
  if (result.propertyInfo.type === 'Studio' || result.propertyInfo.type === 'T1') result.propertyInfo.pieces = '1'
  else if (result.propertyInfo.type === 'T2') result.propertyInfo.pieces = '2'
  else if (result.propertyInfo.type === 'T3') result.propertyInfo.pieces = '3'
  else if (result.propertyInfo.type === 'T4+') result.propertyInfo.pieces = '4'
  else {
    const pm = desigLower.match(/(\d+)\s*pi[èeé]ces?\s*(?:principales?)?/i)
    if (pm) { const n = parseInt(pm[1]); if (n >= 1 && n <= 20) result.propertyInfo.pieces = String(n) }
  }

  // Étage — section désignation
  if (/rez[\s-]*de[\s-]*chauss[ée]e/i.test(desig)) result.propertyInfo.etage = '0'
  else {
    const em = desig.match(/(\d+)(?:er|[eè]me|ème)?\s*[ée]tage/i) || desig.match(/[ée]?tage\s*(?:n[°o]?\s*)?:?\s*(\d+)/i)
    if (em && em[1]) { const n = parseInt(em[1]); if (n >= 0 && n <= 99) result.propertyInfo.etage = String(n) }
  }

  // === LOYER ET CHARGES (section loyer + depot) ===
  const loyerSection = sections.loyer || ''
  const depotSection = sections.depot || ''
  const loyerLower = (loyerSection + ' ' + depotSection).toLowerCase().replace(/\s+/g, ' ')

  if (loyerLower) {
    const pricing = {}
    // Cherche le montant entre parenthèses (450,18 EUR) ou directement 450€
    const loyerMatch = loyerLower.match(/(?:montant\s+du\s+loyer|loyer\s+(?:mensuel|de\s+base|principal|hors\s+charges?))[\s\S]{0,300}?\(\s*(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)\s*\)/i)
      || loyerLower.match(/(?:montant\s+du\s+loyer|loyer\s+(?:mensuel|de\s+base|principal))[\s\S]{0,300}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)/i)
      || loyerLower.match(/loyer[\s\S]{0,150}?\(\s*(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)\s*\)/i)
    if (loyerMatch) { const v = parseFloat(loyerMatch[loyerMatch.length > 2 ? 2 : 1].replace(/\s/g, '').replace(',', '.')); if (v >= 100 && v <= 5000) pricing.loyer = v }

    const chargesMatch = loyerLower.match(/(?:charges?\s+(?:locatives?|forfaitaires?)|provisions?\s+(?:sur|pour)\s+charges?)[\s\S]{0,300}?\(\s*(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)\s*\)/i)
      || loyerLower.match(/(?:charges?\s+(?:locatives?|forfaitaires?)|provisions?\s+(?:sur|pour)\s+charges?)[\s\S]{0,200}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)/i)
    if (chargesMatch) { const v = parseFloat(chargesMatch[1].replace(/\s/g, '').replace(',', '.')); if (v >= 10 && v <= 1000) pricing.charges = v }

    const cautionMatch = loyerLower.match(/(?:d[ée]p[oô]t\s+de\s+garantie|caution|garantie\s+locative)[\s\S]{0,300}?\(\s*(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)\s*\)/i)
      || loyerLower.match(/(?:d[ée]p[oô]t\s+de\s+garantie|caution|garantie\s+locative)[\s\S]{0,200}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?|EUR)/i)
    if (cautionMatch) { const v = parseFloat(cautionMatch[1].replace(/\s/g, '').replace(',', '.')); if (v >= 50 && v <= 10000) pricing.caution = v }

    if (/charges?\s+forfaitaires?|forfait\s+(?:de\s+)?charges?|charges?\s+incluses?|tout\s+compris/i.test(loyerLower)) pricing.chargeMode = 'forfaitaire'
    else if (/charges?\s+(?:au\s+)?r[ée]el/i.test(loyerLower)) pricing.chargeMode = 'separe'
    else if (/provisions?\s+(?:sur|pour)\s+charges?/i.test(loyerLower)) pricing.chargeMode = 'plafond'

    if (pricing.loyer || pricing.charges || pricing.caution) result.pricing = pricing
  }

  // === DPE (section dpe ou texte complet) ===
  const dpeText = sections.dpe || sections._full
  const dpePatterns = [
    /[Nn]iveau\s+de\s+performance[^A-Ga-g]{0,40}:\s*([A-Ga-g])\b/,
    /[Cc]lasse\s+[ée]nerg[ée]tique\s*:?\s*([A-Ga-g])/,
    /[ée]tiquette\s+[ée]nergie\s*:?\s*([A-Ga-g])/,
    /DPE\s*:?\s*([A-Ga-g])\b/i,
    /[Pp]erformance\s+[ée]nerg[ée]tique\s*:?\s*([A-Ga-g])/,
    /[Cc]lasse\s+([A-Ga-g])\s+(?:du\s+)?DPE/i,
    /:\s*([A-G])\b/,
  ]
  for (const pattern of dpePatterns) {
    const match = dpeText.match(pattern)
    if (match && ['A','B','C','D','E','F','G'].includes(match[1].toUpperCase())) { result.dpe = match[1].toUpperCase(); break }
  }

  // Nettoyage: retirer propertyInfo si vide
  if (!result.propertyInfo.surface && !result.propertyInfo.type && !result.propertyInfo.adresse && !result.propertyInfo.etage) {
    result.propertyInfo = null
  }

  console.log('[Bail extracted]', result)
  return result
}

function verifierDocumentBail(texte) {
  if (!texte || texte.length < 50) return { isBail: false, confidence: 0 }
  const texteLower = texte.toLowerCase()
  const motsClesBail = ['bail', 'contrat de location', 'bailleur', 'preneur', 'locataire', 'loyer', 'charges locatives', 'dépôt de garantie', "prise d'effet", 'état des lieux', 'logement', 'habitation', 'préavis', 'congé', 'caution', 'garant', 'surface habitable', 'dpe', 'quittance']
  const motsExclusion = ['facture n°', 'montant ttc', 'tva', 'bulletin de salaire', 'bulletin de paie', 'urssaf', 'relevé de compte', 'ordonnance', "carte d'identité", 'passeport n°']
  let scoreBail = 0, scoreExclusion = 0
  motsClesBail.forEach(mot => { if (texteLower.includes(mot)) scoreBail++ })
  motsExclusion.forEach(mot => { if (texteLower.includes(mot)) scoreExclusion++ })
  return { isBail: scoreBail >= 3 && scoreExclusion < 2, confidence: Math.min(100, Math.round((scoreBail / 5) * 100)), scoreBail, scoreExclusion }
}

// ==========================================
// COMPONENT
// ==========================================

export default function CreerAnnoncePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // --- Core state ---
  const [currentStep, setCurrentStep] = useState(0)
  const [userType, setUserType] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUserTypeScreen, setShowUserTypeScreen] = useState(false)
  const [showMainForm, setShowMainForm] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState(null)

  // --- Step 1: Basic info ---
  const [type, setType] = useState('')
  const [surface, setSurface] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [codePostalOriginal, setCodePostalOriginal] = useState('')
  const [adresse, setAdresse] = useState('')
  const [villeDetectee, setVilleDetectee] = useState(null)
  const [codePostalCheckmarkVisible, setCodePostalCheckmarkVisible] = useState(false)
  const [villeMessage, setVilleMessage] = useState({ text: '', className: 'ville-detectee' })
  const [addressVerified, setAddressVerified] = useState(false)
  const [verifiedCoordinates, setVerifiedCoordinates] = useState(null)
  const [adresseCheckmarkVisible, setAdresseCheckmarkVisible] = useState(false)
  const [addressValidationMsg, setAddressValidationMsg] = useState({ text: '', severity: '', show: false })

  // --- Step 2: Details ---
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [etage, setEtage] = useState('')
  const [pieces, setPieces] = useState('')
  const [dpe, setDpe] = useState('')
  const [equipements, setEquipements] = useState({ wifi: false, meuble: false, parking: false, cuisine: false, balcon: false, autre: false })
  const [autreEquipementTexte, setAutreEquipementTexte] = useState('')
  const [reglesLogement, setReglesLogement] = useState('')

  // --- Step 3: Photos ---
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [showCropModal, setShowCropModal] = useState(false)
  const cropImageRef = useRef(null)
  const cropperRef = useRef(null)
  const pendingFilesRef = useRef([])
  const currentFileIndexRef = useRef(0)
  const photoInputRef = useRef(null)

  // --- Step 4: Bail & Calendar ---
  const [bailStartDate, setBailStartDate] = useState('')
  const [bailEndDate, setBailEndDate] = useState('')
  const [bailDuree, setBailDuree] = useState('')
  const [rhythmStartDate, setRhythmStartDate] = useState('')
  const [rhythmEndDate, setRhythmEndDate] = useState('')
  const [rhythmType, setRhythmType] = useState('')
  const [rhythmPattern, setRhythmPattern] = useState('')
  const [cycleStartDate, setCycleStartDate] = useState('')
  const [selectedDates, setSelectedDates] = useState([])
  const [calendarMode, setCalendarMode] = useState('idle')
  const [cycleAnchorDate, setCycleAnchorDate] = useState(null)
  const [showEditCalendar, setShowEditCalendar] = useState(false)
  const [startMonthIndex, setStartMonthIndex] = useState(new Date().getMonth())
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [showDimancheModal, setShowDimancheModal] = useState(false)
  const [dimancheData, setDimancheData] = useState({ jour: '', precedent: null, suivant: null, bailStart: null, bailEnd: null })
  const dimancheChoixFaitRef = useRef(false)

  // --- Bail file ---
  const [bailFileData, setBailFileData] = useState(null)
  const [bailFileName, setBailFileName] = useState('')
  const [bailFileStatus, setBailFileStatus] = useState('')
  const [showBailFileResult, setShowBailFileResult] = useState(false)
  const [showBailUploadZone, setShowBailUploadZone] = useState(true)
  const [showBailSeparator, setShowBailSeparator] = useState(true)
  const [showBailLoader, setShowBailLoader] = useState(false)
  const [bailDatesAutoExtracted, setBailDatesAutoExtracted] = useState(false)

  // --- Step 5: Price ---
  const [chargeMode, setChargeMode] = useState('forfaitaire')
  const [prixForfaitaire, setPrixForfaitaire] = useState('')
  const [caution, setCaution] = useState('')
  const [prixBasePlafond, setPrixBasePlafond] = useState('')
  const [chargesMoyennes, setChargesMoyennes] = useState('')
  const [consoElec, setConsoElec] = useState('')
  const [consoEau, setConsoEau] = useState('')
  const [cautionPlafond, setCautionPlafond] = useState('')
  const [prixBaseSepare, setPrixBaseSepare] = useState('')
  const [cautionSepare, setCautionSepare] = useState('')
  const [chargesTypes, setChargesTypes] = useState({ eau: true, electricite: true, internet: true, chauffage: false })
  const [showPricingBanner, setShowPricingBanner] = useState(false)
  const [dpeAutoDetected, setDpeAutoDetected] = useState(null)
  const [caTypeSelectOpen, setCaTypeSelectOpen] = useState(false)
  const [caBailDureeOpen, setCaBailDureeOpen] = useState(false)
  const [caRhythmTypeOpen, setCaRhythmTypeOpen] = useState(false)
  const [caRhythmPatternOpen, setCaRhythmPatternOpen] = useState(false)

  // --- Modals & notifications ---
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'success' })
  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [publishBtnText, setPublishBtnText] = useState('Publier l\'annonce')

  // --- COCO-SSD model ---
  const cocoModelRef = useRef(null)

  // ==========================================
  // INITIALIZATION
  // ==========================================

  useEffect(() => {
    if (!user) return
    checkUserType()
  }, [user])

  // Auto-show calendar when rhythm + bail dates are all set
  useEffect(() => {
    console.log('[Calendar debug]', { rhythmPattern, rhythmType, bailStartDate, bailEndDate, rhythmStartDate, rhythmEndDate, showEditCalendar, currentStep })
    if (currentStep !== 4) return
    if (!rhythmPattern || rhythmType === 'custom' || showEditCalendar) return
    // If rhythmStartDate/EndDate already computed, show calendar
    if (rhythmStartDate && rhythmEndDate) {
      enterCycleSelectionMode()
      return
    }
    // If bail dates exist but rhythm dates not yet computed, compute them
    if (bailStartDate && bailEndDate) {
      const start = parseDate(bailStartDate)
      const end = parseDate(bailEndDate)
      if (start && end && end > start) {
        processRhythmDates(start, end)
      }
    }
  }, [rhythmPattern, rhythmStartDate, rhythmEndDate, bailStartDate, bailEndDate, currentStep])

  async function checkUserType() {
    try {
      const { data: userData } = await supabaseClient.from('users').select('type_user, is_admin, type_alternance, rythme_alternance').eq('id', user.id).single()
      setIsAdmin(userData?.is_admin === true)

      const typeParam = searchParams.get('type')
      if (typeParam === 'locataire' || typeParam === 'proprietaire') {
        setUserType(typeParam)
        initMainForm(typeParam, userData)
        return
      }

      if (userData && (userData.type_user === 'proprietaire' || userData.type_user === 'locataire')) {
        setUserType(userData.type_user)
        initMainForm(userData.type_user, userData)
        return
      }

      setShowUserTypeScreen(true)
    } catch (error) {
      console.error('Erreur checkUserType:', error)
      setShowUserTypeScreen(true)
    }
  }

  function initMainForm(type, userData) {
    setShowUserTypeScreen(false)
    setShowMainForm(true)

    if (type === 'locataire' || type === 'hote' || type === 'les_deux') {
      setCurrentStep(0)
    } else {
      setCurrentStep(1)
    }

    // Pre-fill rhythm from URL params first, then fallback to user profile
    const rythmeType = searchParams.get('rythme_type') || userData?.type_alternance
    const rythmePattern = searchParams.get('rythme_pattern') || userData?.rythme_alternance
    if (rythmeType) {
      setRhythmType(rythmeType)
      if (rythmePattern && rythmeType !== 'custom') {
        setTimeout(() => setRhythmPattern(rythmePattern), 100)
      }
    }
  }

  async function handleConfirmUserType() {
    if (!selectedUserType) return
    try {
      if (user) {
        await supabaseClient.from('users').update({ type_user: selectedUserType }).eq('id', user.id)
      }
    } catch (e) { console.warn('Erreur sauvegarde type:', e) }
    setUserType(selectedUserType)
    initMainForm(selectedUserType)
  }

  // ==========================================
  // NOTIFICATION SYSTEM
  // ==========================================

  function showNotificationFn(title, message, type = 'success') {
    setNotification({ show: true, title, message, type })
  }

  function closeNotificationFn() {
    setNotification(prev => ({ ...prev, show: false }))
  }

  // ==========================================
  // ADDRESS DETECTION
  // ==========================================

  function detecterVille(cp) {
    const chiffresSeuls = cp.replace(/[^0-9]/g, '')
    if (!chiffresSeuls || chiffresSeuls.length !== 5) {
      setVilleMessage({ text: '', className: 'ville-detectee' })
      setCodePostalCheckmarkVisible(false)
      setVilleDetectee(null)
      setCodePostalOriginal(chiffresSeuls)
      return
    }
    const ville = CODE_POSTAL_VILLE[chiffresSeuls]
    if (ville) {
      setCodePostal(`${chiffresSeuls} - ${ville}`)
      setCodePostalCheckmarkVisible(true)
      setVilleMessage({ text: '', className: 'ville-detectee' })
      setVilleDetectee(ville)
      setCodePostalOriginal(chiffresSeuls)
    } else {
      setCodePostal(chiffresSeuls)
      setCodePostalCheckmarkVisible(false)
      setVilleMessage({ text: 'STERNY arrive bientôt dans ta région !', className: 'ville-detectee warning show' })
      setVilleDetectee(null)
      setCodePostalOriginal(chiffresSeuls)
    }
  }

  function handleCodePostalFocus() {
    if (villeDetectee && codePostalOriginal) {
      setCodePostal(codePostalOriginal)
      setCodePostalCheckmarkVisible(false)
    }
  }

  function handleCodePostalBlur() {
    const chiffresSeuls = codePostal.replace(/[^0-9]/g, '')
    if (chiffresSeuls.length === 5 && CODE_POSTAL_VILLE[chiffresSeuls]) {
      setCodePostal(`${chiffresSeuls} - ${CODE_POSTAL_VILLE[chiffresSeuls]}`)
      setCodePostalCheckmarkVisible(true)
    }
    autoVerifyAddress()
  }

  async function autoVerifyAddress() {
    const addr = adresse.trim()
    setAddressVerified(false)
    setVerifiedCoordinates(null)
    setAdresseCheckmarkVisible(false)

    if (!addr || !codePostalOriginal || !villeDetectee) {
      setAddressValidationMsg({ text: '', severity: '', show: false })
      return
    }
    if (codePostalOriginal.length !== 5 || !/^\d+$/.test(codePostalOriginal)) {
      setAddressValidationMsg({ text: 'Le code postal doit contenir 5 chiffres', severity: 'error', show: true })
      return
    }
    setAddressValidationMsg({ text: '', severity: '', show: false })

    try {
      const fullAddress = `${addr}, ${codePostalOriginal}, ${villeDetectee}, France`
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        setAddressValidationMsg({ text: 'Adresse non trouvée dans la base nationale', severity: 'error', show: true })
        return
      }

      const result = data.features[0]
      const score = result.properties.score

      if (score < 0.5) {
        setAddressValidationMsg({ text: 'Adresse introuvable ou imprécise', severity: 'error', show: true })
      } else if (score < 0.7) {
        setAddressVerified(true)
        setVerifiedCoordinates(result.geometry.coordinates)
        setAdresseCheckmarkVisible(true)
        setAddressValidationMsg({ text: 'Adresse trouvée mais peu précise. Vérifie l\'orthographe.', severity: 'warning', show: true })
      } else {
        setAddressVerified(true)
        setVerifiedCoordinates(result.geometry.coordinates)
        setAdresseCheckmarkVisible(true)
        setAddressValidationMsg({ text: '', severity: '', show: false })
      }
    } catch (error) {
      console.error('Erreur:', error)
      setAddressValidationMsg({ text: 'Impossible de vérifier l\'adresse', severity: 'warning', show: true })
    }
  }

  // ==========================================
  // PHOTO MANAGEMENT
  // ==========================================

  async function loadCocoModel() {
    if (cocoModelRef.current) return cocoModelRef.current
    try {
      const tf = await import('@tensorflow/tfjs')
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      cocoModelRef.current = await cocoSsd.load({ base: 'mobilenet_v2' })
      return cocoModelRef.current
    } catch (e) {
      console.error('Erreur chargement modele IA:', e)
      return null
    }
  }

  async function detectPersonInImage(imgElement) {
    const model = await loadCocoModel()
    if (!model) return { isPerson: false, reason: 'model_unavailable' }
    try {
      const detectCanvas = document.createElement('canvas')
      const maxDim = 640
      let w = imgElement.naturalWidth || imgElement.width
      let h = imgElement.naturalHeight || imgElement.height
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      detectCanvas.width = w
      detectCanvas.height = h
      const ctx = detectCanvas.getContext('2d')
      ctx.drawImage(imgElement, 0, 0, w, h)
      const predictions = await model.detect(detectCanvas, 20, 0.25)
      const personDetections = predictions.filter(p => p.class === 'person' && p.score > 0.30)
      if (personDetections.length > 0) {
        return { isPerson: true, count: personDetections.length, maxScore: Math.max(...personDetections.map(p => p.score)) }
      }
      return { isPerson: false }
    } catch (e) {
      console.error('Erreur detection IA:', e)
      return { isPerson: false, reason: 'detection_error' }
    }
  }

  function verifyPhoto(file) {
    return new Promise(async (resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = async () => {
          if (img.width < 300 || img.height < 200) {
            resolve({ valid: false, reason: 'Image trop petite. Minimum 300x200 pixels requis.' })
            return
          }
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const sampleSize = 100
          canvas.width = sampleSize
          canvas.height = sampleSize
          ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const pixels = imageData.data
          const totalPixels = sampleSize * sampleSize
          let uniformPixels = 0, darkPixels = 0
          const firstR = pixels[0], firstG = pixels[1], firstB = pixels[2]
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
            if (Math.abs(r - firstR) < 8 && Math.abs(g - firstG) < 8 && Math.abs(b - firstB) < 8) uniformPixels++
            if (r < 20 && g < 20 && b < 20) darkPixels++
          }
          if (uniformPixels / totalPixels > 0.90) { resolve({ valid: false, reason: 'Cette image semble être une couleur unie.' }); return }
          if (darkPixels / totalPixels > 0.80) { resolve({ valid: false, reason: 'Cette image est trop sombre.' }); return }

          try {
            const detection = await detectPersonInImage(img)
            if (detection.isPerson) {
              const msg = detection.count === 1
                ? `Une personne a été détectée sur cette photo. Seules les photos de logement sont autorisées.`
                : `${detection.count} personnes ont été détectées sur cette photo. Seules les photos de logement sont autorisées.`
              resolve({ valid: false, reason: msg })
              return
            }
          } catch (detectError) { console.error('Detection IA erreur:', detectError) }

          resolve({ valid: true })
        }
        img.onerror = () => resolve({ valid: false, reason: 'Impossible de lire cette image.' })
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files)
    if (uploadedPhotos.length + files.length > 10) {
      showNotificationFn('Limite atteinte', 'Maximum 10 photos autorisées', 'warning')
      event.target.value = ''
      return
    }
    const validFiles = []
    for (const file of files) {
      if (!file.type.match('image/(jpeg|png|webp)')) {
        showNotificationFn('Format non supporté', `${file.name} n'est pas un format supporté`, 'warning')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotificationFn('Fichier trop volumineux', `${file.name} est trop volumineux (max 5 MB)`, 'warning')
        continue
      }
      const verification = await verifyPhoto(file)
      if (!verification.valid) {
        showNotificationFn('Photo non conforme', verification.reason, 'warning')
        continue
      }
      validFiles.push(file)
    }
    if (validFiles.length > 0) {
      pendingFilesRef.current = validFiles
      currentFileIndexRef.current = 0
      openCropModal(validFiles[0])
    }
    event.target.value = ''
  }

  function openCropModal(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      setShowCropModal(true)
      setTimeout(() => {
        const image = cropImageRef.current
        if (!image) return
        image.src = e.target.result
        if (cropperRef.current) cropperRef.current.destroy()
        cropperRef.current = new Cropper(image, {
          aspectRatio: 4 / 3,
          viewMode: 3,
          dragMode: 'move',
          autoCropArea: 1,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          background: false,
          modal: false,
          checkOrientation: true,
          ready() { this.cropper.reset(); this.cropper.center() }
        })
      }, 100)
    }
    reader.readAsDataURL(file)
  }

  function closeCropModal() {
    setShowCropModal(false)
    if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null }
    pendingFilesRef.current = []
    currentFileIndexRef.current = 0
  }

  function confirmCrop() {
    if (!cropperRef.current) return
    cropperRef.current.getCroppedCanvas({ width: 1200, height: 900, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' }).toBlob((blob) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedPhotos(prev => [...prev, { file: blob, dataUrl: e.target.result, id: Date.now() + Math.random() }])
        currentFileIndexRef.current++
        if (currentFileIndexRef.current < pendingFilesRef.current.length) {
          openCropModal(pendingFilesRef.current[currentFileIndexRef.current])
        } else {
          closeCropModal()
        }
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg', 0.95)
  }

  function deletePhoto(index) {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function previewPhoto(index) {
    if (index === 0) return
    setUploadedPhotos(prev => {
      const newPhotos = [...prev]
      const clicked = newPhotos[index]
      newPhotos[index] = newPhotos[0]
      newPhotos[0] = clicked
      return newPhotos
    })
  }

  // Drag & drop state
  const draggedPhotoIndexRef = useRef(null)

  function handleDragStart(e, index) {
    draggedPhotoIndexRef.current = index
    e.currentTarget.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('drag-over')
  }

  function handleDrop(e, targetIndex) {
    e.preventDefault()
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
    if (draggedPhotoIndexRef.current !== null && draggedPhotoIndexRef.current !== targetIndex) {
      setUploadedPhotos(prev => {
        const newPhotos = [...prev]
        const dragged = newPhotos[draggedPhotoIndexRef.current]
        newPhotos.splice(draggedPhotoIndexRef.current, 1)
        newPhotos.splice(targetIndex, 0, dragged)
        return newPhotos
      })
    }
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'))
    draggedPhotoIndexRef.current = null
  }

  // ==========================================
  // BAIL MANAGEMENT
  // ==========================================

  async function handleBailUpload(file) {
    if (!file) return
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!validTypes.includes(file.type)) { showNotificationFn('Format non supporté', 'Formats acceptés : PDF, JPG, PNG', 'warning'); return }
    if (file.size > 10 * 1024 * 1024) { showNotificationFn('Fichier trop volumineux', 'Le bail doit faire moins de 10 Mo', 'warning'); return }

    setBailFileData(file)
    setShowBailLoader(true)
    setShowBailFileResult(false)
    setShowBailUploadZone(false)
    setShowBailSeparator(false)

    try {
      let extractedDates = null
      if (file.type === 'application/pdf') {
        extractedDates = await extractDatesFromPDF(file)
      }
      setShowBailLoader(false)
      setBailFileName(file.name)

      if (extractedDates && extractedDates.notBail) {
        setShowBailUploadZone(true)
        setShowBailSeparator(true)
        setBailFileData(null)
        showNotificationFn('Document non reconnu', 'Ce document ne semble pas être un bail de location.', 'warning')
        return
      }

      setShowBailFileResult(true)

      if (extractedDates && extractedDates.startDate) {
        setBailFileStatus('Document enregistré - dates détectées automatiquement')
        setBailStartDate(extractedDates.startDate)
        if (extractedDates.endDate) {
          setBailEndDate(extractedDates.endDate)
          const start = parseDate(extractedDates.startDate)
          const end = parseDate(extractedDates.endDate)
          if (start && end) {
            const diffMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44))
            const closestOption = [3, 6, 9, 10, 12, 24].reduce((prev, curr) => Math.abs(curr - diffMonths) < Math.abs(prev - diffMonths) ? curr : prev)
            setBailDuree(String(closestOption))
          }
        }
        setBailDatesAutoExtracted(true)
        if (extractedDates.pricing) {
          prefillPricingFromBail(extractedDates.pricing)
          setShowPricingBanner(true)
        }
        if (extractedDates.dpe) {
          setDpe(extractedDates.dpe)
          setDpeAutoDetected(extractedDates.dpe)
        }
        if (extractedDates.propertyInfo) prefillPropertyInfo(extractedDates.propertyInfo)
      } else {
        setBailFileStatus('Document enregistré - remplis les dates manuellement')
        showNotificationFn('Bail enregistré', 'Remplis les dates manuellement.', 'success')
        if (extractedDates && extractedDates.pricing) {
          prefillPricingFromBail(extractedDates.pricing)
          setShowPricingBanner(true)
        }
        if (extractedDates && extractedDates.dpe) {
          setDpe(extractedDates.dpe)
          setDpeAutoDetected(extractedDates.dpe)
        }
        if (extractedDates && extractedDates.propertyInfo) prefillPropertyInfo(extractedDates.propertyInfo)
      }
    } catch (error) {
      console.error('Erreur analyse bail:', error)
      setShowBailLoader(false)
      setShowBailFileResult(true)
      setBailFileName(file.name)
      setBailFileStatus('Document enregistré - remplis les dates manuellement')
    }
  }

  async function extractDatesFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer()
    try {
      const pdfjsModule = await import('pdfjs-dist/build/pdf.mjs')
      const pdfjsLib = pdfjsModule
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      const maxPages = Math.min(pdf.numPages, 10)
      console.log(`[Bail] PDF chargé: ${pdf.numPages} pages, extraction de ${maxPages} pages`)
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i)
          const textContent = await Promise.race([
            page.getTextContent(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
          ])
          fullText += textContent.items.map(item => item.str).join(' ') + '\n'
          console.log(`[Bail] Page ${i}/${maxPages} extraite (${textContent.items.length} items)`)
        } catch (pageErr) {
          console.warn(`[Bail] Page ${i} ignorée:`, pageErr.message)
        }
      }
      const verification = verifierDocumentBail(fullText)
      if (!verification.isBail) return { notBail: true }
      const dates = findDatesInText(fullText)
      const sections = splitBailIntoSections(fullText)
      const extracted = extractFromSections(sections)
      if (dates) {
        dates.pricing = extracted.pricing
        dates.dpe = extracted.dpe
        dates.propertyInfo = extracted.propertyInfo
        return dates
      }
      return (extracted.pricing || extracted.dpe || extracted.propertyInfo) ? { pricing: extracted.pricing, dpe: extracted.dpe, propertyInfo: extracted.propertyInfo } : null
    } catch (e) {
      console.error('Erreur pdf.js:', e)
      return null
    }
  }

  function removeBailFile() {
    setBailFileData(null)
    setShowBailFileResult(false)
    setShowBailUploadZone(true)
    setShowBailSeparator(true)
    setBailStartDate('')
    setBailEndDate('')
    setBailDuree('')
    dimancheChoixFaitRef.current = false
    setRhythmStartDate('')
    setRhythmEndDate('')
    setShowPricingBanner(false)
  }

  function prefillPricingFromBail(pricing) {
    if (!pricing) return
    let modeChoisi = pricing.chargeMode || 'forfaitaire'
    if (pricing.loyer && pricing.charges) {
      if (modeChoisi === 'forfaitaire') setPrixForfaitaire(String(pricing.loyer + pricing.charges))
      else if (modeChoisi === 'plafond') { setPrixBasePlafond(String(pricing.loyer)); setChargesMoyennes(String(pricing.charges)) }
      else if (modeChoisi === 'separe') setPrixBaseSepare(String(pricing.loyer))
    } else if (pricing.loyer) {
      if (modeChoisi === 'forfaitaire') setPrixForfaitaire(String(pricing.loyer))
      else if (modeChoisi === 'plafond') setPrixBasePlafond(String(pricing.loyer))
      else if (modeChoisi === 'separe') setPrixBaseSepare(String(pricing.loyer))
    }
    if (pricing.caution) {
      if (modeChoisi === 'forfaitaire') setCaution(String(pricing.caution))
      else if (modeChoisi === 'plafond') setCautionPlafond(String(pricing.caution))
      else if (modeChoisi === 'separe') setCautionSepare(String(pricing.caution))
    }
    setChargeMode(modeChoisi)
  }

  async function prefillPropertyInfo(info) {
    if (!info) return
    if (info.surface) setSurface(info.surface)
    if (info.type) setType(info.type)
    if (info.pieces) setPieces(info.pieces)
    if (info.etage) setEtage(info.etage)
    if (info.codePostal) {
      detecterVille(info.codePostal)
    }
    if (info.adresse) {
      // Résoudre l'adresse via l'API adresse.data.gouv.fr pour obtenir le nom complet
      const cp = info.codePostal || ''
      const rawAddr = info.adresse.replace(/\s+/g, ' ').trim()
      try {
        const query = encodeURIComponent(`${rawAddr}${cp ? ' ' + cp : ''}`)
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`)
        const data = await res.json()
        if (data.features && data.features.length > 0) {
          const resolved = data.features[0].properties
          const cleanAddr = resolved.name || rawAddr
          setAdresse(capitalizeAddress(cleanAddr))
          if (resolved.postcode && !info.codePostal) detecterVille(resolved.postcode)
          setAddressVerified(true)
          setVerifiedCoordinates(data.features[0].geometry.coordinates)
          setAdresseCheckmarkVisible(true)
          console.log('[Bail] Adresse résolue:', rawAddr, '→', cleanAddr)
        } else {
          setAdresse(capitalizeAddress(rawAddr))
        }
      } catch (e) {
        console.warn('[Bail] Résolution adresse échouée:', e)
        setAdresse(capitalizeAddress(rawAddr))
      }
    }
  }

  // ==========================================
  // CALENDAR
  // ==========================================

  function getSelectedWeeksCount() {
    return Math.ceil(selectedDates.length / 7)
  }

  function shiftMonths(offset) {
    setStartMonthIndex(prev => {
      let newMonth = prev + offset
      if (newMonth < 0) { newMonth += 12; setStartYear(y => y - 1) }
      else if (newMonth >= 12) { newMonth -= 12; setStartYear(y => y + 1) }
      return newMonth
    })
  }

  function selectDate(dateStr, dateObj) {
    if (calendarMode === 'cycle_selection') {
      const dayOfWeek = dateObj.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(dateObj)
      monday.setDate(dateObj.getDate() + mondayOffset)
      setCycleAnchorDate(toLocalISODate(monday))
      setCycleStartDate(formatDateForInput(monday))
      setCalendarMode('editing')
      // Will trigger generation via effect
      return
    }

    // Editing mode - select/deselect whole week
    const dayOfWeek = dateObj.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(dateObj)
    monday.setDate(dateObj.getDate() + mondayOffset)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = today.getDay()
    const mondayOfThisWeek = new Date(today)
    mondayOfThisWeek.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1))
    mondayOfThisWeek.setHours(0, 0, 0, 0)
    const sundayOfClickedWeek = new Date(monday)
    sundayOfClickedWeek.setDate(monday.getDate() + 6)
    if (sundayOfClickedWeek < mondayOfThisWeek) {
      showNotificationFn('Semaine passée', 'Tu ne peux pas sélectionner une semaine entièrement passée.', 'warning')
      return
    }

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      weekDates.push(toLocalISODate(d))
    }

    setSelectedDates(prev => {
      const alreadySelected = weekDates.filter(d => prev.includes(d)).length > weekDates.length / 2
      let newDates
      if (alreadySelected) {
        newDates = prev.filter(d => !weekDates.includes(d))
      } else {
        newDates = [...prev, ...weekDates.filter(d => !prev.includes(d))]
      }
      return newDates.sort()
    })
  }

  // Generate rhythm dates when anchor is set
  useEffect(() => {
    if (calendarMode === 'editing' && cycleAnchorDate && rhythmPattern && rhythmStartDate && rhythmEndDate) {
      generateRhythmDatesFromAnchor()
    }
  }, [calendarMode, cycleAnchorDate])

  function generateRhythmDatesFromAnchor() {
    if (!rhythmPattern || !rhythmStartDate || !rhythmEndDate || !cycleAnchorDate) return
    const start = parseDate(rhythmStartDate)
    const end = parseDate(rhythmEndDate)
    if (!start || !end) return

    const [workWeeks, schoolWeeks] = rhythmPattern.split('-').map(Number)
    const cycleLength = workWeeks + schoolWeeks
    const cycleStart = new Date(cycleAnchorDate + 'T00:00:00')
    const startDow = start.getDay()
    const mondayOfStart = new Date(start)
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow
    mondayOfStart.setDate(start.getDate() + mondayOffset)
    mondayOfStart.setHours(0, 0, 0, 0)

    const diffMs = mondayOfStart.getTime() - cycleStart.getTime()
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
    const cycleOffset = ((diffWeeks % cycleLength) + cycleLength) % cycleLength

    const newDates = []
    let weekIndex = 0
    let weekMonday = new Date(mondayOfStart)
    while (weekMonday <= end) {
      const posInCycle = (weekIndex + cycleOffset) % cycleLength
      const isWorkWeek = posInCycle < workWeeks
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + d)
        if (currentDate > end) break
        if (isWorkWeek && currentDate >= start) newDates.push(toLocalISODate(currentDate))
      }
      weekMonday = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 7)
      weekIndex++
    }

    // Filter past weeks
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = today.getDay()
    const mondayOfThisWeek = new Date(today)
    mondayOfThisWeek.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1))
    const mondayThisWeekStr = toLocalISODate(mondayOfThisWeek)

    const filtered = newDates.filter(d => d >= mondayThisWeekStr).sort()
    setSelectedDates(filtered)

    showNotificationFn('Calendrier généré', `${filtered.length} jours sélectionnés. Clique sur les jours pour ajuster.`, 'success')
  }

  function handleGenerateClick() {
    if (rhythmType === 'custom') {
      if (!rhythmStartDate || !rhythmEndDate) {
        showNotificationFn('Dates manquantes', 'Remplis d\'abord les dates de ton bail.', 'warning')
        return
      }
      setSelectedDates([])
      setCalendarMode('editing')
      setShowEditCalendar(true)
    }
  }

  function enterCycleSelectionMode() {
    if (!rhythmStartDate || !rhythmEndDate) {
      showNotificationFn('Dates manquantes', 'Remplis d\'abord les dates de ton bail ci-dessus.', 'warning')
      return
    }
    setCalendarMode('cycle_selection')
    setCycleAnchorDate(null)
    setSelectedDates([])
    setCycleStartDate('')
    const now = new Date()
    setStartMonthIndex(now.getMonth())
    setStartYear(now.getFullYear())
    setShowEditCalendar(true)
  }

  function resetToCycleSelection() {
    setCalendarMode('cycle_selection')
    setCycleAnchorDate(null)
    setSelectedDates([])
    setCycleStartDate('')
  }

  function clearAllDates() {
    if (confirm('Effacer toutes les dates sélectionnées ?')) {
      setSelectedDates([])
    }
  }

  // Bail date calculation
  function handleBailEndDateCalc() {
    const dureeMois = parseInt(bailDuree)
    if (!bailStartDate || !dureeMois) return
    const start = parseDate(bailStartDate)
    if (!start) return
    const bailEnd = new Date(start)
    bailEnd.setMonth(bailEnd.getMonth() + dureeMois)
    setBailEndDate(formatDateForInput(bailEnd))
    processRhythmDates(start, bailEnd)
  }

  function handleBailFromDates() {
    if (!bailStartDate || !bailEndDate) return
    const start = parseDate(bailStartDate)
    const end = parseDate(bailEndDate)
    if (!start || !end || end <= start) return
    const diffMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44))
    const closestOption = [3, 6, 9, 10, 12, 24].reduce((prev, curr) => Math.abs(curr - diffMonths) < Math.abs(prev - diffMonths) ? curr : prev)
    if (Math.abs(closestOption - diffMonths) <= 1) setBailDuree(String(closestOption))
    processRhythmDates(start, end)
  }

  function processRhythmDates(start, bailEnd) {
    const endDate = new Date(bailEnd)
    const endDayOfWeek = endDate.getDay()

    if (dimancheChoixFaitRef.current && rhythmStartDate && rhythmEndDate) {
      finalizeBailDates(start, parseDate(rhythmEndDate))
      return
    }

    if (endDayOfWeek !== 0) {
      const dimPrec = new Date(endDate)
      dimPrec.setDate(endDate.getDate() - endDayOfWeek)
      const dimSuiv = new Date(endDate)
      dimSuiv.setDate(endDate.getDate() + (7 - endDayOfWeek))

      setDimancheData({
        jour: joursNoms[endDayOfWeek],
        precedent: dimPrec,
        suivant: dimSuiv,
        bailStart: start,
        bailEnd: bailEnd
      })
      setShowDimancheModal(true)
    } else {
      finalizeBailDates(start, bailEnd)
      showNotificationFn('Parfait !', 'Ton bail se termine un dimanche.', 'success')
    }
  }

  function choisirDimanche(choix) {
    const dimancheChoisi = choix === 'precedent' ? dimancheData.precedent : dimancheData.suivant
    if (!dimancheChoisi) return
    setShowDimancheModal(false)
    dimancheChoixFaitRef.current = true
    finalizeBailDates(dimancheData.bailStart, dimancheChoisi)
    setBailEndDate(formatDateForInput(dimancheChoisi))
  }

  function finalizeBailDates(bailStart, bailEnd) {
    let rhythmStart = new Date(bailStart)
    const startDow = rhythmStart.getDay()
    if (startDow !== 1) {
      const daysToMonday = startDow === 0 ? 1 : (8 - startDow)
      rhythmStart.setDate(rhythmStart.getDate() + daysToMonday)
    }
    const rhythmEnd = new Date(bailEnd)
    if (rhythmEnd <= rhythmStart) {
      showNotificationFn('Durée insuffisante', 'Il ne reste pas assez de temps pour au moins une semaine.', 'warning')
      return
    }
    setRhythmStartDate(formatDateForInput(rhythmStart))
    setRhythmEndDate(formatDateForInput(rhythmEnd))

    if (rhythmPattern) {
      setTimeout(() => enterCycleSelectionMode(), 200)
    }
  }

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  // Commission: 15% par alternant, split 60% STERNY / 40% propriétaire
  const STERNY_COMMISSION = 0.15
  const STERNY_SPLIT = 0.60

  function calcPriceDisplay(mode, prixF, prixBP, chgMoy, prixBS) {
    if (mode === 'forfaitaire') {
      const total = parseFloat(prixF)
      if (!total || total <= 0) return null
      const base = total / 2
      const perWeek = base / 4.33
      const commission = perWeek * STERNY_COMMISSION
      const commissionSterny = commission * STERNY_SPLIT
      const commissionProprio = commission * (1 - STERNY_SPLIT)
      return { base, perWeek, commission, commissionSterny, commissionProprio, final: perWeek + commission }
    }
    if (mode === 'plafond') {
      const base = parseFloat(prixBP)
      const charges = parseFloat(chgMoy)
      if (!base || base <= 0 || !charges || charges < 0) return null
      const divided = (base + charges) / 2
      const perWeek = divided / 4.33
      const commission = perWeek * STERNY_COMMISSION
      const commissionSterny = commission * STERNY_SPLIT
      const commissionProprio = commission * (1 - STERNY_SPLIT)
      return { base: divided, perWeek, commission, commissionSterny, commissionProprio, final: perWeek + commission }
    }
    if (mode === 'separe') {
      const base = parseFloat(prixBS)
      if (!base || base <= 0) return null
      const divided = base / 2
      const perWeek = divided / 4.33
      const commission = perWeek * STERNY_COMMISSION
      const commissionSterny = commission * STERNY_SPLIT
      const commissionProprio = commission * (1 - STERNY_SPLIT)
      return { base: divided, perWeek, commission, commissionSterny, commissionProprio, final: perWeek + commission }
    }
    return null
  }

  const priceCalc = calcPriceDisplay(chargeMode, prixForfaitaire, prixBasePlafond, chargesMoyennes, prixBaseSepare)

  // ==========================================
  // VALIDATION
  // ==========================================

  function validateStep(step) {
    return true // DEV: skip validation temporarily
    if (isAdmin) return true
    setErrors({})

    if (step === 1) {
      if (!type || !surface) { setErrors({ [step]: 'Merci de remplir tous les champs obligatoires' }); return false }
      if (!codePostalOriginal || codePostalOriginal.length !== 5) { setErrors({ [step]: 'Merci de saisir un code postal valide (5 chiffres)' }); return false }
      if (!villeDetectee) { setErrors({ [step]: 'STERNY arrive bientôt dans ta région !' }); return false }
      if (!adresse.trim()) { setErrors({ [step]: 'Merci de saisir une adresse' }); return false }
    }
    if (step === 2) {
      if (!titre) { setErrors({ [step]: 'Merci de remplir le titre de l\'annonce' }); return false }
      if (!description || description.trim().length < 20) { setErrors({ [step]: 'Merci de rédiger une description (minimum 20 caractères)' }); return false }
      const vt = verifierContenuTexte(titre, 'Titre'); if (!vt.valide) { setErrors({ [step]: vt.message }); return false }
      const vd = verifierContenuTexte(description, 'Description'); if (!vd.valide) { setErrors({ [step]: vd.message }); return false }
      if (equipements.autre && !autreEquipementTexte.trim()) { setErrors({ [step]: 'Tu as coché "Autre" mais n\'as pas précisé tes équipements' }); return false }
    }
    if (step === 3) {
      if (uploadedPhotos.length < 5) { setErrors({ [step]: `Ajoute au moins 5 photos (actuellement : ${uploadedPhotos.length})` }); return false }
    }
    if (step === 4 && userType === 'locataire') {
      if (!bailStartDate) { setErrors({ [step]: 'Merci de renseigner la date de début du bail' }); return false }
      if (!parseDate(bailStartDate)) { setErrors({ [step]: 'Date de début invalide. Format : JJ/MM/AAAA' }); return false }
      if (!bailEndDate && !bailDuree) { setErrors({ [step]: 'Merci de renseigner la date de fin ou choisir une durée' }); return false }
      if (selectedDates.length === 0) { setErrors({ [step]: 'Renseigne les dates et génère ton calendrier' }); return false }
      if (selectedDates.length < 7) { setErrors({ [step]: 'Sélectionne au moins 1 semaine complète' }); return false }
    }
    if (step === 5) {
      if (chargeMode === 'forfaitaire') {
        if (!prixForfaitaire || parseFloat(prixForfaitaire) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer mensuel' }); return false }
        if (!caution || parseFloat(caution) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      } else if (chargeMode === 'plafond') {
        if (!prixBasePlafond || parseFloat(prixBasePlafond) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer de base' }); return false }
        if (!chargesMoyennes || parseFloat(chargesMoyennes) < 0) { setErrors({ [step]: 'Merci d\'indiquer le forfait de charges' }); return false }
        if (!cautionPlafond || parseFloat(cautionPlafond) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      } else if (chargeMode === 'separe') {
        if (!prixBaseSepare || parseFloat(prixBaseSepare) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer de base' }); return false }
        if (!cautionSepare || parseFloat(cautionSepare) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      }
    }
    return true
  }

  // Sync steps with browser history
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && typeof e.state.step === 'number') {
        setCurrentStep(e.state.step)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function pushStep(step) {
    setCurrentStep(step)
    window.history.pushState({ step }, '', window.location.href)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextStep() {
    if (currentStep === 0) {
      pushStep(1)
      return
    }
    if (!validateStep(currentStep)) return
    const maxStep = 5
    if (currentStep < maxStep) {
      let next = currentStep + 1
      if (userType === 'proprietaire' && currentStep === 3) next = 5
      pushStep(next)
      if (next === 5 && bailDatesAutoExtracted) {
        showNotificationFn('Bail analysé', 'Vérifie bien les montants avant de continuer.', 'success')
        setBailDatesAutoExtracted(false)
      }
    }
  }

  function prevStep() {
    if (currentStep === 0) {
      navigate(-1)
      return
    }
    if (currentStep === 1) {
      if (userType === 'locataire' || userType === 'hote' || userType === 'les_deux') {
        pushStep(0)
      } else {
        navigate('/dashboard/proprietaire')
      }
      return
    }
    let prev = currentStep - 1
    if (userType === 'proprietaire' && currentStep === 5) prev = 3
    pushStep(prev)
  }

  const hasBailStep = userType === 'locataire' || userType === 'hote' || userType === 'les_deux'
  const allSteps = hasBailStep ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]
  const visibleSteps = allSteps.filter(s => !(userType === 'proprietaire' && s === 4))

  function getProgressWidth() {
    const idx = visibleSteps.indexOf(currentStep)
    if (idx <= 0) return 0
    return (idx / (visibleSteps.length - 1)) * 100
  }

  // ==========================================
  // PUBLISH
  // ==========================================

  function showConfirmationModal() {
    if (!validateStep(currentStep)) return
    setShowConfirmModal(true)
    document.body.style.overflow = 'hidden'
  }

  function closeConfirmationModal() {
    setShowConfirmModal(false)
    document.body.style.overflow = 'auto'
  }

  async function publierAnnonce() {
    closeConfirmationModal()
    if (!validateStep(5)) return

    setPublishing(true)
    setPublishBtnText('Publication en cours...')

    try {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
      if (!currentUser) { navigate('/connexion'); return }

      // Identity verification
      const { data: identityCheck } = await supabaseClient.from('users').select('identite_verifiee').eq('id', currentUser.id).single()
      if (!identityCheck || identityCheck.identite_verifiee !== 'verifiee') {
        if (confirm('Pour publier, tu dois vérifier ton identité. Continuer ?')) {
          try {
            const { data: identityData, error: identityError } = await supabaseClient.functions.invoke('create-stripe-identity-session', { body: { user_id: currentUser.id, return_url: window.location.href } })
            if (identityError) throw identityError
            if (identityData?.url) { window.location.href = identityData.url; return }
          } catch (e) { console.error('Erreur Stripe Identity:', e); alert('Impossible de lancer la vérification.') }
        }
        setPublishing(false); setPublishBtnText('Publier l\'annonce'); return
      }

      // Address check
      const adresseComplete = (adresse.trim() && codePostalOriginal) ? `${adresse.trim()}, ${codePostalOriginal}` : null
      if (adresseComplete && !addressVerified) {
        if (!confirm('Ton adresse n\'a pas été vérifiée. Publier quand même ?')) {
          setPublishing(false); setPublishBtnText('Publier l\'annonce'); return
        }
      }

      // Text verification
      const verifFinale = verifierContenuTexte(titre, 'Titre')
      if (!verifFinale.valide) { showNotificationFn('Contenu non autorisé', verifFinale.message, 'error'); setPublishing(false); setPublishBtnText('Publier l\'annonce'); return }

      // Collect equipment
      const equips = []
      if (equipements.wifi) equips.push('WiFi')
      if (equipements.meuble) equips.push('Meublé')
      if (equipements.parking) equips.push('Parking')
      if (equipements.cuisine) equips.push('Cuisine équipée')
      if (equipements.balcon) equips.push('Balcon/Terrasse')
      if (equipements.autre && autreEquipementTexte.trim()) equips.push('Autre: ' + autreEquipementTexte.trim())

      const regles = reglesLogement.trim() ? [reglesLogement.trim()] : []

      // Calculate price
      let prixBase = 0
      let chargesInfo = {}
      if (chargeMode === 'forfaitaire') {
        const prixTotal = parseFloat(prixForfaitaire)
        const cautionVal = parseFloat(caution)
        prixBase = prixTotal / 2
        chargesInfo = { mode: 'forfaitaire', prix_total_hote: prixTotal, prix_par_alternant: prixBase + prixBase * STERNY_COMMISSION, caution: cautionVal }
      } else if (chargeMode === 'plafond') {
        const loyer = parseFloat(prixBasePlafond)
        const forfait = parseFloat(chargesMoyennes)
        prixBase = (loyer + forfait) / 2
        chargesInfo = { mode: 'forfait_regularisation', loyer_base: loyer, forfait_charges: forfait, conso_normale_elec_kwh: parseFloat(consoElec) || null, conso_normale_eau_m3: parseFloat(consoEau) || null, prix_par_alternant: prixBase + prixBase * STERNY_COMMISSION, caution: parseFloat(cautionPlafond) }
      } else if (chargeMode === 'separe') {
        const loyer = parseFloat(prixBaseSepare)
        prixBase = loyer / 2
        const ct = []
        if (chargesTypes.eau) ct.push('eau')
        if (chargesTypes.electricite) ct.push('electricite')
        if (chargesTypes.internet) ct.push('internet')
        if (chargesTypes.chauffage) ct.push('chauffage')
        chargesInfo = { mode: 'separe', loyer_base: loyer, charges_types: ct, prix_base_par_alternant: prixBase + prixBase * STERNY_COMMISSION, caution: parseFloat(cautionSepare) }
      }

      const prixParSemaine = prixBase / 4.33
      const prixSemaineAvecCommission = prixParSemaine + prixParSemaine * STERNY_COMMISSION
      const nbSemaines = getSelectedWeeksCount()
      let prixTotalSejour = null
      if (userType === 'locataire' && nbSemaines > 0) prixTotalSejour = Math.round(prixSemaineAvecCommission * nbSemaines)

      let bailInfo = null
      if (userType === 'locataire') {
        const startParsed = parseDate(bailStartDate)
        const endParsed = parseDate(bailEndDate) || parseDate(rhythmEndDate)
        const dureeMois = bailDuree ? parseInt(bailDuree) : null
        bailInfo = {
          date_debut: startParsed ? toLocalISODate(startParsed) : null,
          date_fin: endParsed ? toLocalISODate(endParsed) : null,
          duree_mois: dureeMois,
          nb_semaines_presence: nbSemaines,
          prix_total_sejour: prixTotalSejour
        }
      }

      const annonce = {
        user_id: currentUser.id,
        type_logement: type,
        ville: villeDetectee,
        surface: parseInt(surface),
        pieces: pieces ? parseInt(pieces) : null,
        dpe: dpe || null,
        etage: formatEtage(etage),
        adresse: adresseComplete || null,
        prix: Math.round(prixSemaineAvecCommission),
        titre, description: description || null,
        equipements: equips, regles, charges_info: chargesInfo, bail_info: bailInfo,
        disponibilites_debut: selectedDates.length > 0 ? selectedDates[0] : null,
        disponibilites_pattern: selectedDates.length > 0 ? selectedDates : null,
        adresse_verifiee: addressVerified,
        latitude: verifiedCoordinates ? verifiedCoordinates[1] : null,
        longitude: verifiedCoordinates ? verifiedCoordinates[0] : null,
        adresse_verification_date: addressVerified ? new Date().toISOString() : null
      }

      const { data, error } = await supabaseClient.from('annonces').insert([annonce]).select()
      if (error) throw new Error(`Erreur base de données: ${error.message}`)

      const annonceId = data[0].id

      // Upload photos
      if (uploadedPhotos.length > 0) {
        setPublishBtnText('Upload des photos...')
        const uploadResults = await Promise.all(
          uploadedPhotos.map(async (photo, i) => {
            const fileName = `${currentUser.id}/${annonceId}/photo_${i}.jpg`
            try {
              const { error: uploadError } = await supabaseClient.storage.from('annonces-photos').upload(fileName, photo.file, { contentType: 'image/jpeg', upsert: true })
              if (!uploadError) {
                const { data: urlData } = supabaseClient.storage.from('annonces-photos').getPublicUrl(fileName)
                if (urlData?.publicUrl) return urlData.publicUrl + '?v=' + Date.now()
              }
            } catch (e) { console.error('Exception upload photo:', e) }
            return null
          })
        )
        const photoUrls = uploadResults.filter(Boolean)
        if (photoUrls.length > 0) {
          await supabaseClient.from('annonces').update({ photos: photoUrls }).eq('id', annonceId)
        }
      }

      showNotificationFn('Annonce publiée !', 'Ton annonce a été publiée avec succès !', 'success')
      navigate('/dashboard/locataire')
    } catch (error) {
      console.error('Erreur:', error)
      showNotificationFn('Erreur', 'Erreur lors de la publication : ' + error.message, 'error')
      setPublishing(false)
      setPublishBtnText('Publier l\'annonce')
    }
  }

  // ==========================================
  // CALENDAR RENDERING
  // ==========================================

  function renderMonthGrid(monthIndex, year) {
    const firstDay = new Date(year, monthIndex, 1)
    let startingDay = firstDay.getDay()
    startingDay = startingDay === 0 ? 6 : startingDay - 1
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const emptyCells = Array.from({ length: startingDay }, (_, i) => (
      <div key={`empty-${i}`} className="day-cell empty" />
    ))

    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dayDate = new Date(year, monthIndex, day)
      dayDate.setHours(0, 0, 0, 0)
      const dateStr = toLocalISODate(dayDate)
      const isPast = dayDate < today
      const isSelected = selectedDates.includes(dateStr)

      let className = 'day-cell available'
      if (isPast) className += ' past'
      if (isSelected) className += ' selected'

      return (
        <div
          key={day}
          className={className}
          data-date={dateStr}
          onClick={() => selectDate(dateStr, dayDate)}
          onMouseEnter={() => {
            if (calendarMode === 'cycle_selection') {
              const cells = getWeekCells(dateStr, dayDate)
              cells.forEach(c => { const el = document.querySelector(`[data-date="${c}"]`); if (el) el.classList.add('week-hover') })
            }
          }}
          onMouseLeave={() => {
            if (calendarMode === 'cycle_selection') {
              const cells = getWeekCells(dateStr, dayDate)
              cells.forEach(c => { const el = document.querySelector(`[data-date="${c}"]`); if (el) el.classList.remove('week-hover') })
            }
          }}
        >
          {day}
        </div>
      )
    })

    return (
      <div key={`month-${monthIndex}-${year}`} className="calendar-month">
        <div className="month-header">{monthNames[monthIndex]} {year}</div>
        <div className="weekdays">{dayNames.map((d, i) => <div key={i} className="weekday">{d}</div>)}</div>
        <div className="days-grid">{emptyCells}{dayCells}</div>
      </div>
    )
  }

  function getWeekCells(dateStr, dateObj) {
    const dayOfWeek = dateObj.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(dateObj)
    monday.setDate(dateObj.getDate() + mondayOffset)
    const cells = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      cells.push(toLocalISODate(d))
    }
    return cells
  }

  // Calendar period text
  const endMonthIdx = (startMonthIndex + 2) % 12
  const endYr = startYear + Math.floor((startMonthIndex + 2) / 12)
  const calendarPeriodText = `${monthNames[startMonthIndex]} - ${monthNames[endMonthIdx]} ${endYr}`

  // Weeks summary data
  const nbSemaines = getSelectedWeeksCount()
  let summaryDebut = '-', summaryFin = '-', summaryDebutJour = '', summaryFinJour = ''
  if (selectedDates.length > 0) {
    const premierJour = selectedDates[0]
    const dernierJour = selectedDates[selectedDates.length - 1]
    const [y1, m1, d1] = premierJour.split('-').map(Number)
    const dateDebut = new Date(y1, m1 - 1, d1)
    const dowDebut = dateDebut.getDay()
    dateDebut.setDate(dateDebut.getDate() + (dowDebut === 0 ? -6 : 1 - dowDebut))
    const [y2, m2, d2] = dernierJour.split('-').map(Number)
    const dateFin = new Date(y2, m2 - 1, d2)
    const dowFin = dateFin.getDay()
    dateFin.setDate(dateFin.getDate() + (dowFin === 0 ? 0 : 7 - dowFin))
    summaryDebut = formatDateDisplay(toLocalISODate(dateDebut))
    summaryFin = formatDateDisplay(toLocalISODate(dateFin))
    summaryDebutJour = 'Lundi'
    summaryFinJour = 'Dimanche'
  }

  // Recap values for modal
  const villeText = villeDetectee && codePostalOriginal ? `${villeDetectee} (${codePostalOriginal})` : villeDetectee || '\u2014'
  const recapLogement = type && surface ? `${type} \u2014 ${surface} m\u00b2` : type || '\u2014'
  const modeLabels = { forfaitaire: 'Forfait fixe', plafond: 'Forfait + régularisation', separe: 'Charges séparées' }
  const recapPrix = priceCalc ? priceCalc.final.toFixed(2) + '\u20ac' : '\u2014'
  const recapCautionVal = chargeMode === 'forfaitaire' ? caution : chargeMode === 'plafond' ? cautionPlafond : cautionSepare
  const recapSemaines = nbSemaines > 0 ? `${nbSemaines} semaine${nbSemaines > 1 ? 's' : ''}` : '\u2014'

  let recapPeriode = '\u2014'
  if (selectedDates.length > 0) {
    recapPeriode = `${summaryDebut} \u2192 ${summaryFin}`
  }

  // Rhythm options
  function getRhythmOptions() {
    if (rhythmType === 'symmetric') {
      return [
        { value: '1-1', label: '1 semaine / 1 semaine' },
        { value: '2-2', label: '2 semaines / 2 semaines' },
        { value: '3-3', label: '3 semaines / 3 semaines' },
        { value: '4-4', label: '4 semaines / 4 semaines' },
        { value: '5-5', label: '5 semaines / 5 semaines' },
        { value: '6-6', label: '6 semaines / 6 semaines' },
        { value: '8-8', label: '8 semaines / 8 semaines' }
      ]
    }
    if (rhythmType === 'asymmetric') {
      return [
        { value: '2-1', label: '2 sem. entreprise / 1 sem. école' },
        { value: '1-2', label: '1 sem. entreprise / 2 sem. école' },
        { value: '3-1', label: '3 sem. entreprise / 1 sem. école' },
        { value: '1-3', label: '1 sem. entreprise / 3 sem. école' },
        { value: '4-2', label: '4 sem. entreprise / 2 sem. école' },
        { value: '2-4', label: '2 sem. entreprise / 4 sem. école' },
        { value: '3-2', label: '3 sem. entreprise / 2 sem. école' },
        { value: '2-3', label: '2 sem. entreprise / 3 sem. école' }
      ]
    }
    return []
  }

  // Format date input handler
  function handleDateInput(value, setter) {
    let v = value.replace(/\D/g, '')
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    setter(v)
  }

  // ==========================================
  // RENDER
  // ==========================================

  // User type selection screen
  // if (!user) { return null } // TODO: réactiver

  if (showUserTypeScreen) {
    return (
      <div className="user-type-screen">
        <div className="user-type-container">
          <div className="user-type-header">
            <h1>Créer une annonce</h1>
            <p>Pour commencer, indique-nous ton profil</p>
          </div>
          <div className="user-type-options">
            <label className="user-type-card" htmlFor="typeProprietaire">
              <input type="radio" name="userType" id="typeProprietaire" value="proprietaire" onChange={() => setSelectedUserType('proprietaire')} />
              <div className="card-content">
                <div className="card-title">Propriétaire</div>
                <div className="card-description">Je possède un logement et je souhaite le louer à deux alternants</div>
              </div>
              <div className="card-check">{'\u2713'}</div>
            </label>
            <label className="user-type-card" htmlFor="typeLocataire">
              <input type="radio" name="userType" id="typeLocataire" value="locataire" onChange={() => setSelectedUserType('locataire')} />
              <div className="card-content">
                <div className="card-title">Locataire</div>
                <div className="card-description">Je loue déjà un logement et je cherche quelqu'un pour partager selon nos rythmes</div>
              </div>
              <div className="card-check">{'\u2713'}</div>
            </label>
          </div>
          <button className="btn btn-primary btn-large" disabled={!selectedUserType} onClick={handleConfirmUserType}>Continuer</button>
        </div>

        {notification.show && (
          <div className="custom-notification show">
            <div className="notification-content">
              <div className="notification-icon" style={{ background: notification.type === 'error' ? '#DC2626' : notification.type === 'warning' ? '#1E293B' : '#E8622A', color: 'white' }}>
                {notification.type === 'error' ? '\u2717' : notification.type === 'warning' ? '!' : '\u2713'}
              </div>
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }} />
              <button className="notification-btn" onClick={closeNotificationFn}>OK</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!showMainForm) {
    return <div className="create-container"><div className="page-header"><h1>Chargement...</h1></div></div>
  }

  const progressGridCols = `repeat(${visibleSteps.length}, 1fr)`
  const stepNumber5Text = userType === 'proprietaire' ? '4' : String(visibleSteps.length)

  return (
    <>
      <div className="create-container">
        {/* HEADER */}
        <div className="page-header">
          <h1>Créer une annonce</h1>
        </div>

        {/* PROGRESS BAR */}
        <div className="progress-container">
          <div className="progress-steps" style={{ gridTemplateColumns: progressGridCols }}>
            {visibleSteps.map((s, i) => {
              let cls = 'progress-step'
              if (s < currentStep) cls += ' completed'
              else if (s === currentStep) cls += ' active'
              const labels = { 0: 'Bail', 1: 'Informations', 2: 'Détails', 3: 'Photos', 4: 'Disponibilités', 5: 'Prix' }
              return (
                <div key={s} className={cls} data-step={s}>
                  <div className="step-number">{i + 1}</div>
                  <div className="step-label">{labels[s]}</div>
                </div>
              )
            })}
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${getProgressWidth()}%` }} />
          </div>
        </div>

        {/* STEP 0: Bail (locataires only) */}
        <div className={`form-section ${currentStep === 0 ? 'active' : ''} ${!hasBailStep ? 'hidden-for-user-type' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
              Importe ton bail
            </div>
            <div className="section-description">Sterny analyse ton contrat et remplit automatiquement les champs</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            {showBailUploadZone && (
              <div className="ca-bail-upload" onClick={() => document.getElementById('bailFileInputScreen')?.click()}>
                <div className="ca-bail-upload-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg></div>
                <div className="ca-bail-upload-title">Clique pour importer ton bail</div>
                <div className="ca-bail-upload-hint">PDF ou image – Max 10 Mo</div>
              </div>
            )}
            <input type="file" id="bailFileInputScreen" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => handleBailUpload(e.target.files[0])} />

            {showBailLoader && (
              <div className="ca-bail-loader">Analyse du document en cours...</div>
            )}

            {showBailFileResult && (
              <div className="ca-bail-result">
                <div className="ca-bail-result-info">
                  <div className="ca-bail-result-check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div>
                  <div>
                    <div className="ca-bail-result-name">{bailFileName}</div>
                    <div className="ca-bail-result-status">{bailFileStatus}</div>
                  </div>
                </div>
                <button className="ca-bail-result-remove" onClick={removeBailFile}>Retirer</button>
              </div>
            )}
          </div>

          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 1 */}
        <div className={`form-section ${currentStep === 1 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
              Informations de base
            </div>
            <div className="section-description">Commence par les informations essentielles de ton logement</div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Type de logement <span className="required">*</span></label>
              <CaSelect
                value={type}
                onChange={setType}
                placeholder="Sélectionne le type"
                options={[
                  { value: 'Studio', label: 'Studio' },
                  { value: 'T1', label: 'T1' },
                  { value: 'T2', label: 'T2' },
                  { value: 'T3', label: 'T3' },
                  { value: 'T4+', label: 'T4+' }
                ]}
              />
            </div>
            <div className="form-group">
              <label>Surface <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="number" value={surface} onChange={e => setSurface(e.target.value)} min="10" max="200" placeholder="45" style={{ width: '100%', paddingRight: '50px' }} />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontWeight: 400, fontSize: '14px', pointerEvents: 'none' }}>m²</span>
              </div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Code postal <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="text" value={codePostal} onChange={e => { setCodePostal(e.target.value); const digits = e.target.value.replace(/[^0-9]/g, ''); if (digits.length === 5) detecterVille(digits) }} onFocus={handleCodePostalFocus} onBlur={handleCodePostalBlur} placeholder="Ex: 35000" maxLength="5" style={{ width: '100%', paddingRight: '45px' }} />
                <span className={`input-checkmark ${codePostalCheckmarkVisible ? 'show' : ''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></span>
              </div>
              <div className={villeMessage.className}>{villeMessage.text}</div>
            </div>
            <div className="form-group">
              <label>Adresse <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="text" value={adresse} onChange={e => { setAdresse(capitalizeAddress(e.target.value)); setAdresseCheckmarkVisible(false); setAddressValidationMsg({ text: '', severity: '', show: false }) }} onBlur={autoVerifyAddress} placeholder="Ex: 15 rue de la République" style={{ width: '100%', paddingRight: '45px' }} />
                <span className={`input-checkmark ${adresseCheckmarkVisible ? 'show' : ''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></span>
              </div>
              {addressValidationMsg.show && (
                <div className={`address-validation-message ${addressValidationMsg.severity} show`}>{addressValidationMsg.text}</div>
              )}
            </div>
          </div>
          <div className="form-grid full-width">
            <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400, fontStyle: 'italic', marginTop: '-6px' }}>
              L'adresse complète sera visible uniquement après réservation confirmée
            </div>
          </div>
          {errors[1] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[1]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className={`form-section ${currentStep === 2 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
              Détails & Équipements
            </div>
            <div className="section-description">Décris ton logement et ses équipements</div>
          </div>
          <div className="form-grid full-width">
            <div className="form-group">
              <label>Titre de l'annonce <span className="required">*</span></label>
              <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Studio lumineux proche campus" maxLength="80" />
            </div>
          </div>
          <div className="form-grid full-width">
            <div className="form-group">
              <label>Description <span className="required">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décris ton logement : ambiance, points forts..." minLength="20" />
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400, fontStyle: 'italic', marginTop: '-2px' }}>
                Les informations de proximité seront calculées automatiquement
              </div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Étage</label>
              <input type="number" value={etage} onChange={e => setEtage(e.target.value)} placeholder="Ex: 3" min="0" max="99" />
              <small style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block', fontStyle: 'italic' }}>Entrez juste le chiffre</small>
            </div>
            <div className="form-group">
              <label>Nombre de pièces</label>
              <input type="number" value={pieces} onChange={e => setPieces(e.target.value)} placeholder="Ex: 2" min="1" max="20" />
            </div>
          </div>
          <div className="form-group">
            <label>DPE</label>
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              {[
                { letter: 'A', bg: '#009A44' },
                { letter: 'B', bg: '#51B845' },
                { letter: 'C', bg: '#B3D234' },
                { letter: 'D', bg: '#F7E500' },
                { letter: 'E', bg: '#F5A01A' },
                { letter: 'F', bg: '#EE7000' },
                { letter: 'G', bg: '#CC1219' }
              ].map(d => (
                <div
                  key={d.letter}
                  onClick={() => setDpe(dpe === d.letter ? '' : d.letter)}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: d.letter === 'D' ? '#1E293B' : 'white',
                    background: d.bg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s, opacity 0.15s, box-shadow 0.15s',
                    opacity: dpe && dpe !== d.letter ? 0.5 : 1,
                    transform: dpe === d.letter ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: dpe === d.letter ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  {d.letter}
                </div>
              ))}
            </div>
            {dpeAutoDetected && (
              <p style={{ color: '#22C55E', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>DPE détecté automatiquement : classe {dpeAutoDetected}</p>
            )}
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '32px 0 16px', color: '#1E293B' }}>Équipements disponibles</h3>
          <div className="equipements-grid">
            {[
              { key: 'wifi', label: 'WiFi' }, { key: 'meuble', label: 'Meublé' }, { key: 'parking', label: 'Parking' },
              { key: 'cuisine', label: 'Cuisine équipée' }, { key: 'balcon', label: 'Balcon/Terrasse' }
            ].map(eq => (
              <div className="equipement-checkbox" key={eq.key}>
                <input type="checkbox" id={eq.key} checked={equipements[eq.key]} onChange={e => setEquipements(prev => ({ ...prev, [eq.key]: e.target.checked }))} />
                <label htmlFor={eq.key} className="equipement-label">{eq.label}</label>
              </div>
            ))}
            <div className="equipement-checkbox">
              <input type="checkbox" id="autre-equipement" checked={equipements.autre} onChange={e => setEquipements(prev => ({ ...prev, autre: e.target.checked }))} />
              <label htmlFor="autre-equipement" className="equipement-label equipement-autre">+ Autre</label>
            </div>
          </div>
          {equipements.autre && (
            <div style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label>Précise tes autres équipements</label>
                <textarea value={autreEquipementTexte} onChange={e => setAutreEquipementTexte(e.target.value)} placeholder="Ex: Sèche-linge, climatisation, cave..." style={{ minHeight: '60px' }} />
              </div>
            </div>
          )}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Règles spécifiques à ton logement</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <textarea value={reglesLogement} onChange={e => setReglesLogement(e.target.value)} placeholder="Ex: Pas d'animaux, calme après 22h..." style={{ minHeight: '100px' }} />
            </div>
            <div style={{ background: '#FFF8F5', borderLeft: '3px solid #E8622A', borderRadius: '0 12px 12px 0', padding: '16px 20px' }}>
              <div style={{ fontWeight: 600, color: '#E8622A', fontSize: '14px', marginBottom: '6px' }}>Bon à savoir</div>
              <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.6 }}>
                Les règles générales sont déjà incluses dans le document d'engagement signé par chaque locataire.
              </div>
            </div>
          </div>
          {errors[2] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[2]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 3: Photos */}
        <div className={`form-section ${currentStep === 3 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
              Photos du logement
            </div>
            <div className="section-description">Ajoute au moins 5 photos de qualité</div>
          </div>
          <div className="photos-upload-container">
            {uploadedPhotos.length === 0 ? (
              <div className="upload-zone-simple" onClick={() => photoInputRef.current?.click()}>
                <div className="upload-icon-large">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" /><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" /><circle cx="13" cy="7" r="1" fill="#CBD5E1" /><rect x="8" y="2" width="14" height="14" rx="2" /></svg>
                </div>
                <div className="upload-text-large">Clique pour ajouter des photos</div>
                <div className="upload-subtext-large">JPG, PNG ou WEBP - Max 5 MB par photo</div>
              </div>
            ) : (
              <div className="photos-preview-main">
                <div className="main-photo-wrapper" onDragOver={handleDragOver} onDrop={e => handleDrop(e, 0)} onDragLeave={e => e.currentTarget.classList.remove('drag-over')}>
                  <img loading="lazy" src={uploadedPhotos[0].dataUrl} alt="Photo principale" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="photo-main-badge">Photo principale</div>
                  <div className="photo-number">1</div>
                  <button className="photo-delete-btn" onClick={() => deletePhoto(0)}>{'\u00d7'}</button>
                </div>
                {uploadedPhotos.length > 1 && (
                  <div className="thumbnail-wrapper">
                    <div className="thumbnail-grid">
                      {uploadedPhotos.slice(1).map((photo, i) => (
                        <div key={photo.id} className="thumbnail-item" draggable onDragStart={e => handleDragStart(e, i + 1)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, i + 1)} onDragEnd={handleDragEnd} onClick={() => previewPhoto(i + 1)}>
                          <img loading="lazy" src={photo.dataUrl} alt={`Photo ${i + 2}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div className="photo-number">{i + 2}</div>
                          <button className="photo-delete-btn" onClick={e => { e.stopPropagation(); deletePhoto(i + 1) }}>{'\u00d7'}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
            {uploadedPhotos.length > 0 && uploadedPhotos.length < 10 && (
              <button className="btn-add-photos" onClick={() => photoInputRef.current?.click()}>+ Ajouter d'autres photos</button>
            )}
          </div>
          <div style={{ textAlign: 'center' }}><span className="photos-counter"><span className="photo-count-number">{uploadedPhotos.length}</span> / 10 photos · min. 5 requis</span></div>
          <div style={{ background: '#FFF8F5', borderLeft: '3px solid #E8622A', borderRadius: '0 12px 12px 0', padding: '16px 20px', marginTop: '16px' }}>
            <div style={{ fontWeight: 600, color: '#E8622A', fontSize: '14px', marginBottom: '6px' }}>Conseils pour de bonnes photos</div>
            <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.6 }}>
              – La première photo sera la photo principale<br/>
              – Photographie toutes les pièces<br/>
              – Privilégie la lumière naturelle<br/>
              – Range un peu avant de photographier
            </div>
          </div>
          {errors[3] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[3]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 4: Bail & Calendar (locataires only) */}
        <div className={`form-section ${currentStep === 4 ? 'active' : ''} ${userType === 'proprietaire' ? 'hidden-for-user-type' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              Disponibilités & Bail
            </div>
            <div className="section-description">Indique ton rythme d'alternance et les dates de ton bail</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Date de début du bail <span className="required">*</span></label>
              <input type="text" value={bailStartDate} onChange={e => handleDateInput(e.target.value, setBailStartDate)} onBlur={handleBailEndDateCalc} placeholder="JJ/MM/AAAA" style={{ width: '100%', height: '36px', padding: '0 14px', border: '1.5px solid #E8EAF0', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
              <div className="input-hint">Premier jour de ton bail</div>
            </div>
            <div className="form-group">
              <label>Date de fin du bail <span className="required">*</span></label>
              <input type="text" value={bailEndDate} onChange={e => { handleDateInput(e.target.value, setBailEndDate); dimancheChoixFaitRef.current = false }} onBlur={handleBailFromDates} placeholder="JJ/MM/AAAA" style={{ width: '100%', height: '36px', padding: '0 14px', border: '1.5px solid #E8EAF0', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
              <div className="input-hint">Dernier jour de ton bail</div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px', position: 'relative', zIndex: caBailDureeOpen ? 500 : 1 }}>
            <label>Durée prédéfinie</label>
            <CaSelect
              value={bailDuree}
              onChange={(val) => { setBailDuree(val); dimancheChoixFaitRef.current = false; setTimeout(handleBailEndDateCalc, 0) }}
              placeholder="Choisis la durée de ton bail"
              options={[3, 6, 9, 10, 12, 24].map(d => ({ value: String(d), label: `${d} mois${d === 9 ? ' (année scolaire)' : d === 12 ? ' (1 an)' : d === 24 ? ' (2 ans)' : ''}` }))}
              onOpenChange={setCaBailDureeOpen}
            />
          </div>

          <div style={{ borderTop: '1.5px solid #E8EAF0', margin: '32px 0' }} />

          {/* Rhythm selection */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>Quel est ton rythme d'alternance ?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: (rhythmType === 'symmetric' || rhythmType === 'asymmetric') ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0, position: 'relative', zIndex: caRhythmTypeOpen ? 400 : 200 }}>
                <label>Type d'alternance</label>
                <CaSelect
                  value={rhythmType}
                  onChange={(val) => { setRhythmType(val); setRhythmPattern(''); setShowEditCalendar(false); setCalendarMode('idle'); setSelectedDates([]) }}
                  placeholder="Choisis ton type"
                  options={[
                    { value: 'symmetric', label: 'Symétrique (même durée)' },
                    { value: 'asymmetric', label: 'Asymétrique (durées différentes)' },
                    { value: 'custom', label: 'Personnalisé (sélection manuelle)' }
                  ]}
                  onOpenChange={setCaRhythmTypeOpen}
                />
              </div>
              {(rhythmType === 'symmetric' || rhythmType === 'asymmetric') && (
                <div className="form-group" style={{ marginBottom: 0, position: 'relative', zIndex: caRhythmPatternOpen ? 300 : 100 }}>
                  <label>Rythme</label>
                  <CaSelect
                    value={rhythmPattern}
                    onChange={(val) => {
                      setRhythmPattern(val)
                      if (val) {
                        if (!rhythmStartDate && bailStartDate && bailEndDate) {
                          const start = parseDate(bailStartDate)
                          const end = parseDate(bailEndDate)
                          if (start && end) {
                            processRhythmDates(start, end)
                            return
                          }
                        }
                        enterCycleSelectionMode()
                      }
                    }}
                    placeholder="Choisis la durée"
                    onOpenChange={setCaRhythmPatternOpen}
                    options={getRhythmOptions()}
                  />
                </div>
              )}
            </div>
          </div>

          {rhythmType === 'custom' && (
            <button className="btn btn-primary" onClick={handleGenerateClick} style={{ width: '100%', marginBottom: '24px' }}>Générer mon calendrier</button>
          )}

          {/* Calendar */}
          {showEditCalendar && (
            <div style={{ borderTop: '1.5px solid #E8EAF0', paddingTop: '24px', marginTop: '24px' }}>
              <div style={{ background: calendarMode === 'cycle_selection' ? '#FFF4ED' : '#F1F5F9', borderLeft: `4px solid ${calendarMode === 'cycle_selection' ? '#E8622A' : '#1E293B'}`, padding: '16px 20px', borderRadius: '12px', marginBottom: '20px' }}>
                {calendarMode === 'cycle_selection' ? (
                  <><strong style={{ color: '#1E293B' }}>Où commence ton cycle ?</strong><br /><span style={{ color: '#C2410C', fontSize: '14px' }}>Clique sur la semaine où tu seras présent(e).</span></>
                ) : (
                  <><strong style={{ color: '#1E293B' }}>Modifie ton calendrier</strong><br /><span style={{ color: '#6B7280', fontSize: '14px' }}>Clique sur un jour pour sélectionner ou retirer la semaine entière.</span><br /><a href="#" onClick={e => { e.preventDefault(); resetToCycleSelection() }} style={{ color: '#E8622A', fontSize: '13px', marginTop: '8px', display: 'inline-block' }}>Changer le début de cycle</a></>
                )}
              </div>
              <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={() => shiftMonths(-3)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                <div className="calendar-period">{calendarPeriodText}</div>
                <button className="calendar-nav-btn" onClick={() => shiftMonths(3)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="calendar-months-grid">
                {[0, 1, 2].map(i => {
                  const mi = (startMonthIndex + i) % 12
                  const yr = startYear + Math.floor((startMonthIndex + i) / 12)
                  return renderMonthGrid(mi, yr)
                })}
              </div>
            </div>
          )}

          {/* Weeks summary */}
          {selectedDates.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg, #FFF7F3 0%, #FFFFFF 100%)', border: '2px solid #FFD4BF', borderRadius: '16px', padding: '28px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(232, 98, 42, 0.08)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #E8622A 0%, #1E293B 100%)', borderRadius: '16px 16px 0 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Début</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#E8622A' }}>{summaryDebut}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{summaryDebutJour}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, minWidth: '100px' }}>
                    <div style={{ background: '#1E293B', color: 'white', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: 600 }}>{nbSemaines} semaine{nbSemaines > 1 ? 's' : ''}</div>
                    <div style={{ width: '100px', height: '3px', background: 'linear-gradient(90deg, #E8622A, #94A3B8, #1E293B)', position: 'relative', borderRadius: '2px' }}>
                      <div style={{ position: 'absolute', left: '-5px', top: '-4px', width: '10px', height: '10px', background: '#E8622A', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                      <div style={{ position: 'absolute', right: '-5px', top: '-4px', width: '10px', height: '10px', background: '#1E293B', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Fin</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{summaryFin}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{summaryFinJour}</div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button className="clear-dates-btn" onClick={clearAllDates} style={{ fontSize: '12px' }}>Tout effacer</button>
              </div>
            </div>
          )}

          {errors[4] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[4]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 5: Price */}
        <div className={`form-section ${currentStep === 5 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon-pill"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M4 14h12M19.5 6.5A7.5 7.5 0 0 0 5 10.5v3a7.5 7.5 0 0 0 14.5 4"/></svg></div>
              Prix & Charges
            </div>
            <div className="section-description">Définis ton prix et le mode de gestion des charges</div>
          </div>

          {showPricingBanner && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderLeft: '4px solid #22C55E', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', color: '#22C55E' }}>{'\u2713'}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Tarifs pré-remplis depuis ton bail</span>
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#1E293B' }}>Mode de gestion des charges</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { id: 'forfaitaire', title: 'Charges forfaitaires', desc: 'Prix fixe tout compris.', badge: null },
              { id: 'plafond', title: 'Forfait avec régularisation', desc: 'Forfait mensuel fixe couvrant une consommation normale.', badge: 'RECOMMANDÉ' },
              { id: 'separe', title: 'Charges séparées', desc: 'L\'alternant paye exactement ce qu\'il consomme.', badge: null }
            ].map(opt => (
              <label className="radio-option" htmlFor={opt.id} key={opt.id}>
                <input type="radio" name="chargeMode" id={opt.id} value={opt.id} checked={chargeMode === opt.id} onChange={() => setChargeMode(opt.id)} />
                <div className="radio-option-content">
                  <div className="radio-option-header">
                    <span className="radio-option-title">{opt.title}</span>
                    {opt.badge && <span className="radio-badge-recommended">{opt.badge}</span>}
                  </div>
                  <div className="radio-option-description">{opt.desc}</div>
                </div>
                <div className="card-check">{'\u2713'}</div>
              </label>
            ))}
          </div>

          {/* Forfaitaire form */}
          <div className={`charge-form ${chargeMode === 'forfaitaire' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer mensuel total (charges comprises) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixForfaitaire} onChange={e => setPrixForfaitaire(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={caution} onChange={e => setCaution(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            {chargeMode === 'forfaitaire' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer mensuel / 2 alternants</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine / alternant</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Plafond form */}
          <div className={`charge-form ${chargeMode === 'plafond' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer de base (hors charges) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixBasePlafond} onChange={e => setPrixBasePlafond(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Forfait mensuel de charges <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={chargesMoyennes} onChange={e => setChargesMoyennes(e.target.value)} min="0" max="500" placeholder="Exemple : 100" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={cautionPlafond} onChange={e => setCautionPlafond(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            {chargeMode === 'plafond' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer + forfait charges / 2</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine / alternant</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Separe form */}
          <div className={`charge-form ${chargeMode === 'separe' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer de base (hors charges) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixBaseSepare} onChange={e => setPrixBaseSepare(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={cautionSepare} onChange={e => setCautionSepare(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Types de charges à la consommation</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                {[{ key: 'eau', label: 'Eau' }, { key: 'electricite', label: 'Électricité' }, { key: 'internet', label: 'Internet' }, { key: 'chauffage', label: 'Chauffage' }].map(ct => (
                  <label className="charge-type-checkbox" key={ct.key}>
                    <input type="checkbox" checked={chargesTypes[ct.key]} onChange={e => setChargesTypes(prev => ({ ...prev, [ct.key]: e.target.checked }))} />
                    <span>{ct.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {chargeMode === 'separe' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer / 2</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine / alternant</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
                <div className="price-note">+ Charges variables selon consommation réelle</div>
              </div>
            )}
          </div>

          {errors[5] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[5]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" disabled={publishing} onClick={showConfirmationModal}>{publishBtnText}</button>
            </div>
          </div>
        </div>
      </div>

      {/* CROP MODAL */}
      {showCropModal && (
        <div className="crop-modal">
          <div className="crop-modal-content">
            <div className="crop-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Recadrer la photo</h3>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Ajuste le cadre orange pour sélectionner la zone (format 4:3)</div>
              </div>
              <button className="crop-close" onClick={closeCropModal}>{'\u00d7'}</button>
            </div>
            <div className="crop-container">
              <img ref={cropImageRef} alt="Crop" />
            </div>
            <div className="crop-modal-footer">
              <button className="btn btn-secondary" onClick={closeCropModal}>Annuler</button>
              <button className="btn btn-primary" onClick={confirmCrop}>Valider le cadrage</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content-confirm">
            <div className="modal-confirm-title">Prêt à publier ?</div>
            <p className="modal-confirm-subtitle">Ton annonce sera visible par les alternants en recherche de logement.</p>
            <div className="modal-recap">
              {[
                ['Logement', recapLogement],
                ['Ville', villeText],
                ['Occupation', recapSemaines],
                ['Période', recapPeriode],
                ['Charges', modeLabels[chargeMode] || '\u2014'],
                ['Prix / semaine', recapPrix],
                ['Caution', recapCautionVal ? `${recapCautionVal} \u20ac` : '\u2014']
              ].map(([label, value]) => (
                <div className="modal-recap-row" key={label}>
                  <span className="modal-recap-label">{label}</span>
                  <span className="modal-recap-value">{value}</span>
                </div>
              ))}
            </div>
            <p className="modal-confirm-reassurance">Tu pourras modifier ou retirer ton annonce à tout moment.</p>
            <div className="modal-confirm-actions">
              <button className="modal-btn-cancel" onClick={closeConfirmationModal}>Annuler</button>
              <button className="modal-btn-publish" onClick={publierAnnonce}>Publier l'annonce</button>
            </div>
          </div>
        </div>
      )}

      {/* DIMANCHE CHOICE MODAL */}
      {showDimancheModal && (
        <div className="custom-notification show" style={{ zIndex: 10000 }}>
          <div className="notification-content" style={{ maxWidth: '440px' }}>
            <div className="notification-icon" style={{ background: '#FFF4ED', color: '#E8622A' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div className="notification-title">Ton bail se termine en milieu de semaine</div>
            <div className="notification-message" style={{ marginBottom: '16px' }}>
              Sur STERNY, les réservations fonctionnent à la semaine. Ton bail se termine un <strong style={{ color: '#1E293B' }}>{dimancheData.jour}</strong>.
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500, marginBottom: '16px' }}>Que préfères-tu ?</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => choisirDimanche('precedent')} style={{ flex: 1, padding: '16px 12px', border: '1.5px solid #E8EAF0', borderRadius: '12px', background: 'white', color: '#1E293B', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Dimanche précédent<br /><span style={{ fontWeight: 500, fontSize: '13px', color: '#E8622A', display: 'block', marginTop: '4px' }}>{dimancheData.precedent ? formatDateForInput(dimancheData.precedent) : '-'}</span>
              </button>
              <button onClick={() => choisirDimanche('suivant')} style={{ flex: 1, padding: '16px 12px', border: '1.5px solid #E8EAF0', borderRadius: '12px', background: 'white', color: '#1E293B', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Dimanche suivant<br /><span style={{ fontWeight: 500, fontSize: '13px', color: '#E8622A', display: 'block', marginTop: '4px' }}>{dimancheData.suivant ? formatDateForInput(dimancheData.suivant) : '-'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification.show && (
        <div className="custom-notification show">
          <div className="notification-content">
            <div className="notification-icon" style={{ background: notification.type === 'error' ? '#DC2626' : notification.type === 'warning' ? '#1E293B' : '#E8622A', color: 'white' }}>
              {notification.type === 'error' ? '\u2717' : notification.type === 'warning' ? '!' : '\u2713'}
            </div>
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }} />
            <button className="notification-btn" onClick={closeNotificationFn}>OK</button>
          </div>
        </div>
      )}
    </>
  )
}
