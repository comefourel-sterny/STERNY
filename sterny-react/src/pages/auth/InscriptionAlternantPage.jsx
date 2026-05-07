import { useState, useEffect, useRef } from 'react'
import {
  useInscriptionWizard,
  validateE1Email,
  getE1InvalidFields,
  validateE3,
  validateE4,
  validateE6,
} from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import AuthErrorBanner from '../../components/auth-wizard/AuthErrorBanner'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import IntentCardRadio from '../../components/auth-wizard/IntentCardRadio'
import AutocompleteInput from '../../components/auth-wizard/AutocompleteInput'
import CustomSelect from '../../components/auth-wizard/CustomSelect'
import PhotoCropperModal from '../../components/auth-wizard/PhotoCropperModal'
import WizardProgressBar from '../../components/auth-wizard/WizardProgressBar'
import { ECOLES, ANNEES_ETUDES, FILIERES, VILLES_FRANCE } from '../../data/inscription-options'
import { formatPartialDateInput } from '../../utils/dateHelpers.js'
import { supabaseClient } from '../../config/supabase'
import './InscriptionAlternantPage.css'

// Helpers de transformation copiés depuis InscriptionRecherchePage pour ce
// sous-commit. Factorisation src/lib/format.js → DETTE séparée post-T2.
function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-ZÀ-ÿ])/g, (m) => m.toUpperCase())
}

function formatPhone(val) {
  if (val.startsWith('+')) {
    let digits = val.slice(1).replace(/\D/g, '')
    if (digits.length > 18) digits = digits.substring(0, 18)
    const groups = digits.match(/.{1,3}/g)
    return '+' + (groups ? groups.join(' ') : '')
  }
  let digits = val.replace(/\D/g, '').slice(0, 10)
  const groups = digits.match(/.{1,2}/g)
  return groups ? groups.join(' ') : ''
}

export default function InscriptionAlternantPage() {
  const {
    state,
    setField,
    setGlobalError,
    clearError,
    goToNextStep,
    goToPrevStep,
  } = useInscriptionWizard()
  const errorTimerRef = useRef(null)
  const prenomRef = useRef(null)
  const nomRef = useRef(null)
  const telephoneRef = useRef(null)
  const emailRef = useRef(null)
  const photoFileInputRef = useRef(null)
  const [invalidFields, setInvalidFields] = useState(() => new Set())
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperImageFile, setCropperImageFile] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [infoTooltipOpen, setInfoTooltipOpen] = useState(false)
  const toggleInfoTooltip = () => setInfoTooltipOpen(v => !v)

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  const handleKeyDown = (nextRef) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextRef && nextRef.current) {
        nextRef.current.focus()
      }
    }
  }

  const handleChange = (field, transform) => (e) => {
    const raw = e.target.value
    const value = transform ? transform(raw) : raw
    setField(field, value)
    if (state.globalError) clearError()
    if (invalidFields.has(field)) {
      const next = new Set(invalidFields)
      next.delete(field)
      setInvalidFields(next)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const message = validateE1Email(state)
    if (message) {
      const fields = getE1InvalidFields(state)
      setInvalidFields(fields)
      setGlobalError(message)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
      return
    }
    setInvalidFields(new Set())
    goToNextStep()
  }

  const handleE3Change = (e) => {
    setField(e.target.name, e.target.value)
    if (state.globalError) clearError()
  }

  const handleE3Submit = () => {
    const err = validateE3(state)
    if (err) {
      setGlobalError(err)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
      return
    }
    goToNextStep()
  }

  // Handler E-4 : AutocompleteInput émet un event {target:{value,name}}.
  // Le name correspond au champ state ('ville_entreprise' ou 'ville_ecole').
  const handleE4Change = (e) => {
    setField(e.target.name, e.target.value)
    if (state.globalError) clearError()
  }

  const handleE4Submit = () => {
    const err = validateE4(state)
    if (err) {
      setGlobalError(err)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
      return
    }
    goToNextStep()
  }

  // Handler E-6 : CustomSelect (sexe) émet un event {target:{value,name}}.
  // Le name correspond au champ state.
  const handleE6Change = (e) => {
    setField(e.target.name, e.target.value)
    if (state.globalError) clearError()
  }

  // Saisie progressive de date_naissance — applique formatPartialDateInput
  // (insertion auto des "/", troncature à 8 chiffres) avant stockage en state.
  // State stocké en JJ/MM/AAAA (Option A conv 14), conversion ISO différée à la RPC E-7.
  const handleDateNaissanceChange = (e) => {
    const formatted = formatPartialDateInput(e.target.value)
    setField('date_naissance', formatted)
    if (state.globalError) clearError()
  }

  const handleE6Submit = () => {
    const err = validateE6(state)
    if (err) {
      setGlobalError(err)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
      return
    }
    goToNextStep()
  }

  // Photo upload E-6 — bucket Storage 'profils', filename `${user.id}-${Date.now()}.jpg`
  // (Blob JPEG fixe sortant de PhotoCropperModal). Pas de ligne public.users avant E-7
  // (amendement conv 13) — la policy RLS profils_insert_own ne dépend que de auth.uid().
  const handlePhotoClick = () => {
    photoFileInputRef.current?.click()
  }

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropperImageFile(file)
    setCropperOpen(true)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob) => {
    setPhotoUploading(true)
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        setGlobalError('Session expirée — reconnecte-toi')
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => clearError(), 3000)
        return
      }
      const fileName = `${user.id}-${Date.now()}.jpg`
      const { error: upErr } = await supabaseClient.storage
        .from('profils')
        .upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' })
      if (upErr) {
        setGlobalError("Échec de l'upload de la photo. Réessaie.")
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => clearError(), 3000)
        return
      }
      const { data: urlData } = supabaseClient.storage
        .from('profils')
        .getPublicUrl(fileName)
      setField('photo_profil_url', urlData.publicUrl)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleCropClose = () => {
    setCropperOpen(false)
    setCropperImageFile(null)
  }

  if (state.currentStep === 2) {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={2/7} />
        <div className="ial-cards-stack">
          <IntentCardRadio
            name="type_user"
            value="locataire"
            checked={state.type_user === 'locataire'}
            onChange={() => setField('type_user', 'locataire')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
              </svg>
            }
            label={<>Je <span className="aw-intent-card-keyword">recherche</span> un logement</>}
            style={{ animationDelay: '0.16s' }}
          />
          <IntentCardRadio
            name="type_user"
            value="hote"
            checked={state.type_user === 'hote'}
            onChange={() => setField('type_user', 'hote')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/>
              </svg>
            }
            label={<>Je <span className="aw-intent-card-keyword">propose</span> mon logement</>}
            style={{ animationDelay: '0.24s' }}
          />
          <IntentCardRadio
            name="type_user"
            value="les_deux"
            checked={state.type_user === 'les_deux'}
            onChange={() => setField('type_user', 'les_deux')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M280-160 80-360l200-200 56 57-103 103h287v80H233l103 103-56 57Zm400-240-56-57 103-103H440v-80h287L624-743l56-57 200 200-200 200Z"/>
              </svg>
            }
            label={<>Les <span className="aw-intent-card-keyword">deux</span></>}
            style={{ animationDelay: '0.32s' }}
          />
        </div>
        <button
          type="button"
          className="ial-btn-continuer"
          disabled={!state.type_user}
          onClick={goToNextStep}
        >
          Continuer
        </button>
        <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" showSignInLink />
      </AuthScreenContainer>
    )
  }

  if (state.currentStep === 1) {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={1/7} />
        <form onSubmit={handleSubmit} className="ial-form" noValidate>
          <div className="ial-form-row">
            <TextInput
              ref={prenomRef}
              label="Prénom"
              placeholder="Ton prénom"
              type="text"
              name="prenom"
              autoComplete="given-name"
              value={state.prenom}
              onChange={handleChange('prenom', capitalizeWords)}
              onKeyDown={handleKeyDown(nomRef)}
              hasError={invalidFields.has('prenom')}
              autoFocus
            />
            <TextInput
              ref={nomRef}
              label="Nom"
              placeholder="Ton nom"
              type="text"
              name="nom"
              autoComplete="family-name"
              value={state.nom}
              onChange={handleChange('nom', capitalizeWords)}
              onKeyDown={handleKeyDown(telephoneRef)}
              hasError={invalidFields.has('nom')}
            />
          </div>
          <TextInput
            ref={telephoneRef}
            label="Téléphone"
            placeholder="Ton numéro de téléphone"
            type="tel"
            name="telephone"
            autoComplete="tel"
            value={state.telephone}
            onChange={handleChange('telephone', formatPhone)}
            onKeyDown={handleKeyDown(emailRef)}
            hasError={invalidFields.has('telephone')}
          />
          <TextInput
            ref={emailRef}
            label="Email"
            placeholder="Ton adresse email"
            type="email"
            name="email"
            autoComplete="email"
            value={state.email}
            onChange={handleChange('email')}
            hasError={invalidFields.has('email')}
          />
          <button type="submit" className="ial-btn-continuer">Continuer</button>
        </form>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks retourTo="/inscription" retourLabel="Retour" showSignInLink />}
      </AuthScreenContainer>
    )
  }

  if (state.currentStep === 3) {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={3/7} />
        <div className="ial-form">
          <AutocompleteInput
            name="ecole"
            label="École"
            value={state.ecole ?? ''}
            onChange={handleE3Change}
            suggestions={ECOLES}
            placeholder="Tape les premières lettres"
            required={false}
          />
          <AutocompleteInput
            name="annee_etudes"
            label="Année d'études"
            value={state.annee_etudes ?? ''}
            onChange={handleE3Change}
            suggestions={ANNEES_ETUDES}
            placeholder="Tape ton cursus"
            required={false}
          />
          <AutocompleteInput
            name="filiere"
            label="Filière"
            value={state.filiere ?? ''}
            onChange={handleE3Change}
            suggestions={FILIERES}
            placeholder="Ex : Informatique, GEA, Marketing"
            required={false}
          />
          <button type="button" className="ial-btn-continuer" onClick={handleE3Submit}>Continuer</button>
        </div>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />}
      </AuthScreenContainer>
    )
  }

  if (state.currentStep === 4) {
    const subtitleText = state.type_user === 'locataire'
      ? 'Dans quelle ville cherches-tu un logement ?'
      : state.type_user === 'hote'
        ? 'Dans quelle ville proposes-tu ton logement ?'
        : 'Renseigne tes deux villes'
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={4/7} />
        <p className="ial-step-subtitle">{subtitleText}</p>
        <div className="ial-form">
          {(state.type_user === 'locataire' || state.type_user === 'hote') && (
            <AutocompleteInput
              name="ville_entreprise"
              value={state.ville_entreprise ?? ''}
              onChange={handleE4Change}
              suggestions={VILLES_FRANCE}
              placeholder="Tape les premières lettres"
              required={false}
            />
          )}
          {state.type_user === 'les_deux' && (
            <>
              <label className="ial-field-label">Ville où tu proposes ton logement</label>
              <AutocompleteInput
                name="ville_entreprise"
                value={state.ville_entreprise ?? ''}
                onChange={handleE4Change}
                suggestions={VILLES_FRANCE}
                placeholder="Tape les premières lettres"
                required={false}
              />
              <label className="ial-field-label">Ville où tu cherches un logement</label>
              <AutocompleteInput
                name="ville_ecole"
                value={state.ville_ecole ?? ''}
                onChange={handleE4Change}
                suggestions={VILLES_FRANCE}
                placeholder="Tape les premières lettres"
                required={false}
              />
            </>
          )}
          <button type="button" className="ial-btn-continuer" onClick={handleE4Submit}>Continuer</button>
        </div>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />}
      </AuthScreenContainer>
    )
  }

  if (state.currentStep === 6) {
    const sexeOptions = [
      { value: 'homme', label: 'Homme' },
      { value: 'femme', label: 'Femme' },
      { value: 'autre', label: 'Autre' },
      { value: 'non-precise', label: 'Non précisé' },
    ]
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={6/7} />
        <div className="ial-form">
          <div className="ial-e6-photo-block">
            <input
              ref={photoFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              hidden
            />
            <button
              type="button"
              className={`ial-e6-photo-circle ${state.photo_profil_url ? 'filled' : 'empty'}`}
              onClick={handlePhotoClick}
              disabled={photoUploading}
              aria-label="Ajouter une photo de profil"
            >
              {state.photo_profil_url ? (
                <img src={state.photo_profil_url} alt="Photo de profil" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </button>
            <div className="ial-e6-photo-link-row">
              <button
                type="button"
                className="ial-e6-photo-link"
                onClick={handlePhotoClick}
                disabled={photoUploading}
              >
                {photoUploading ? 'Upload en cours…' : (state.photo_profil_url ? 'Modifier la photo' : 'Ajouter une photo')}
              </button>
              <div className="ial-e6-info-wrap">
                <button
                  type="button"
                  className="ial-e6-info-btn"
                  onClick={toggleInfoTooltip}
                  aria-label="En savoir plus"
                >
                  ⓘ
                </button>
                {infoTooltipOpen && (
                  <span className="ial-e6-info-text" role="tooltip">Une photo aide les autres alternants à te faire confiance.</span>
                )}
              </div>
            </div>
          </div>
          <div className="ial-e6-row">
            <TextInput
              name="date_naissance"
              label="Date de naissance"
              placeholder="JJ/MM/AAAA"
              inputMode="numeric"
              maxLength={10}
              value={state.date_naissance}
              onChange={handleDateNaissanceChange}
              autoComplete="bday"
            />
            <CustomSelect
              name="sexe"
              label="Sexe"
              options={sexeOptions}
              value={state.sexe}
              onChange={handleE6Change}
              placeholder="Sélectionner"
            />
          </div>
          <button type="button" className="ial-btn-continuer" onClick={handleE6Submit}>Continuer</button>
        </div>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />}
        <PhotoCropperModal
          open={cropperOpen}
          onClose={handleCropClose}
          onConfirm={handleCropConfirm}
          imageFile={cropperImageFile}
        />
      </AuthScreenContainer>
    )
  }

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title">INSCRIPTION</h1>
      <div className="ial-placeholder-content">
        Étape {state.currentStep} — À implémenter
      </div>
      <button type="button" className="ial-btn-continuer" onClick={goToNextStep}>Continuer (placeholder)</button>
      <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />
    </AuthScreenContainer>
  )
}
