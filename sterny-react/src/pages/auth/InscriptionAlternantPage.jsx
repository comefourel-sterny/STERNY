import { useNavigate } from 'react-router-dom'
import { useInscriptionWizard } from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import WizardTitle from '../../components/auth-wizard/WizardTitle'
import WizardProgressBar from '../../components/auth-wizard/WizardProgressBar'
import WizardStepSubtitle from '../../components/auth-wizard/WizardStepSubtitle'
import PrimaryButton from '../../components/auth-wizard/PrimaryButton'
import BackLink from '../../components/auth-wizard/BackLink'
import './InscriptionAlternantPage.css'

const TOTAL_STEPS = 7
const STEP_LABELS = {
  1: 'Identité',
  2: 'Type de profil',
  3: 'Études',
  4: 'Villes & statuts',
  5: 'Calendrier',
  6: 'À propos de toi',
  7: 'Validation',
}

export default function InscriptionAlternantPage() {
  const navigate = useNavigate()
  const { state, goToPrevStep, goToNextStep } = useInscriptionWizard()

  if (!state.initialized) {
    return (
      <AuthScreenContainer>
        <p className="iap-loading">Chargement…</p>
      </AuthScreenContainer>
    )
  }

  const { currentStep } = state
  const isFirstStep = currentStep === 1
  const isFinalStep = currentStep === TOTAL_STEPS
  const stepLabel = STEP_LABELS[currentStep] ?? `Étape ${currentStep}`

  const handlePrimaryClick = () => {
    if (isFinalStep) {
      console.log('[T2 sub-commit 1] Finaliser cliqué — no-op pour ce sous-commit')
      return
    }
    goToNextStep()
  }

  const handleBack = () => {
    if (isFirstStep) {
      navigate('/inscription')
    } else {
      goToPrevStep()
    }
  }

  return (
    <AuthScreenContainer>
      <WizardTitle>INSCRIPTION</WizardTitle>
      <WizardProgressBar
        progress={currentStep / TOTAL_STEPS}
        stepLabel={stepLabel}
        stepNumber={currentStep}
      />
      <WizardStepSubtitle>Parcours en cours de construction</WizardStepSubtitle>
      <div className="iap-placeholder">
        Étape {currentStep} — placeholder, sera implémentée en sous-commit suivant
      </div>
      <PrimaryButton onClick={handlePrimaryClick}>
        {isFinalStep ? 'Finaliser' : 'Suivant'}
      </PrimaryButton>
      {isFirstStep ? (
        <BackLink to="/inscription">← Retour à l'inscription</BackLink>
      ) : (
        <BackLink onClick={handleBack}>← Précédent</BackLink>
      )}
    </AuthScreenContainer>
  )
}
