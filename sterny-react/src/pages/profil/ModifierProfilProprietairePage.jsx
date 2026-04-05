import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import Footer from '../../components/layout/Footer'
import './ModifierProfilProprietairePage.css'

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, (match) => match.toUpperCase())
}

export default function ModifierProfilProprietairePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  // Crop state
  const [showCrop, setShowCrop] = useState(false)
  const [cropImgSrc, setCropImgSrc] = useState('')
  const [cropZoom, setCropZoom] = useState(100)
  const [cropMinZoom, setCropMinZoom] = useState(100)
  const cropAreaRef = useRef(null)
  const cropImageRef = useRef(null)
  const photoInputRef = useRef(null)
  const cropState = useRef({ dragging: false, startX: 0, startY: 0, imgX: 0, imgY: 0, imgStartX: 0, imgStartY: 0, scale: 1 })

  // Email prefs
  const [prefMessages, setPrefMessages] = useState(true)
  const [prefCandidatures, setPrefCandidatures] = useState(true)
  const [prefPaiements, setPrefPaiements] = useState(true)
  const [prefBaux, setPrefBaux] = useState(true)
  const [prefMarketing, setPrefMarketing] = useState(true)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const prefsSaveTimeoutRef = useRef(null)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showEmails, setShowEmails] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    const checkAuth = async () => {
      setEmailValue(user.email || '')
      const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
      if (userData) {
        setIsAdmin(userData.is_admin === true)
        if (userData.prenom) setPrenom(userData.prenom)
        if (userData.nom) setNom(userData.nom)
        if (userData.telephone) setTelephone(userData.telephone)
        if (userData.photo_profil_url) {
          setPhotoPreviewUrl(userData.photo_profil_url)
          setShowPlaceholder(false)
        }
      }
      // Load email prefs
      const { data: prefsData } = await supabaseClient.from('users').select('preferences_email').eq('id', user.id).single()
      if (prefsData && prefsData.preferences_email) {
        const p = prefsData.preferences_email
        setPrefMessages(p.messages !== false)
        setPrefCandidatures(p.candidatures !== false)
        setPrefPaiements(p.paiements !== false)
        setPrefBaux(p.baux !== false)
        setPrefMarketing(p.marketing !== false)
      }
    }
    checkAuth()
  }, [user])

  const showError = (msg) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(''), 4000)
  }

  // Crop functions
  const openCropper = (file) => {
    if (!file.type.match('image.*')) { showError('Le fichier doit être une image (JPG, PNG, WEBP)'); return }
    if (file.size > 5 * 1024 * 1024) { showError('La photo ne doit pas dépasser 5 MB'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      setCropImgSrc(e.target.result)
      setShowCrop(true)
    }
    reader.readAsDataURL(file)
  }

  const onCropImageLoad = useCallback(() => {
    const img = cropImageRef.current
    if (!img) return
    const areaSize = 220
    const ratio = Math.max(areaSize / img.naturalWidth, areaSize / img.naturalHeight)
    cropState.current.scale = ratio
    const minZoom = Math.round(ratio * 100)
    setCropMinZoom(minZoom)
    setCropZoom(minZoom)
    const w = img.naturalWidth * ratio
    const h = img.naturalHeight * ratio
    img.style.width = w + 'px'
    img.style.height = h + 'px'
    cropState.current.imgX = (areaSize - w) / 2
    cropState.current.imgY = (areaSize - h) / 2
    img.style.left = cropState.current.imgX + 'px'
    img.style.top = cropState.current.imgY + 'px'
  }, [])

  const clampPosition = () => {
    const img = cropImageRef.current
    if (!img) return
    const areaSize = 220
    const s = cropState.current
    const w = img.naturalWidth * s.scale
    const h = img.naturalHeight * s.scale
    if (s.imgX > 0) s.imgX = 0
    if (s.imgY > 0) s.imgY = 0
    if (s.imgX < areaSize - w) s.imgX = areaSize - w
    if (s.imgY < areaSize - h) s.imgY = areaSize - h
    img.style.left = s.imgX + 'px'
    img.style.top = s.imgY + 'px'
  }

  const handleCropZoom = (e) => {
    const val = parseInt(e.target.value)
    setCropZoom(val)
    const img = cropImageRef.current
    if (!img) return
    const s = cropState.current
    const oldScale = s.scale
    s.scale = val / 100
    const areaSize = 220
    const cX = areaSize / 2, cY = areaSize / 2
    const relX = (cX - s.imgX) / (img.naturalWidth * oldScale)
    const relY = (cY - s.imgY) / (img.naturalHeight * oldScale)
    img.style.width = (img.naturalWidth * s.scale) + 'px'
    img.style.height = (img.naturalHeight * s.scale) + 'px'
    s.imgX = cX - relX * img.naturalWidth * s.scale
    s.imgY = cY - relY * img.naturalHeight * s.scale
    clampPosition()
  }

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      const s = cropState.current
      if (!s.dragging) return
      s.imgX = s.imgStartX + (clientX - s.startX)
      s.imgY = s.imgStartY + (clientY - s.startY)
      clampPosition()
    }
    const onMouseMove = (e) => handleMove(e.clientX, e.clientY)
    const onTouchMove = (e) => { if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY) }
    const onUp = () => { cropState.current.dragging = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const startDrag = (clientX, clientY) => {
    const s = cropState.current
    s.dragging = true
    s.startX = clientX
    s.startY = clientY
    s.imgStartX = s.imgX
    s.imgStartY = s.imgY
  }

  const confirmCrop = () => {
    const img = cropImageRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const areaSize = 220
    const s = cropState.current
    const sourceX = -s.imgX / s.scale
    const sourceY = -s.imgY / s.scale
    const sourceSize = areaSize / s.scale
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'photo-profil.jpg', { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreviewUrl(URL.createObjectURL(blob))
      setShowPlaceholder(false)
      setShowCrop(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }, 'image/jpeg', 0.9)
  }

  const cancelCrop = () => {
    setShowCrop(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // Save profile
  const enregistrerProfil = async () => {
    if (!isAdmin) {
      if (!prenom.trim()) { showError('Merci de renseigner votre prénom'); return }
      if (!nom.trim()) { showError('Merci de renseigner votre nom'); return }
      if (!telephone.trim()) { showError('Merci de renseigner votre téléphone'); return }
    }
    setLoading(true)
    try {
      let photoUrl = null
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabaseClient.storage.from('profils').upload(fileName, photoFile, { cacheControl: '3600', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabaseClient.storage.from('profils').getPublicUrl(fileName)
          photoUrl = urlData.publicUrl
        }
      }
      const updateData = { prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim() || null }
      if (photoUrl) updateData.photo_profil_url = photoUrl
      const { error } = await supabaseClient.from('users').update(updateData).eq('id', user.id)
      if (error) throw error
      setSuccessMsg('Profil mis à jour avec succès !')
      setTimeout(() => navigate('/dashboard/proprietaire'), 1500)
    } catch (err) {
      console.error('Erreur:', err)
      setLoading(false)
      showError(err.message || 'Une erreur est survenue')
    }
  }

  // Email prefs
  const sauvegarderPrefsEmail = useCallback(() => {
    if (!user) return
    clearTimeout(prefsSaveTimeoutRef.current)
    prefsSaveTimeoutRef.current = setTimeout(async () => {
      const prefs = { messages: prefMessages, candidatures: prefCandidatures, paiements: prefPaiements, baux: prefBaux, marketing: prefMarketing }
      const { error } = await supabaseClient.from('users').update({ preferences_email: prefs }).eq('id', user.id)
      if (!error) {
        setPrefsSaved(true)
        setTimeout(() => setPrefsSaved(false), 2000)
      }
    }, 500)
  }, [user, prefMessages, prefCandidatures, prefPaiements, prefBaux, prefMarketing])

  // Password
  const changerMotDePasse = async () => {
    setPasswordMsg(null)
    if (!newPassword || !confirmPassword) { setPasswordMsg({ type: 'error', text: 'Remplis les deux champs.' }); return }
    if (newPassword.length < 6) { setPasswordMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' }); return }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return }
    setPasswordLoading(true)
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMsg({ type: 'success', text: 'Mot de passe modifié avec succès !' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe.' })
    }
    setPasswordLoading(false)
  }

  return (
    <>
      {/* MODAL RECADRAGE */}
      {showCrop && (
        <div className="crop-overlay-proprio">
          <div className="crop-modal-proprio">
            <h3>RECADRER</h3>
            <p className="crop-hint">Déplace et zoome pour ajuster</p>
            <div
              className="crop-area-proprio"
              ref={cropAreaRef}
              onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
              onTouchStart={(e) => { if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
            >
              <img
                ref={cropImageRef}
                src={cropImgSrc}
                alt="Photo à recadrer"
                onLoad={onCropImageLoad}
                loading="lazy"
              />
            </div>
            <div className="crop-zoom-proprio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
              <input type="range" min={cropMinZoom} max={cropMinZoom * 3} value={cropZoom} onChange={handleCropZoom} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M11 8v6M8 11h6"/></svg>
            </div>
            <div className="crop-actions-proprio">
              <button className="crop-cancel-proprio" onClick={cancelCrop}>Annuler</button>
              <button className="crop-confirm-proprio" onClick={confirmCrop}>Appliquer</button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE */}
      <section className="page-inscription-proprio">
        <div className="mpp-wrapper">
          <div className="inscription-container-proprio">
            <div className="inscription-header-proprio">
              <h1>Mon profil</h1>
            </div>

            {errorMsg && <div className="error-message-proprio">{errorMsg}</div>}
            {successMsg && <div className="success-message-proprio">{successMsg}</div>}

            {/* Photo */}
            <input type="file" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) openCropper(e.target.files[0]) }} />

            <div className="mpp-photo-center mpp-stagger" style={{ animationDelay: '0.08s' }} onClick={() => photoInputRef.current?.click()}>
              <div className="mpp-photo-circle">
                {!showPlaceholder && photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Photo de profil" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </div>
              <span className="mpp-photo-action">{photoPreviewUrl && !showPlaceholder ? 'Modifier la photo' : 'Ajouter une photo'}</span>
            </div>

            {/* Champs */}
            <div className="form-row-proprio mpp-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="form-group-proprio">
                <label>Prénom <span className="required">*</span></label>
                <input type="text" value={prenom} onChange={(e) => setPrenom(capitalizeWords(e.target.value))} placeholder="Prénom" />
              </div>
              <div className="form-group-proprio">
                <label>Nom <span className="required">*</span></label>
                <input type="text" value={nom} onChange={(e) => setNom(capitalizeWords(e.target.value))} placeholder="Nom" />
              </div>
            </div>

            <div className="form-row-proprio mpp-stagger" style={{ animationDelay: '0.24s' }}>
              <div className="form-group-proprio">
                <label>Téléphone <span className="required">*</span></label>
                <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
              </div>
              <div className="form-group-proprio">
                <label>Email</label>
                <input type="email" value={emailValue} disabled />
              </div>
            </div>

            {/* Boutons */}
            <div className="buttons-row-proprio mpp-stagger" style={{ animationDelay: '0.32s' }}>
              <Link to="/dashboard/proprietaire" className="btn-back-proprio">Annuler</Link>
              <button className={`btn-next-proprio${loading ? ' loading' : ''}`} onClick={enregistrerProfil} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

          </div>

          {/* Liens discrets sous la card */}
          <div className="mpp-links mpp-stagger" style={{ animationDelay: '0.40s' }}>
            <button className={`mpp-link${showEmails ? ' active' : ''}`} onClick={() => { setShowEmails(!showEmails); setShowPassword(false) }}>Notifications email</button>
            <span className="mpp-link-dot" />
            <button className={`mpp-link${showPassword ? ' active' : ''}`} onClick={() => { setShowPassword(!showPassword); setShowEmails(false) }}>Modifier le mot de passe</button>
          </div>

          {/* PRÉFÉRENCES EMAIL */}
          {showEmails && (
            <div className="mpp-card-secondary">
              {[
                { label: 'Messages', desc: 'Notification quand tu reçois un message', value: prefMessages, setter: setPrefMessages },
                { label: 'Candidatures', desc: 'Nouvelles candidatures sur tes annonces', value: prefCandidatures, setter: setPrefCandidatures },
                { label: 'Paiements', desc: 'Reçus et rappels de paiement', value: prefPaiements, setter: setPrefPaiements },
                { label: 'Baux', desc: 'Fin de bail, renouvellement', value: prefBaux, setter: setPrefBaux },
                { label: 'Actualités STERNY', desc: 'Nouveautés et offres de la plateforme', value: prefMarketing, setter: setPrefMarketing },
              ].map(({ label, desc, value, setter }) => (
                <div className="pref-row-proprio" key={label}>
                  <div>
                    <div className="pref-label-proprio">{label}</div>
                    <div className="pref-desc-proprio">{desc}</div>
                  </div>
                  <label className="toggle-switch-proprio">
                    <input type="checkbox" checked={value} onChange={(e) => { setter(e.target.checked); sauvegarderPrefsEmail() }} />
                    <span className="toggle-slider-proprio" />
                  </label>
                </div>
              ))}
              <div className={`prefs-saved-proprio${prefsSaved ? ' show' : ''}`}>Préférences sauvegardées</div>
            </div>
          )}

          {/* MOT DE PASSE */}
          {showPassword && (
            <div className="mpp-card-secondary">
              <div className="password-section-text-proprio">
                Nouveau mot de passe (min. 6 caractères).
              </div>
              <div className="form-row-proprio">
                <div className="form-group-proprio">
                  <label htmlFor="newPasswordProprio">Nouveau</label>
                  <input type="password" id="newPasswordProprio" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" autoComplete="new-password" />
                </div>
                <div className="form-group-proprio">
                  <label htmlFor="confirmPasswordProprio">Confirmer</label>
                  <input type="password" id="confirmPasswordProprio" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retape le mot de passe" autoComplete="new-password" />
                </div>
              </div>
              <button className="btn-change-password-proprio" onClick={changerMotDePasse} disabled={passwordLoading}>
                {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
              {passwordMsg && <div className={`password-message-proprio ${passwordMsg.type}`}>{passwordMsg.text}</div>}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
