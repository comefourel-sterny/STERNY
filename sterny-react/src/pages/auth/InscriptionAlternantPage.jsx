import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  useInscriptionWizard,
  validateE1Email,
  getE1InvalidFields,
  validateE3,
  validateE4,
  validateE6,
} from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import GoogleSignInButton from '../../components/auth-wizard/GoogleSignInButton'
import AppleSignInButton from '../../components/auth-wizard/AppleSignInButton'
import OrSeparator from '../../components/auth-wizard/OrSeparator'
import TextInput from '../../components/auth-wizard/TextInput'
import AuthErrorBanner from '../../components/auth-wizard/AuthErrorBanner'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import IntentCardRadio from '../../components/auth-wizard/IntentCardRadio'
import AutocompleteInput from '../../components/auth-wizard/AutocompleteInput'
import CustomSelect from '../../components/auth-wizard/CustomSelect'
import VilleNatureField from '../../components/ville/VilleNatureField'
import WizardProgressBar from '../../components/auth-wizard/WizardProgressBar'
import RhythmManualBuilder from '../../components/rhythm/RhythmManualBuilder'
import { computeDefaultAcademicYear, nextAcademicYear, previousAcademicYear } from '../../utils/academicYear'
import RhythmRequiredPopup from '../../components/auth-wizard/RhythmRequiredPopup'
import { ECOLES, ANNEES_ETUDES, FILIERES, VILLES_FRANCE } from '../../data/inscription-options'
import { formatPartialDateInput } from '../../utils/dateHelpers.js'
import { supabaseClient } from '../../config/supabase'
import EtapeCreationCompte from './EtapeCreationCompte'
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
  const [rhythmPopupOpen, setRhythmPopupOpen] = useState(false)
  // E-5 : année académique pilotée par la page (défaut inchangé = année courante).
  const e5DefaultYear = useMemo(() => computeDefaultAcademicYear(), [])
  const [e5Year, setE5Year] = useState(e5DefaultYear)
  const builderRef = useRef(null)
  const errorTimerRef = useRef(null)
  const prenomRef = useRef(null)
  const nomRef = useRef(null)
  const telephoneRef = useRef(null)
  const emailRef = useRef(null)
  const [invalidFields, setInvalidFields] = useState(() => new Set())

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  // Pré-remplissage email depuis ChoixInscriptionPage via location.state.
  // location.state ne survit pas au refresh — éphémère, cohérent Q5 (pas de sessionStorage).
  const location = useLocation()
  useEffect(() => {
    const initialEmail = location.state?.email
    if (initialEmail) {
      setField('email', initialEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // useEffect 3 — Pré-remplissage prenom/nom/email depuis user_metadata (fix timing conv 22)
  // Combo getSession() + onAuthStateChange() pour gérer 2 cas :
  // (a) session déjà active au mount
  // (b) session établie après le mount (callback OAuth Supabase async)
  // Non destructif : ne pas écraser une saisie utilisateur déjà présente.
  // Logique symétrique à T4-B InscriptionProprietairePage useEffect 2.
  useEffect(() => {
    if (!state.initialized) return
    if (state.authMethod !== 'google' && state.authMethod !== 'apple') return

    const processSessionMetadata = (session) => {
      if (!session) return

      const metadata = session.user.user_metadata || {}
      let extractedPrenom = ''
      let extractedNom = ''

      if (state.authMethod === 'google') {
        const fullName = metadata.full_name || metadata.name || ''
        const parts = fullName.trim().split(/\s+/).filter(Boolean)
        extractedPrenom = parts[0] || ''
        extractedNom = parts.slice(1).join(' ') || ''
      } else if (state.authMethod === 'apple') {
        const nameField = metadata.name
        if (nameField && typeof nameField === 'object') {
          extractedPrenom = nameField.firstName || ''
          extractedNom = nameField.lastName || ''
        } else if (typeof nameField === 'string') {
          const parts = nameField.trim().split(/\s+/).filter(Boolean)
          extractedPrenom = parts[0] || ''
          extractedNom = parts.slice(1).join(' ') || ''
        }
      }

      if (extractedPrenom && !state.prenom) setField('prenom', extractedPrenom)
      if (extractedNom && !state.nom) setField('nom', extractedNom)
      if (session.user.email && !state.email) setField('email', session.user.email)
    }

    // Cas (a) — session déjà active au mount
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      processSessionMetadata(session)
    })

    // Cas (b) — session établie après le mount (callback OAuth Supabase async)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        processSessionMetadata(session)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.initialized, state.authMethod])

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

  // handleGoogleSignup E-1 — lance le flux OAuth Google.
  // redirectTo /inscription/alternant : l'utilisateur revient ici, useEffect 3
  // détecte la session et pré-remplit prenom/nom/email depuis user_metadata.
  const handleGoogleSignup = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/inscription/alternant'
      }
    })
    if (error) {
      setGlobalError(error.message)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
    }
  }

  // handleAppleSignup E-1 — symétrique à Google. Scopes 'email name' obligatoires :
  // sans eux, Apple ne renvoie pas user_metadata.name à la 1ère connexion.
  // Apple 2e connexion : Apple ne renvoie plus le name même avec les scopes,
  // l'utilisateur devra saisir prenom/nom manuellement (cf. UNIFICATION § 4.4.2).
  const handleAppleSignup = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin + '/inscription/alternant',
        scopes: 'email name'
      }
    })
    if (error) {
      setGlobalError(error.message)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => clearError(), 3000)
    }
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

  const handleE5Confirm = (materialized) => {
    const hasSchoolWeek = materialized.some((w) => w.status === 'school')
    if (!hasSchoolWeek) {
      setRhythmPopupOpen(true)
      return
    }
    setField('rhythm_calendar', materialized)
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

  // handleE2Continue — INSERT users à la transition E-2 → E-3 si session OAuth active.
  // À E-1 OAuth, on a déjà state.userId du hook (set par INIT_DONE) + prenom/nom/telephone/email
  // (pré-remplis par useEffect 3 et/ou saisie utilisateur). À E-2, on a aussi type_user choisi
  // → INSERT atomique avec tous les champs requis (UNIFICATION-INSCRIPTION § 4.7).
  // Méthode email : pas d'INSERT (différé à tranche email-confirm dédiée — DETTE #70).
  const handleE2Continue = async () => {
    if (state.authMethod === 'google' || state.authMethod === 'apple') {
      if (!state.userId) {
        setGlobalError('Session expirée — reconnecte-toi')
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => clearError(), 3000)
        return
      }

      // SELECT users — si la ligne existe déjà (reprise utilisateur), navigue sans INSERT
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', state.userId)
        .maybeSingle()

      if (!existingUser) {
        const { error: insertError } = await supabaseClient
          .from('users')
          .insert([{
            id: state.userId,
            email: state.email,
            prenom: state.prenom,
            nom: state.nom,
            telephone: state.telephone,
            type_user: state.type_user,
            parrain_id: null,
            profil_complet: false
          }])

        if (insertError) {
          setGlobalError("Échec de l'inscription. Réessaie.")
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
          errorTimerRef.current = setTimeout(() => clearError(), 3000)
          console.warn('InscriptionAlternantPage E-2 INSERT error:', insertError.message)
          return
        }
      }
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
          onClick={handleE2Continue}
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
        {state.initialized && state.authMethod === 'email' && (
          <>
            <OrSeparator />
            <div className="ial-oauth-row">
              <GoogleSignInButton
                onClick={handleGoogleSignup}
                label="Google"
              />
              <AppleSignInButton
                onClick={handleAppleSignup}
                label="Apple"
              />
            </div>
          </>
        )}
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
        : ''
    const natureQuestion = (state.ville_entreprise ?? '').trim()
      ? `${state.ville_entreprise.trim()}, c'est ta ville d'école ou d'entreprise ?`
      : "Cette ville, c'est ta ville d'école ou d'entreprise ?"
    const natureVilleOptions = [
      { value: 'ecole', label: 'École' },
      { value: 'entreprise', label: 'Entreprise' },
    ]
    // les_deux : la question de nature n'apparaît qu'une fois les 2 villes saisies (DETTE #77)
    const lesDeuxNatureReady =
      (state.ville_entreprise ?? '').trim() !== '' && (state.ville_ecole ?? '').trim() !== ''
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={4/7} />
        {subtitleText && <p className="ial-step-subtitle">{subtitleText}</p>}
        <div className="ial-form">
          {(state.type_user === 'locataire' || state.type_user === 'hote') && (
            // Sous-titre ville rendu à l'extérieur (l. `{subtitleText && <p …>}`), donc pas de villeLabel ici.
            // VilleNatureField absorbe l'event {target:{name,value}} : on rewrappe pour réutiliser handleE4Change tel quel.
            <VilleNatureField
              ville={state.ville_entreprise ?? ''}
              onVilleChange={(value) => handleE4Change({ target: { name: 'ville_entreprise', value } })}
              nature={state.nature_ville}
              onNatureChange={(value) => handleE4Change({ target: { name: 'nature_ville', value } })}
              naturePrompt={natureQuestion}
              naturePromptClassName="ial-step-subtitle ial-nature-question"
            />
          )}
          {state.type_user === 'les_deux' && (
            <>
              <p className="ial-step-subtitle ial-nature-question">Dans quelle ville proposes-tu un logement ?</p>
              <AutocompleteInput
                name="ville_entreprise"
                value={state.ville_entreprise ?? ''}
                onChange={handleE4Change}
                suggestions={VILLES_FRANCE}
                placeholder="Tape les premières lettres"
                required={false}
              />
              <p className="ial-step-subtitle ial-nature-question">Dans quelle ville cherches-tu un logement ?</p>
              <AutocompleteInput
                name="ville_ecole"
                value={state.ville_ecole ?? ''}
                onChange={handleE4Change}
                suggestions={VILLES_FRANCE}
                placeholder="Tape les premières lettres"
                required={false}
              />
              {lesDeuxNatureReady && (
                <>
                  <p className="ial-step-subtitle ial-nature-question">{natureQuestion}</p>
                  <CustomSelect
                    name="nature_ville"
                    options={natureVilleOptions}
                    value={state.nature_ville}
                    onChange={handleE4Change}
                    placeholder="Sélectionner"
                  />
                </>
              )}
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

  if (state.currentStep === 5) {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">INSCRIPTION</h1>
        <WizardProgressBar progress={5/7} />
        <div className="ial-form">
          <div className="ial-year-nav">
            <span className="ial-year-nav-label">Année académique</span>
            <div className="ial-year-nav-control">
              <button
                type="button"
                className="ial-year-nav-arrow"
                onClick={() => setE5Year((prev) => previousAcademicYear(prev))}
                disabled={e5Year === e5DefaultYear}
                aria-label="Année précédente"
              >‹</button>
              <span className="ial-year-nav-value">{e5Year}</span>
              <button
                type="button"
                className="ial-year-nav-arrow"
                onClick={() => setE5Year((prev) => nextAcademicYear(prev))}
                aria-label="Année suivante"
              >›</button>
            </div>
          </div>
          <RhythmManualBuilder
            ref={builderRef}
            villeRecherchee="ecole"
            initialCalendar={state.rhythm_calendar || undefined}
            onConfirm={handleE5Confirm}
            onEmptyConfirm={() => setRhythmPopupOpen(true)}
            year={e5Year}
            onYearChange={setE5Year}
            renderYearSelector={false}
            renderActions={false}
          />
          <button type="button" className="ial-btn-continuer" onClick={() => builderRef.current?.requestConfirm()}>Continuer</button>
        </div>
        {state.globalError
          ? <AuthErrorBanner message={state.globalError} />
          : <BottomAuthLinks onRetour={goToPrevStep} retourLabel="Retour" />}
        <RhythmRequiredPopup
          open={rhythmPopupOpen}
          onClose={() => setRhythmPopupOpen(false)}
          onConfirm={() => {}}
        />
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
      </AuthScreenContainer>
    )
  }

  if (state.currentStep === 7) {
    return <EtapeCreationCompte state={state} onRetour={goToPrevStep} />
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
