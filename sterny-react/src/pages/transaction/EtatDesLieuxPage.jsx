import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './EtatDesLieuxPage.css'

const ROOMS = [
  { id: 'salon', label: 'Salon', iconClass: 'sejour', stroke: '#7C3AED',
    svgPath: <><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" /><path d="M4 18v2" /><path d="M20 18v2" /></>,
    items: ['Sol', 'Murs', 'Plafond', 'Fen\u00eatres'],
    itemKeys: ['sol', 'murs', 'plafond', 'fenetres'] },
  { id: 'cuisine', label: 'Cuisine', iconClass: 'cuisine', stroke: '#D97706',
    svgPath: <><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m16 6-4 4-4-4" /><path d="M16 18a4 4 0 0 0-8 0" /></>,
    items: ['Sol', 'Plaques de cuisson', 'R\u00e9frig\u00e9rateur', '\u00c9vier & robinetterie'],
    itemKeys: ['sol', 'plaques', 'frigo', 'evier'] },
  { id: 'chambre', label: 'Chambre', iconClass: 'chambre', stroke: '#2563EB',
    svgPath: <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>,
    items: ['Sol', 'Murs', 'Lit', 'Armoire/Placard'],
    itemKeys: ['sol', 'murs', 'lit', 'armoire'] },
  { id: 'sdb', label: 'Salle de bain', iconClass: 'sdb', stroke: '#059669',
    svgPath: <><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" /><path d="M6 12V4a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1v2" /><path d="M4 20v2" /><path d="M20 20v2" /></>,
    items: ['Sol', 'Douche/Baignoire', 'Lavabo & robinetterie', 'Miroir'],
    itemKeys: ['sol', 'douche', 'lavabo', 'miroir'] },
]
const STATES = ['neuf', 'bon', 'correct', 'degrade']
const STATE_LABELS = { neuf: 'Neuf', bon: 'Bon', correct: 'Correct', degrade: 'D\u00e9grad\u00e9' }

export default function EtatDesLieuxPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const matchId = searchParams.get('match_id')

  const [checklistData, setChecklistData] = useState({})
  const [compteurElec, setCompteurElec] = useState('')
  const [compteurGaz, setCompteurGaz] = useState('')
  const [compteurEau, setCompteurEau] = useState('')
  const [observations, setObservations] = useState('')
  const [photosUrls, setPhotosUrls] = useState([])
  const [collapsedSections, setCollapsedSections] = useState({})
  const [retourHref, setRetourHref] = useState('/paiement')
  const [messageBar, setMessageBar] = useState(null)

  // Signature
  const [edlSigNom, setEdlSigNom] = useState('\u2014')
  const [edlSigEmail, setEdlSigEmail] = useState('\u2014')
  const [checkInspecte, setCheckInspecte] = useState(false)
  const [checkAccepteEdl, setCheckAccepteEdl] = useState(false)
  const [sigSaisieNom, setSigSaisieNom] = useState('')
  const [sigHintText, setSigHintText] = useState('')
  const [sigHintClass, setSigHintClass] = useState('edl-sig-hint')
  const [sigInputClass, setSigInputClass] = useState('edl-sig-input')
  const [btnSignerDisabled, setBtnSignerDisabled] = useState(true)
  const [btnSignerText, setBtnSignerText] = useState('Signer l\'\u00e9tat des lieux')

  // Signature status
  const [locataireSigned, setLocataireSigned] = useState(false)
  const [proprietaireSigned, setProprietaireSigned] = useState(false)
  const [locataireSignDate, setLocataireSignDate] = useState('En attente')
  const [proprietaireSignDate, setProprietaireSignDate] = useState('En attente')
  const [showSignForm, setShowSignForm] = useState(true)
  const [showDejaSign, setShowDejaSign] = useState(false)
  const [dejaSigneTitle, setDejaSigneTitle] = useState('Vous avez sign\u00e9')
  const [dejaSigneMsg, setDejaSigneMsg] = useState('En attente de la signature de l\'autre partie.')

  // Validate button
  const [btnValiderDisabled, setBtnValiderDisabled] = useState(true)
  const [btnValiderText, setBtnValiderText] = useState('Valider et finaliser')

  // Refs
  const edlDataRef = useRef(null)
  const contratDataRef = useRef(null)
  const matchDataRef = useRef(null)
  const currentUserDataRef = useRef(null)
  const isLocataireRef = useRef(false)
  const isProprietaireRef = useRef(false)
  const isAdminRef = useRef(false)
  const edlSignataireNameRef = useRef('')
  const checklistDataRef = useRef({})
  const photosUrlsRef = useRef([])
  const autoSaveTimerRef = useRef(null)

  const showMessage = useCallback((type, text) => {
    setMessageBar({ type, text })
    setTimeout(() => setMessageBar(null), 4000)
  }, [])

  const autoCapitalize = (value) => value.replace(/\b\w/g, c => c.toUpperCase())

  const planifierAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => sauvegarderDonnees(), 2000)
  }, [])

  const sauvegarderDonnees = async () => {
    const edl = edlDataRef.current
    if (!edl) return
    const compteurs = {
      electricite: document.getElementById('compteur-elec')?.value || null,
      gaz: document.getElementById('compteur-gaz')?.value || null,
      eau: document.getElementById('compteur-eau')?.value || null
    }
    const obs = document.getElementById('edl-observations')?.value || ''
    await supabaseClient
      .from('etats_des_lieux')
      .update({ checklist: checklistDataRef.current, compteurs, observations: obs, photos_urls: photosUrlsRef.current })
      .eq('id', edl.id)
  }

  const selectState = (piece, element, state) => {
    setChecklistData(prev => {
      const updated = { ...prev, [piece]: { ...(prev[piece] || {}), [element]: state } }
      checklistDataRef.current = updated
      return updated
    })
    planifierAutoSave()
  }

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const verifierEdlSignature = useCallback((c1, c2, saisie) => {
    if (isAdminRef.current) { setBtnSignerDisabled(false); return }
    let nomValide = false
    if (saisie.length > 0 && edlSignataireNameRef.current) {
      const normaliser = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      nomValide = normaliser(saisie) === normaliser(edlSignataireNameRef.current)
      if (nomValide) {
        setSigInputClass('edl-sig-input valid'); setSigHintClass('edl-sig-hint success'); setSigHintText('Identit\u00e9 confirm\u00e9e')
      } else {
        setSigInputClass('edl-sig-input invalid'); setSigHintClass('edl-sig-hint error'); setSigHintText('Le nom ne correspond pas \u00e0 votre identit\u00e9')
      }
    } else {
      setSigInputClass('edl-sig-input'); setSigHintClass('edl-sig-hint'); setSigHintText('')
    }
    setBtnSignerDisabled(!(c1 && c2 && nomValide))
  }, [])

  const recupererIP = async () => {
    try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); return data.ip || 'inconnu' } catch { return 'inconnu' }
  }

  const genererHashEdl = async () => {
    const donnees = JSON.stringify({
      edl_id: edlDataRef.current?.id,
      contrat_id: contratDataRef.current?.id,
      checklist: checklistDataRef.current,
      compteurs: { electricite: compteurElec, gaz: compteurGaz, eau: compteurEau },
      observations,
      photos: photosUrlsRef.current
    })
    const encoder = new TextEncoder()
    const data = encoder.encode(donnees)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const signerEdlAvecPreuves = async () => {
    const edl = edlDataRef.current
    if (!edl) return
    const role = isLocataireRef.current ? 'locataire' : 'proprietaire'
    if (role === 'locataire' && edl.signature_locataire) return
    if (role === 'proprietaire' && edl.signature_proprietaire) return

    setBtnSignerDisabled(true)
    setBtnSignerText('Collecte des preuves...')

    try {
      await sauvegarderDonnees()
      const now = new Date().toISOString()
      const [ipAddress, documentHash] = await Promise.all([recupererIP(), genererHashEdl()])
      const userAgent = navigator.userAgent
      const md = matchDataRef.current
      const cud = currentUserDataRef.current
      const email = isLocataireRef.current ? md.users.email : (cud?.email || '')
      const nomComplet = edlSignataireNameRef.current
      const consentement = 'J\'ai inspect\u00e9 le logement en pr\u00e9sence de l\'autre partie. J\'accepte cet \u00e9tat des lieux comme r\u00e9f\u00e9rence pour la sortie.'

      setBtnSignerText('Signature en cours...')

      let updateData = {}
      let newStatut = ''
      if (role === 'locataire') {
        updateData = { signature_locataire: true, date_signature_locataire: now, signature_locataire_ip: ipAddress, signature_locataire_user_agent: userAgent, signature_locataire_hash: documentHash, signature_locataire_email: email, signature_locataire_nom_complet: nomComplet, signature_locataire_consentement: consentement }
        newStatut = edl.signature_proprietaire ? 'valide' : 'signe_locataire'
      } else {
        updateData = { signature_proprietaire: true, date_signature_proprietaire: now, signature_proprietaire_ip: ipAddress, signature_proprietaire_user_agent: userAgent, signature_proprietaire_hash: documentHash, signature_proprietaire_email: email, signature_proprietaire_nom_complet: nomComplet, signature_proprietaire_consentement: consentement }
        newStatut = edl.signature_locataire ? 'valide' : 'signe_proprietaire'
      }
      updateData.statut = newStatut
      if (!edl.document_hash) updateData.document_hash = documentHash

      const { error } = await supabaseClient.from('etats_des_lieux').update(updateData).eq('id', edl.id)
      if (error) { showMessage('error', 'Erreur lors de la signature : ' + error.message); setBtnSignerDisabled(false); setBtnSignerText('Signer l\'\u00e9tat des lieux'); return }

      await supabaseClient.from('signatures_audit').insert({
        document_type: 'etat_des_lieux', document_id: edl.id, user_id: user.id,
        user_email: email, user_nom_complet: nomComplet, role_signataire: role,
        ip_address: ipAddress, user_agent: userAgent, document_hash: documentHash,
        consentement_texte: consentement,
        metadata: { edl_id: edl.id, contrat_id: contratDataRef.current?.id, candidature_id: matchId, type: 'entree' }
      })

      Object.assign(edl, updateData)
      edlDataRef.current = edl

      // Update signature display
      if (role === 'locataire') {
        setLocataireSigned(true)
        setLocataireSignDate(`Sign\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`)
      } else {
        setProprietaireSigned(true)
        setProprietaireSignDate(`Sign\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`)
      }

      showMessage('success', 'Votre signature a \u00e9t\u00e9 enregistr\u00e9e avec preuve l\u00e9gale !')

      // Check if both signed
      const dejaSigneParMoi = true
      setShowSignForm(false)
      setShowDejaSign(true)

      if (edl.signature_locataire && edl.signature_proprietaire) {
        setDejaSigneTitle('\u00c9tat des lieux valid\u00e9 !')
        setDejaSigneMsg('Les deux parties ont sign\u00e9. Vous pouvez continuer.')
        setBtnValiderDisabled(false)
        setBtnValiderText('Continuer vers le logement actif')
      } else {
        const autrePart = isLocataireRef.current ? 'du propri\u00e9taire' : 'du locataire'
        setDejaSigneMsg(`En attente de la signature ${autrePart}.`)
        setBtnValiderDisabled(true)
      }
    } catch (err) {
      console.error('Erreur signature:', err)
      showMessage('error', 'Erreur lors de la signature')
      setBtnSignerDisabled(false)
      setBtnSignerText('Signer l\'\u00e9tat des lieux')
    }
  }

  const validerEtatDesLieux = async () => {
    setBtnValiderDisabled(true)
    setBtnValiderText('Validation en cours...')
    try {
      if (edlDataRef.current) {
        await sauvegarderDonnees()
        await supabaseClient.from('candidatures').update({ statut: 'actif' }).eq('id', matchId)
      }
      showMessage('success', '\u00c9tat des lieux valid\u00e9 ! Redirection...')
      setTimeout(() => { navigate(`/match-actif?match_id=${matchId || ''}`) }, 1500)
    } catch (error) {
      console.error('Erreur:', error)
      showMessage('error', 'Erreur lors de la validation')
      setBtnValiderDisabled(false)
      setBtnValiderText('Valider et finaliser')
    }
  }

  const handlePhotos = async (event) => {
    const files = Array.from(event.target.files)
    if (!files.length) return
    for (const file of files) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) { alert('Format non accept\u00e9. Formats autoris\u00e9s : JPG, PNG, WebP.'); continue }
      if (file.size > 5 * 1024 * 1024) { alert('Photo trop lourde (max 5 Mo).'); continue }

      const edl = edlDataRef.current
      if (edl) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`
        const filePath = `etats-des-lieux/${edl.id}/${fileName}`
        const { error: uploadError } = await supabaseClient.storage.from('etats-des-lieux').upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) {
          photosUrlsRef.current = [...photosUrlsRef.current, `local:${file.name}`]
        } else {
          const { data: urlData } = supabaseClient.storage.from('etats-des-lieux').getPublicUrl(filePath)
          photosUrlsRef.current = [...photosUrlsRef.current, urlData.publicUrl || filePath]
        }
      } else {
        photosUrlsRef.current = [...photosUrlsRef.current, `local:${file.name}`]
      }
      setPhotosUrls([...photosUrlsRef.current])
    }
    planifierAutoSave()
    event.target.value = ''
  }

  const removePhoto = async (index) => {
    const url = photosUrlsRef.current[index]
    if (url && !url.startsWith('local:') && edlDataRef.current) {
      const pathMatch = url.match(/etats-des-lieux\/.+/)
      if (pathMatch) {
        await supabaseClient.storage.from('etats-des-lieux').remove([pathMatch[0]])
      }
    }
    const newUrls = [...photosUrlsRef.current]
    newUrls.splice(index, 1)
    photosUrlsRef.current = newUrls
    setPhotosUrls(newUrls)
    planifierAutoSave()
  }

  // Init
  useEffect(() => {
    async function init() {
      try {
        if (!user) {
          if (!matchId) {
            isLocataireRef.current = true
            edlSignataireNameRef.current = 'Marie Martin'
            setEdlSigNom('Marie Martin')
            setEdlSigEmail('marie.martin@email.com')
            setRetourHref('/paiement')
          }
          return
        }

        const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
        currentUserDataRef.current = userData
        isAdminRef.current = userData?.is_admin === true

        if (!matchId) {
          isLocataireRef.current = true
          edlSignataireNameRef.current = 'Marie Martin'
          setEdlSigNom('Marie Martin')
          setEdlSigEmail('marie.martin@email.com')
          setRetourHref('/paiement')
          return
        }

        const { data: candidature, error } = await supabaseClient
          .from('candidatures')
          .select('*, annonces (*), users!candidatures_locataire_id_fkey (*)')
          .eq('id', matchId)
          .single()

        if (error) throw error
        matchDataRef.current = candidature

        if (candidature.statut === 'actif') { navigate(`/match-actif?match_id=${matchId}`); return }

        const isLoc = (user.id === candidature.locataire_id)
        const isProp = (user.id === candidature.annonces.user_id)
        isLocataireRef.current = isLoc
        isProprietaireRef.current = isProp

        if (!isLoc && !isProp && !isAdminRef.current) {
          alert('Vous n\'\u00eates pas autoris\u00e9 \u00e0 acc\u00e9der \u00e0 cet \u00e9tat des lieux.')
          navigate('/')
          return
        }

        const { data: contrat } = await supabaseClient.from('contrats').select('*').eq('candidature_id', matchId).single()
        contratDataRef.current = contrat

        // Load or create EDL
        if (contrat) {
          const { data: existingEdl } = await supabaseClient.from('etats_des_lieux').select('*').eq('contrat_id', contrat.id).eq('type', 'entree').single()

          let edl
          if (existingEdl) {
            edl = existingEdl
            // Restore data
            if (edl.checklist && Object.keys(edl.checklist).length > 0) {
              setChecklistData(edl.checklist)
              checklistDataRef.current = edl.checklist
            }
            if (edl.compteurs) {
              if (edl.compteurs.electricite) setCompteurElec(edl.compteurs.electricite)
              if (edl.compteurs.gaz) setCompteurGaz(edl.compteurs.gaz)
              if (edl.compteurs.eau) setCompteurEau(edl.compteurs.eau)
            }
            if (edl.observations) setObservations(edl.observations)
            if (edl.photos_urls && edl.photos_urls.length > 0) {
              photosUrlsRef.current = edl.photos_urls
              setPhotosUrls(edl.photos_urls)
            }
            if (edl.signature_locataire) {
              setLocataireSigned(true)
              setLocataireSignDate(`Sign\u00e9 le ${new Date(edl.date_signature_locataire).toLocaleDateString('fr-FR')}`)
            }
            if (edl.signature_proprietaire) {
              setProprietaireSigned(true)
              setProprietaireSignDate(`Sign\u00e9 le ${new Date(edl.date_signature_proprietaire).toLocaleDateString('fr-FR')}`)
            }
          } else {
            const { data: newEdl, error: createError } = await supabaseClient.from('etats_des_lieux').insert({
              contrat_id: contrat.id, candidature_id: matchId, locataire_id: contrat.locataire_id,
              proprietaire_id: contrat.proprietaire_id, annonce_id: contrat.annonce_id, type: 'entree', statut: 'en_cours'
            }).select().single()
            if (createError) { console.error('Erreur cr\u00e9ation EDL:', createError); return }
            edl = newEdl
          }
          edlDataRef.current = edl

          // Configure signatures
          let nom, emailVal
          if (isLoc) {
            nom = `${candidature.users.prenom} ${candidature.users.nom}`
            emailVal = candidature.users.email
          } else {
            nom = userData ? `${userData.prenom} ${userData.nom}` : ''
            emailVal = userData ? userData.email : ''
          }
          edlSignataireNameRef.current = nom
          setEdlSigNom(nom)
          setEdlSigEmail(emailVal)

          const dejaSigneParMoi = (isLoc && edl.signature_locataire) || (isProp && edl.signature_proprietaire)
          if (dejaSigneParMoi) {
            setShowSignForm(false)
            setShowDejaSign(true)
            if (edl.signature_locataire && edl.signature_proprietaire) {
              setDejaSigneTitle('\u00c9tat des lieux valid\u00e9 !')
              setDejaSigneMsg('Les deux parties ont sign\u00e9. Vous pouvez continuer.')
              setBtnValiderDisabled(false)
              setBtnValiderText('Continuer vers le logement actif')
            } else {
              const autrePart = isLoc ? 'du propri\u00e9taire' : 'du locataire'
              setDejaSigneMsg(`En attente de la signature ${autrePart}.`)
              setBtnValiderDisabled(true)
            }
          }
        }

        setRetourHref(`/paiement?match_id=${matchId}`)
      } catch (err) {
        console.error('Erreur init:', err)
        alert('Erreur lors du chargement de l\'\u00e9tat des lieux.')
      }
    }
    init()
  }, [user, matchId, navigate])

  const handleSigNameChange = (e) => {
    const val = autoCapitalize(e.target.value)
    setSigSaisieNom(val)
    verifierEdlSignature(checkInspecte, checkAccepteEdl, val)
  }

  return (
    <div className="edl-page-container">
      {messageBar && <div className={`edl-message-bar ${messageBar.type}`}>{messageBar.text}</div>}

      <div className="edl-page-header">
        <h1>&Eacute;tat des lieux d&rsquo;entr&eacute;e</h1>
        <p>Inspectez le logement et prenez des photos avant l&rsquo;emm&eacute;nagement</p>
      </div>

      {/* PROGRESS */}
      <div className="progress-card">
        <div className="progress-steps">
          <div className="progress-line"><div className="progress-line-fill" /></div>
          {['Match', 'Dossier', 'Contrat', 'Paiement'].map((label, i) => (
            <div key={i} className="progress-step completed">
              <div className="progress-circle">&#10003;</div>
              <div className="progress-label">{label}</div>
            </div>
          ))}
          <div className="progress-step active">
            <div className="progress-circle">5</div>
            <div className="progress-label">&Eacute;tat des lieux</div>
          </div>
        </div>
      </div>

      {/* ALERT */}
      <div className="edl-alert-info">
        <div className="edl-alert-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </div>
        <div className="edl-alert-content">
          <div className="edl-alert-title">&Agrave; faire le jour de la remise des cl&eacute;s</div>
          <div className="edl-alert-text">Inspectez chaque pi&egrave;ce ensemble (locataire et propri&eacute;taire). Prenez des photos et notez l&rsquo;&eacute;tat de chaque &eacute;l&eacute;ment. Cet &eacute;tat des lieux servira de r&eacute;f&eacute;rence &agrave; la sortie.</div>
        </div>
      </div>

      {/* ROOM SECTIONS */}
      {ROOMS.map((room) => (
        <div key={room.id} className={`section-card${collapsedSections[room.id] ? ' collapsed' : ''}`}>
          <div className="section-header" onClick={() => toggleSection(room.id)}>
            <div className="section-title">
              <span className={`section-icon ${room.iconClass}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={room.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{room.svgPath}</svg>
              </span>
              {room.label}
            </div>
            <span className="section-toggle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
          <div className="section-content">
            <div className="edl-checklist-grid">
              {room.items.map((item, idx) => (
                <div key={idx} className="edl-checklist-item">
                  <div className="edl-checklist-item-label">{item}</div>
                  <div className="edl-state-buttons">
                    {STATES.map((state) => (
                      <button
                        key={state}
                        className={`edl-state-btn${checklistData[room.id]?.[room.itemKeys[idx]] === state ? ` active state-${state}` : ''}`}
                        onClick={() => selectState(room.id, room.itemKeys[idx], state)}
                      >
                        {STATE_LABELS[state]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* COMPTEURS */}
      <div className="section-card">
        <div className="section-header" style={{ cursor: 'default' }}>
          <div className="section-title">
            <span className="section-icon compteurs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </span>
            Relev&eacute;s des compteurs
          </div>
        </div>
        <div className="section-content">
          <div className="edl-compteurs-grid">
            <div className="edl-compteur-item">
              <div className="edl-compteur-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                &Eacute;lectricit&eacute;
              </div>
              <input type="number" className="edl-compteur-input" id="compteur-elec" placeholder="12345" value={compteurElec} onChange={(e) => { setCompteurElec(e.target.value); planifierAutoSave() }} />
            </div>
            <div className="edl-compteur-item">
              <div className="edl-compteur-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                Gaz
              </div>
              <input type="number" className="edl-compteur-input" id="compteur-gaz" placeholder="6789" value={compteurGaz} onChange={(e) => { setCompteurGaz(e.target.value); planifierAutoSave() }} />
            </div>
            <div className="edl-compteur-item">
              <div className="edl-compteur-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>
                Eau
              </div>
              <input type="number" className="edl-compteur-input" id="compteur-eau" placeholder="4567" value={compteurEau} onChange={(e) => { setCompteurEau(e.target.value); planifierAutoSave() }} />
            </div>
          </div>
        </div>
      </div>

      {/* PHOTOS */}
      <div className="section-card">
        <div className="section-header" style={{ cursor: 'default' }}>
          <div className="section-title">
            <span className="section-icon photos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            </span>
            Photos du logement
          </div>
        </div>
        <div className="section-content">
          <label htmlFor="photosInput" className="edl-photos-upload-zone">
            <div className="edl-upload-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div className="edl-upload-text">Ajouter des photos</div>
            <div className="edl-upload-subtext">Prenez des photos de chaque pi&egrave;ce et &eacute;quipement</div>
            <input type="file" id="photosInput" accept="image/*" multiple onChange={handlePhotos} />
          </label>
          {photosUrls.length > 0 && (
            <div className="edl-photos-preview">
              {photosUrls.map((url, i) => (
                <div key={i} className="edl-photo-preview">
                  {!url.startsWith('local:') ? (
                    <img loading="lazy" src={url} alt={`Photo ${i + 1}`} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F1F5F9', color: '#94A3B8', fontSize: 12 }}>Photo {i + 1}</div>
                  )}
                  <button className="edl-photo-remove" onClick={() => removePhoto(i)}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OBSERVATIONS */}
      <div className="section-card">
        <div className="section-header" style={{ cursor: 'default' }}>
          <div className="section-title">
            <span className="section-icon observations">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </span>
            Observations g&eacute;n&eacute;rales
          </div>
        </div>
        <div className="section-content">
          <textarea className="edl-observations-textarea" id="edl-observations" placeholder="Notez ici toute observation particuli\u00e8re (rayures, taches, d\u00e9fauts visibles...)" value={observations} onChange={(e) => { setObservations(e.target.value); planifierAutoSave() }} />
        </div>
      </div>

      {/* SIGNATURES */}
      <div className="section-card">
        <div className="section-header" style={{ cursor: 'default' }}>
          <div className="section-title">
            <span className="section-icon signatures">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
            </span>
            Signatures
          </div>
        </div>
        <p className="edl-signatures-subtitle">Les deux parties doivent signer pour valider l&rsquo;&eacute;tat des lieux</p>

        <div className="edl-signatures-grid">
          <div className={`edl-signature-box${locataireSigned ? ' signed' : ''}`}>
            <div className="edl-signature-title">Locataire</div>
            <div className="edl-signature-status-icon">
              {locataireSigned ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              )}
            </div>
            <div className="edl-signature-date">{locataireSignDate}</div>
          </div>
          <div className={`edl-signature-box${proprietaireSigned ? ' signed' : ''}`}>
            <div className="edl-signature-title">Propri&eacute;taire</div>
            <div className="edl-signature-status-icon">
              {proprietaireSigned ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              )}
            </div>
            <div className="edl-signature-date">{proprietaireSignDate}</div>
          </div>
        </div>

        {/* Sign form */}
        {showSignForm && (
          <div className="edl-sig-form-wrapper">
            <div className="edl-sig-section-title">Signature de l&rsquo;&eacute;tat des lieux</div>
            <div className="edl-sig-identity">
              <div className="edl-sig-identity-avatar">
                <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div className="edl-sig-identity-info">
                <div className="edl-sig-identity-label">Vous signez en tant que</div>
                <div className="edl-sig-identity-name">{edlSigNom}</div>
                <div className="edl-sig-identity-email">{edlSigEmail}</div>
              </div>
            </div>
            <div className="edl-sig-consents">
              <label className="edl-sig-check">
                <input type="checkbox" checked={checkInspecte} onChange={(e) => { setCheckInspecte(e.target.checked); verifierEdlSignature(e.target.checked, checkAccepteEdl, sigSaisieNom) }} />
                <span className="edl-sig-check-label">Je certifie avoir inspect&eacute; le logement en pr&eacute;sence de l&rsquo;autre partie et avoir constat&eacute; l&rsquo;&eacute;tat d&eacute;crit ci-dessus.</span>
              </label>
              <label className="edl-sig-check">
                <input type="checkbox" checked={checkAccepteEdl} onChange={(e) => { setCheckAccepteEdl(e.target.checked); verifierEdlSignature(checkInspecte, e.target.checked, sigSaisieNom) }} />
                <span className="edl-sig-check-label">J&rsquo;accepte que cet &eacute;tat des lieux serve de r&eacute;f&eacute;rence pour la comparaison lors de l&rsquo;&eacute;tat des lieux de sortie.</span>
              </label>
            </div>
            <div className="edl-sig-confirm">
              <label className="edl-sig-confirm-label" htmlFor="edlSaisieNom">
                <svg viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                Pr&eacute;nom et nom
              </label>
              <input type="text" className={sigInputClass} id="edlSaisieNom" placeholder="Pr\u00e9nom Nom" autoComplete="off" value={sigSaisieNom} onChange={handleSigNameChange} />
              <div className={sigHintClass}>{sigHintText}</div>
            </div>
            <button className="edl-btn-signer" disabled={btnSignerDisabled} onClick={signerEdlAvecPreuves}>{btnSignerText}</button>
            <div className="edl-sig-legal">
              <p><strong>Signature &eacute;lectronique &agrave; valeur l&eacute;gale</strong></p>
              <p>Art. 1367 du Code civil et r&egrave;glement eIDAS. Preuves enregistr&eacute;es : identit&eacute;, e-mail, horodatage, IP, empreinte SHA-256 et consentement.</p>
            </div>
          </div>
        )}

        {showDejaSign && (
          <div className="edl-sig-done">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <div className="edl-sig-done-title">{dejaSigneTitle}</div>
            <div className="edl-sig-done-msg">{dejaSigneMsg}</div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="actions-card">
        <Link to={retourHref} className="btn-back">Retour</Link>
        <button className="btn-primary" disabled={btnValiderDisabled} onClick={validerEtatDesLieux}>{btnValiderText}</button>
      </div>
    </div>
  )
}
