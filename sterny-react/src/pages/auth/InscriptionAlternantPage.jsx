import { useState, useEffect, useRef } from 'react'
import {
  useInscriptionWizard,
  validateE1Email,
  getE1InvalidFields,
  validateE3,
  validateE4,
} from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import AuthErrorBanner from '../../components/auth-wizard/AuthErrorBanner'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import IntentCardRadio from '../../components/auth-wizard/IntentCardRadio'
import AutocompleteInput from '../../components/auth-wizard/AutocompleteInput'
import CustomSelect from '../../components/auth-wizard/CustomSelect'
import WizardProgressBar from '../../components/auth-wizard/WizardProgressBar'
import { ECOLES, ANNEES_ETUDES, FILIERES, VILLES_FRANCE } from '../../data/inscription-options'
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

  // Handler générique E-4 : utilisé par AutocompleteInput (villes) et CustomSelect
  // (statuts en cas les_deux). Les 2 composants émettent un event {target:{value,name}}.
  const handleE4Change = (e) => {
    setField(e.target.name, e.target.value)
    if (state.globalError) clearError()
  }

  // Handler dédié au RadioGroup E-4 (cas locataire/hote).
  // Mappe le choix de ville vers la paire (statut_ville_ecole, statut_ville_entreprise)
  // selon type_user — cf. UNIFICATION-INSCRIPTION table 1.3.
  const handleRadioVille = (option) => {
    const statutValue = state.type_user === 'locataire' ? 'recherche' : 'hote'
    if (option === 'ecole') {
      setField('statut_ville_ecole', statutValue)
      setField('statut_ville_entreprise', null)
    } else {
      setField('statut_ville_ecole', null)
      setField('statut_ville_entreprise', statutValue)
    }
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
    const isLesDeux = state.type_user === 'les_deux'
    const radioQuestion = state.type_user === 'locataire'
      ? 'Dans laquelle des deux cherches-tu un logement ?'
      : 'Dans laquelle des deux proposes-tu ton logement ?'
    const statutOptions = [
      { value: 'recherche', label: 'cherche un logement' },
      { value: 'hote', label: 'propose mon logement' },
    ]
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={4/7} />
        <div className="ial-form">
          <AutocompleteInput
            name="ville_ecole"
            label="Ville de mon école"
            value={state.ville_ecole ?? ''}
            onChange={handleE4Change}
            suggestions={VILLES_FRANCE}
            placeholder="Tape les premières lettres"
            required={false}
          />
          {isLesDeux && (
            <CustomSelect
              name="statut_ville_ecole"
              label="Dans cette ville je..."
              options={statutOptions}
              value={state.statut_ville_ecole}
              onChange={handleE4Change}
              placeholder="Sélectionner"
            />
          )}
          <AutocompleteInput
            name="ville_entreprise"
            label="Ville de mon entreprise"
            value={state.ville_entreprise ?? ''}
            onChange={handleE4Change}
            suggestions={VILLES_FRANCE}
            placeholder="Tape les premières lettres"
            required={false}
          />
          {isLesDeux && (
            <CustomSelect
              name="statut_ville_entreprise"
              label="Dans cette ville je..."
              options={statutOptions}
              value={state.statut_ville_entreprise}
              onChange={handleE4Change}
              placeholder="Sélectionner"
            />
          )}
          {!isLesDeux && (
            <div className="ial-radio-section">
              <p className="ial-radio-question">{radioQuestion}</p>
              <div className="ial-toggle" role="radiogroup">
                <button
                  type="button"
                  role="radio"
                  aria-checked={state.statut_ville_ecole !== null}
                  aria-label="Ville de mon école"
                  className={`ial-toggle-btn ${state.statut_ville_ecole !== null ? 'selected' : ''}`}
                  onClick={() => handleRadioVille('ecole')}
                >
                  {state.ville_ecole.trim() || 'Ville de mon école'}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={state.statut_ville_entreprise !== null}
                  aria-label="Ville de mon entreprise"
                  className={`ial-toggle-btn ${state.statut_ville_entreprise !== null ? 'selected' : ''}`}
                  onClick={() => handleRadioVille('entreprise')}
                >
                  {state.ville_entreprise.trim() || 'Ville de mon entreprise'}
                </button>
              </div>
            </div>
          )}
          <button type="button" className="ial-btn-continuer" onClick={handleE4Submit}>Continuer</button>
        </div>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />}
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
