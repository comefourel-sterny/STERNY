import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './DossierLocatairePage.css'

const DOC_VERIF_RULES = {
  scolarite:     { label: 'Certificat de scolarite',     attendu: ['certificat', 'scolarite', 'inscription', 'attestation', 'universite', 'ecole', 'etudiant', 'formation'] },
  assurance:     { label: 'Assurance habitation',        attendu: ['assurance', 'habitation', 'responsabilite civile', 'multirisque', 'locataire', 'attestation', 'police'] },
  rib:           { label: 'RIB',                         attendu: ['iban', 'bic', 'rib', 'releve', 'identite bancaire', 'banque', 'compte', 'swift'] },
  garant_id:     { label: 'Piece d\'identite du garant', attendu: ['identite', 'nationale', 'passeport', 'sejour', 'republique', 'carte', 'nom', 'prenom', 'ne'] },
  cautionnement: { label: 'Acte de cautionnement',       attendu: ['cautionnement', 'caution', 'garant', 'solidaire', 'engage', 'loyer', 'obligation'] }
}

const DOC_DB_FIELDS = {
  scolarite:     { url: 'doc_scolarite_url',     statut: 'doc_scolarite_statut',     motif: 'doc_scolarite_motif_rejet' },
  assurance:     { url: 'doc_assurance_url',      statut: 'doc_assurance_statut',     motif: 'doc_assurance_motif_rejet' },
  rib:           { url: 'doc_rib_url',            statut: 'doc_rib_statut',           motif: 'doc_rib_motif_rejet' },
  garant_id:     { url: 'doc_garant_id_url',      statut: 'doc_garant_id_statut',     motif: 'doc_garant_id_motif_rejet' },
  cautionnement: { url: 'doc_cautionnement_url',  statut: 'doc_cautionnement_statut', motif: 'doc_cautionnement_motif_rejet' }
}

const DOC_CONFIG = [
  { key: 'scolarite', label: 'Certificat de scolarite', desc: 'Attestation d\'inscription en cours -- PDF, JPG ou PNG (max 5 Mo)' },
  { key: 'assurance', label: 'Assurance habitation', desc: 'Attestation de responsabilite civile locative -- PDF, JPG ou PNG (max 5 Mo)' },
  { key: 'rib', label: 'Releve d\'identite bancaire (RIB)', desc: 'Pour les prelevements de loyer -- PDF, JPG ou PNG (max 5 Mo)' },
  { key: 'garant_id', label: 'Piece d\'identite du garant', desc: 'CNI, passeport ou titre de sejour -- PDF, JPG ou PNG (max 5 Mo)' },
  { key: 'cautionnement', label: 'Acte de cautionnement signe', desc: 'Document signe par le garant -- PDF (max 5 Mo)' },
]

const uploadSvg = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
const checkSvg = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
const xCircleSvg = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
const spinnerSvg = <svg className="verif-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function convertPdfToImage(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  const dataUrl = canvas.toDataURL('image/png')
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' }
}

function getImageDimensions(file) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => { resolve({ width: img.width, height: img.height }); URL.revokeObjectURL(img.src) }
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = URL.createObjectURL(file)
  })
}

function verifierPdfBasique(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => { const arr = new Uint8Array(reader.result); resolve(String.fromCharCode(arr[0], arr[1], arr[2], arr[3], arr[4]).startsWith('%PDF')) }
    reader.onerror = () => resolve(false)
    reader.readAsArrayBuffer(file.slice(0, 5))
  })
}

export default function DossierLocatairePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('match_id')
  const { user } = useAuth()

  const [locataireData, setLocataireData] = useState(null)
  const [isLocataire, setIsLocataire] = useState(true)
  const [headerSubtitle, setHeaderSubtitle] = useState('Completez votre dossier pour passer a la signature du contrat')
  const [retourUrl, setRetourUrl] = useState('/dashboard/locataire')
  const [toast, setToast] = useState(null)
  const [validating, setValidating] = useState(false)

  // Doc states
  const [docFiles, setDocFiles] = useState({ scolarite: null, assurance: null, rib: null, garant_id: null, cautionnement: null })
  const [docStates, setDocStates] = useState({})
  const docInputRefs = useRef({})

  // Garant
  const [garantPrenom, setGarantPrenom] = useState('')
  const [garantNom, setGarantNom] = useState('')
  const [garantTelephone, setGarantTelephone] = useState('')
  const [garantEmail, setGarantEmail] = useState('')

  // Proprio view
  const [proprioDocStatuses, setProprioDocStatuses] = useState({})
  const [proprioGarantInfo, setProprioGarantInfo] = useState(null)

  const showToast = useCallback((type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Load data
  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        if (!matchId) {
          // Demo mode
          const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
          setLocataireData(userData || {})
          setIsLocataire(true)
          if (userData) prefillLocataire(userData)
          return
        }

        const { data: candidature } = await supabaseClient
          .from('candidatures')
          .select('*, annonces (titre, ville, prix, user_id), users:locataire_id (*)')
          .eq('id', matchId)
          .single()

        if (!candidature) { alert('Match introuvable'); navigate('/dashboard/locataire'); return }

        const locataire = candidature.users
        const isProprio = user.id === candidature.annonces?.user_id
        const isLoc = user.id === locataire?.id

        const { data: adminCheck } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single()
        const isAdm = adminCheck?.is_admin === true

        if (!isLoc && !isProprio && !isAdm) { alert('Acces non autorise'); navigate('/'); return }

        setLocataireData(locataire)
        setRetourUrl(matchId ? `/match-confirmation?match_id=${matchId}` : '/dashboard/locataire')

        if (isLoc) {
          setIsLocataire(true)
          if (locataire) prefillLocataire(locataire)
        } else {
          setIsLocataire(false)
          setHeaderSubtitle(`Dossier de ${locataire?.prenom || ''} ${locataire?.nom || ''}`)
          buildProprioView(locataire)
        }
      } catch (err) {
        console.error('Erreur:', err)
        showToast('error', 'Erreur lors du chargement')
      }
    }
    load()
  }, [user, matchId, navigate, showToast])

  function prefillLocataire(data) {
    const existingDocs = [
      { key: 'scolarite', url: data.doc_scolarite_url, statut: data.doc_scolarite_statut, motif: data.doc_scolarite_motif_rejet },
      { key: 'assurance', url: data.doc_assurance_url, statut: data.doc_assurance_statut, motif: data.doc_assurance_motif_rejet },
      { key: 'rib', url: data.doc_rib_url, statut: data.doc_rib_statut, motif: data.doc_rib_motif_rejet },
      { key: 'garant_id', url: data.doc_garant_id_url, statut: data.doc_garant_id_statut, motif: data.doc_garant_id_motif_rejet },
      { key: 'cautionnement', url: data.doc_cautionnement_url, statut: data.doc_cautionnement_statut, motif: data.doc_cautionnement_motif_rejet },
    ]
    const states = {}
    existingDocs.forEach(doc => {
      if (doc.url) {
        states[doc.key] = { fileName: doc.url.split('/').pop(), statut: doc.statut || 'en_attente', motif: doc.motif || '' }
      }
    })
    setDocStates(states)
    if (data.garant_prenom) setGarantPrenom(data.garant_prenom)
    if (data.garant_nom) setGarantNom(data.garant_nom)
    if (data.garant_telephone) setGarantTelephone(data.garant_telephone)
    if (data.garant_email) setGarantEmail(data.garant_email)
  }

  function buildProprioView(locataire) {
    const docs = [
      { key: 'scolarite', label: 'Certificat de scolarite', url: locataire?.doc_scolarite_url, statut: locataire?.doc_scolarite_statut },
      { key: 'assurance', label: 'Assurance habitation', url: locataire?.doc_assurance_url, statut: locataire?.doc_assurance_statut },
      { key: 'rib', label: 'RIB', url: locataire?.doc_rib_url, statut: locataire?.doc_rib_statut },
      { key: 'garant_id', label: 'Piece d\'identite du garant', url: locataire?.doc_garant_id_url, statut: locataire?.doc_garant_id_statut },
      { key: 'cautionnement', label: 'Acte de cautionnement', url: locataire?.doc_cautionnement_url, statut: locataire?.doc_cautionnement_statut },
    ]
    setProprioDocStatuses(docs.reduce((acc, d) => ({ ...acc, [d.key]: { label: d.label, url: d.url, statut: d.statut } }), {}))
    if (locataire?.garant_prenom && locataire?.garant_nom) {
      setProprioGarantInfo({ prenom: locataire.garant_prenom, nom: locataire.garant_nom, telephone: locataire.garant_telephone, email: locataire.garant_email })
    }
  }

  // Apply doc
  function applyDoc(file, type) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) { showToast('error', 'Format non supporte. PDF, JPG ou PNG uniquement.'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('error', 'Le fichier ne doit pas depasser 5 Mo.'); return }

    setDocFiles(prev => ({ ...prev, [type]: file }))
    setDocStates(prev => ({ ...prev, [type]: { fileName: file.name, statut: 'en_cours', motif: '' } }))

    // Start verification
    verifierDocument(file, type)
  }

  function removeDoc(type) {
    setDocFiles(prev => ({ ...prev, [type]: null }))
    setDocStates(prev => { const n = { ...prev }; delete n[type]; return n })
    if (docInputRefs.current[type]) docInputRefs.current[type].value = ''
  }

  async function verifierDocument(file, type) {
    const rules = DOC_VERIF_RULES[type]
    try {
      let base64, sendMimeType
      if (file.type === 'application/pdf') {
        try {
          const converted = await convertPdfToImage(file)
          base64 = converted.base64
          sendMimeType = converted.mimeType
        } catch {
          // Fallback: send PDF directly as base64
          base64 = await fileToBase64(file)
          sendMimeType = file.type
        }
      } else {
        base64 = await fileToBase64(file)
        sendMimeType = file.type
      }

      // Check if doc was removed while processing
      if (!docFiles[type] && !document.querySelector(`[data-doc-key="${type}"]`)) return

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_KEY}` },
        body: JSON.stringify({ fileBase64: base64, mimeType: sendMimeType, docType: type, fileName: file.name, userNom: locataireData?.nom || '', userPrenom: locataireData?.prenom || '' })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur')

      if (data.statut === 'verifie') {
        setDocStates(prev => ({ ...prev, [type]: { ...prev[type], statut: 'verifie', motif: '' } }))
        showToast('success', `${rules.label} : verification reussie`)
      } else {
        setDocStates(prev => ({ ...prev, [type]: { ...prev[type], statut: 'rejete', motif: data.motif || 'Document non conforme' } }))
        showToast('error', `${rules.label} : verification echouee`)
      }
    } catch (err) {
      console.error('Erreur verification:', err)
      // Fallback local verification
      await verifierDocumentFallback(file, type)
    }
  }

  async function verifierDocumentFallback(file, type) {
    const rules = DOC_VERIF_RULES[type]
    const erreurs = []
    if (type === 'cautionnement' && file.type !== 'application/pdf') erreurs.push('L\'acte de cautionnement doit etre au format PDF')
    if (file.size < 10 * 1024) erreurs.push('Le fichier semble trop petit')
    if (file.type.startsWith('image/')) {
      const dim = await getImageDimensions(file)
      if (dim.width < 400 || dim.height < 400) erreurs.push('Image trop petite')
    }
    if (file.type === 'application/pdf') {
      const valid = await verifierPdfBasique(file)
      if (!valid) erreurs.push('PDF invalide')
    }

    if (erreurs.length > 0) {
      setDocStates(prev => ({ ...prev, [type]: { ...prev[type], statut: 'rejete', motif: erreurs.join('. ') } }))
      showToast('error', `${rules.label} : verification echouee`)
    } else {
      setDocStates(prev => ({ ...prev, [type]: { ...prev[type], statut: 'verifie', motif: '' } }))
      showToast('success', `${rules.label} : verification reussie`)
    }
  }

  // Upload document to storage
  async function uploadDocument(file, dossier) {
    const ext = file.name.split('.').pop()
    const name = `${user.id}-${dossier}-${Date.now()}.${ext}`
    const { error } = await supabaseClient.storage.from('documents').upload(name, file, { cacheControl: '3600', upsert: true })
    if (error) { console.error(`Upload ${dossier} error:`, error); return null }
    const { data: urlData } = supabaseClient.storage.from('documents').getPublicUrl(name)
    return urlData.publicUrl
  }

  // Validate dossier
  async function validerDossier() {
    setValidating(true)
    try {
      const updateData = {}
      for (const cfg of DOC_CONFIG) {
        if (docFiles[cfg.key]) {
          const url = await uploadDocument(docFiles[cfg.key], cfg.key)
          if (url) {
            const fields = DOC_DB_FIELDS[cfg.key]
            updateData[fields.url] = url
            const st = docStates[cfg.key]
            if (st?.statut === 'verifie') { updateData[fields.statut] = 'verifie'; updateData[fields.motif] = null }
            else if (st?.statut === 'rejete') { updateData[fields.statut] = 'rejete'; updateData[fields.motif] = st.motif || null }
            else { updateData[fields.statut] = 'en_attente'; updateData[fields.motif] = null }
          }
        }
      }

      const gP = garantPrenom.trim(); const gN = garantNom.trim()
      const gT = garantTelephone.trim(); const gE = garantEmail.trim()
      if (gP) updateData.garant_prenom = gP
      if (gN) updateData.garant_nom = gN
      if (gT) updateData.garant_telephone = gT
      if (gE) updateData.garant_email = gE

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseClient.from('users').update(updateData).eq('id', user.id)
        if (error) { showToast('error', 'Erreur : ' + error.message); setValidating(false); return }
      }

      showToast('success', 'Dossier valide ! Redirection...')
      setTimeout(() => {
        navigate(matchId ? `/contrat-location?match_id=${matchId}` : '/contrat-location')
      }, 1200)
    } catch (err) {
      console.error('Erreur:', err)
      showToast('error', err.message || 'Erreur')
      setValidating(false)
    }
  }

  if (!user) return null

  function renderDocItem(cfg) {
    const state = docStates[cfg.key]
    const hasFile = !!state

    let itemClass = 'doc-item'
    let iconClass = 'doc-status-icon empty'
    let iconContent = uploadSvg

    if (state?.statut === 'verifie') {
      itemClass = 'doc-item uploaded'; iconClass = 'doc-status-icon done'; iconContent = checkSvg
    } else if (state?.statut === 'rejete') {
      itemClass = 'doc-item rejected'; iconClass = 'doc-status-icon rejected'; iconContent = xCircleSvg
    } else if (state?.statut === 'en_cours') {
      itemClass = 'doc-item verifying'; iconClass = 'doc-status-icon verifying'; iconContent = spinnerSvg
    } else if (hasFile) {
      itemClass = 'doc-item uploaded'; iconClass = 'doc-status-icon done'; iconContent = checkSvg
    }

    return (
      <div key={cfg.key} className={itemClass} data-doc-key={cfg.key}
        onClick={e => { if (!e.target.closest('.upload-btn')) docInputRefs.current[cfg.key]?.click() }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#E8622A' }}
        onDragLeave={e => { if (!hasFile) e.currentTarget.style.borderColor = '' }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = ''; if (e.dataTransfer.files[0]) applyDoc(e.dataTransfer.files[0], cfg.key) }}>
        <div className={iconClass}>{iconContent}</div>
        <div className="doc-info">
          <div className="doc-name">{cfg.label}</div>
          <div className="doc-desc">{cfg.desc}</div>
          {state?.fileName && <div className="doc-file-name">{state.fileName}</div>}
          {state?.statut === 'en_cours' && <div className="doc-verif-status en_cours"><svg className="verif-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Verification STERNY en cours...</div>}
          {state?.statut === 'verifie' && <div className="doc-verif-status verifie"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Verifie par STERNY</div>}
          {state?.statut === 'rejete' && <div className="doc-verif-status rejete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> Document non conforme</div>}
          {state?.statut === 'rejete' && state.motif && <div className="doc-motif-rejet">{state.motif}</div>}
        </div>
        <div className="doc-action">
          {!hasFile && <button type="button" className="upload-btn choose" onClick={e => { e.stopPropagation(); docInputRefs.current[cfg.key]?.click() }}>Choisir</button>}
          {hasFile && <button type="button" className="upload-btn remove" onClick={e => { e.stopPropagation(); removeDoc(cfg.key) }}>Retirer</button>}
        </div>
        <input type="file" ref={el => docInputRefs.current[cfg.key] = el} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) applyDoc(e.target.files[0], cfg.key) }} />
      </div>
    )
  }

  function renderProprioDocStatus(key) {
    const doc = proprioDocStatuses[key]
    if (!doc) return null
    let badge
    if (!doc.url) badge = <div className="status-badge pending"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Non fourni</div>
    else if (doc.statut === 'verifie') badge = <div className="status-badge verified-sterny"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Verifie par STERNY</div>
    else if (doc.statut === 'rejete') badge = <div className="status-badge rejected-sterny"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> Rejete par STERNY</div>
    else badge = <div className="status-badge verifying-sterny"><svg className="verif-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Verification en cours</div>

    return (
      <div className="doc-status-row" key={key}>
        <span className="doc-label">{doc.label}</span>
        {badge}
      </div>
    )
  }

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

      <div className="page-header">
        <h1>Dossier locataire</h1>
        <p>{headerSubtitle}</p>
      </div>

      {/* Progress */}
      <div className="card progress-card">
        <div className="progress-steps">
          <div className="progress-step completed"><div className="step-number">1</div><div className="step-label">Match</div></div>
          <div className="progress-step active"><div className="step-number">2</div><div className="step-label">Dossier</div></div>
          <div className="progress-step"><div className="step-number">3</div><div className="step-label">Contrat</div></div>
          <div className="progress-step"><div className="step-number">4</div><div className="step-label">Paiement</div></div>
          <div className="progress-step"><div className="step-number">5</div><div className="step-label">Etat des lieux</div></div>
        </div>
        <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: '20%' }} /></div>
      </div>

      {/* Locataire view */}
      {isLocataire && (
        <div className="card dossier-card">
          <div className="dossier-section">
            <div className="section-label">I. Documents obligatoires</div>
            <div className="dossier-text"><p>Importez les <strong>3 pieces justificatives</strong> demandees.</p></div>
            <div className="doc-list" style={{ marginTop: '16px' }}>
              {DOC_CONFIG.slice(0, 3).map(cfg => renderDocItem(cfg))}
            </div>
          </div>

          <div className="dossier-section">
            <div className="section-label">II. Informations du garant</div>
            <div className="dossier-text"><p>Le garant est la personne qui s'engage a <strong>payer le loyer en cas de defaillance</strong> du locataire.</p></div>
            <div className="form-grid" style={{ marginTop: '16px' }}>
              <div className="form-field"><label>Prenom <span className="req">*</span></label><input type="text" value={garantPrenom} onChange={e => setGarantPrenom(e.target.value)} placeholder="Jean" /></div>
              <div className="form-field"><label>Nom <span className="req">*</span></label><input type="text" value={garantNom} onChange={e => setGarantNom(e.target.value)} placeholder="Dupont" /></div>
              <div className="form-field"><label>Telephone <span className="req">*</span></label><input type="tel" value={garantTelephone} onChange={e => setGarantTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
              <div className="form-field"><label>Email <span className="req">*</span></label><input type="email" value={garantEmail} onChange={e => setGarantEmail(e.target.value)} placeholder="jean.dupont@email.com" /></div>
            </div>
          </div>

          <div className="dossier-section">
            <div className="section-label">III. Pieces justificatives du garant</div>
            <div className="dossier-text"><p>Conformement a la <strong>loi ALUR</strong>, le garant doit fournir une piece d'identite et un <strong>acte de cautionnement signe</strong>.</p></div>
            <div className="doc-list" style={{ marginTop: '16px' }}>
              {DOC_CONFIG.slice(3).map(cfg => renderDocItem(cfg))}
            </div>
          </div>
        </div>
      )}

      {/* Proprio view */}
      {!isLocataire && (
        <>
          <div className="section-card">
            <div className="section-label">I. Documents du locataire</div>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginBottom: '14px', lineHeight: '1.4' }}>Les documents sont verifies automatiquement par STERNY.</p>
            {['scolarite', 'assurance', 'rib'].map(k => renderProprioDocStatus(k))}
          </div>
          <div className="section-card">
            <div className="section-label">II. Garant</div>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginBottom: '14px', lineHeight: '1.4' }}>Informations de la personne qui se porte caution.</p>
            {proprioGarantInfo ? (
              <div className="garant-grid">
                <div className="garant-field"><div className="field-label">Prenom</div><div className="field-value">{proprioGarantInfo.prenom}</div></div>
                <div className="garant-field"><div className="field-label">Nom</div><div className="field-value">{proprioGarantInfo.nom}</div></div>
                <div className="garant-field"><div className="field-label">Telephone</div><div className="field-value">{proprioGarantInfo.telephone || 'Non renseigne'}</div></div>
                <div className="garant-field"><div className="field-label">Email</div><div className="field-value">{proprioGarantInfo.email || 'Non renseigne'}</div></div>
              </div>
            ) : (
              <div className="status-badge pending">Informations non renseignees</div>
            )}
          </div>
          <div className="section-card">
            <div className="section-label">III. Pieces du garant</div>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginBottom: '14px', lineHeight: '1.4' }}>Documents justificatifs du garant verifies par STERNY.</p>
            {['garant_id', 'cautionnement'].map(k => renderProprioDocStatus(k))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="actions-card">
        <Link to={retourUrl} className="btn-back-action">Retour</Link>
        {isLocataire && (
          <button className="btn-primary" onClick={validerDossier} disabled={validating}>
            {validating ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg> Envoi en cours...</>
            ) : 'Valider mon dossier'}
          </button>
        )}
      </div>
    </div>
  )
}
