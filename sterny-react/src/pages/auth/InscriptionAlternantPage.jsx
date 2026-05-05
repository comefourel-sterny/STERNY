import { useState, useEffect, useRef } from 'react'
import {
  useInscriptionWizard,
  validateE1Email,
  getE1InvalidFields,
} from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import AuthErrorBanner from '../../components/auth-wizard/AuthErrorBanner'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import IntentCardRadio from '../../components/auth-wizard/IntentCardRadio'
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
  const [invalidFields, setInvalidFields] = useState(() => new Set())

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

  if (state.currentStep === 2) {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <div className="ial-cards-stack">
          <IntentCardRadio
            name="type_user"
            value="locataire"
            checked={state.type_user === 'locataire'}
            onChange={() => setField('type_user', 'locataire')}
            label={<>Je <span className="ial-card-keyword">CHERCHE</span> un logement</>}
            description="Pour les semaines où je suis en cours"
          />
          <IntentCardRadio
            name="type_user"
            value="hote"
            checked={state.type_user === 'hote'}
            onChange={() => setField('type_user', 'hote')}
            label={<>Je <span className="ial-card-keyword">PROPOSE</span> mon logement</>}
            description="Pour les semaines où je suis en entreprise"
          />
          <IntentCardRadio
            name="type_user"
            value="les_deux"
            checked={state.type_user === 'les_deux'}
            onChange={() => setField('type_user', 'les_deux')}
            label={<>Les <span className="ial-card-keyword">DEUX</span></>}
            description="Je cherche dans une ville et je propose dans l'autre"
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

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title">INSCRIPTION</h1>
      <div className="ial-placeholder-content">
        Étape {state.currentStep} — À implémenter
      </div>
      <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />
    </AuthScreenContainer>
  )
}
