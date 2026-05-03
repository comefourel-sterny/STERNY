import { useNavigate } from 'react-router-dom'
import { useInscriptionWizard } from '../../hooks/useInscriptionWizard'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import WizardTitle from '../../components/auth-wizard/WizardTitle'
import WizardProgressBar from '../../components/auth-wizard/WizardProgressBar'
import PrimaryButton from '../../components/auth-wizard/PrimaryButton'
import BackLink from '../../components/auth-wizard/BackLink'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import './InscriptionAlternantPage.css'

const TOTAL_STEPS = 7

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

  const handlePrimaryClick = () => {
    if (isFinalStep) {
      console.log('[T2 sub-commit 1] Finaliser cliqué — no-op pour ce sous-commit')
      return
    }
    goToNextStep()
  }

  return (
    <AuthScreenContainer>
      <WizardTitle className="iap-stagger">INSCRIPTION</WizardTitle>
      <WizardProgressBar
        progress={currentStep / TOTAL_STEPS}
        stepNumber={currentStep}
        className="iap-stagger"
        style={{ animationDelay: '0.08s' }}
      />
      <div className="iap-step-body">
        <div className="iap-placeholder iap-stagger" style={{ animationDelay: '0.16s' }}>
          Étape {currentStep} — placeholder, sera implémentée en sous-commit suivant
        </div>
      </div>
      <div className="iap-bottom">
        <PrimaryButton
          onClick={handlePrimaryClick}
          className="iap-stagger"
          style={{ animationDelay: '0.24s' }}
        >
          {isFinalStep ? 'Finaliser' : 'Suivant'}
        </PrimaryButton>
        {isFirstStep ? (
          <BottomAuthLinks
            retourTo="/inscription"
            showSignInLink
            className="iap-stagger"
            style={{ animationDelay: '0.32s' }}
          />
        ) : (
          <BackLink
            onClick={goToPrevStep}
            className="iap-stagger"
            style={{ animationDelay: '0.32s' }}
          >
            ← Précédent
          </BackLink>
        )}
      </div>
    </AuthScreenContainer>
  )
}
