import { useRef, useState } from 'react'
import AuthScreenContainer from '../components/auth-wizard/AuthScreenContainer'
import WizardProgressBar from '../components/auth-wizard/WizardProgressBar'
import WizardTitle from '../components/auth-wizard/WizardTitle'
import WizardStepSubtitle from '../components/auth-wizard/WizardStepSubtitle'
import TextInput from '../components/auth-wizard/TextInput'
import TextArea from '../components/auth-wizard/TextArea'
import CustomSelect from '../components/auth-wizard/CustomSelect'
import AutocompleteInput from '../components/auth-wizard/AutocompleteInput'
import PrimaryButton from '../components/auth-wizard/PrimaryButton'
import GoogleSignInButton from '../components/auth-wizard/GoogleSignInButton'
import AppleSignInButton from '../components/auth-wizard/AppleSignInButton'
import OrSeparator from '../components/auth-wizard/OrSeparator'
import BackLink from '../components/auth-wizard/BackLink'
import BottomAuthLinks from '../components/auth-wizard/BottomAuthLinks'
import ErrorMessage from '../components/auth-wizard/ErrorMessage'
import InfoBox from '../components/auth-wizard/InfoBox'
import IntentCardRadio from '../components/auth-wizard/IntentCardRadio'
import RecapBlock from '../components/auth-wizard/RecapBlock'
import RhythmCalendarPreview from '../components/auth-wizard/RhythmCalendarPreview'
import RhythmRequiredPopup from '../components/auth-wizard/RhythmRequiredPopup'
import PhotoCropperModal from '../components/auth-wizard/PhotoCropperModal'
import { useShakeButton } from '../components/auth-wizard/useShakeButton'
import './AuthWizardSandbox.css'

const MOCK_RHYTHM = [
  { week_start: '2026-09-07', status: 'school' },
  { week_start: '2026-09-14', status: 'company' },
  { week_start: '2026-09-21', status: 'school' },
  { week_start: '2026-09-28', status: 'company' },
  { week_start: '2026-10-05', status: 'school' },
  { week_start: '2026-10-12', status: 'company' },
  { week_start: '2026-10-19', status: 'school' },
  { week_start: '2026-10-26', status: 'company' },
]

export default function AuthWizardSandbox() {
  const [textValue, setTextValue] = useState('')
  const [textValueError] = useState('Saisis un email valide')
  const [textValueFilled, setTextValueFilled] = useState('Côme')
  const [textareaValue, setTextareaValue] = useState('')
  const [selectValue, setSelectValue] = useState('')
  const [autoValue, setAutoValue] = useState('')
  const [intent, setIntent] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperFile, setCropperFile] = useState(null)
  const fileInputRef = useRef(null)
  const { ref: shakeRef, shake } = useShakeButton()
  const { ref: emShakeRef, shake: emShake } = useShakeButton()
  const [emErrorVisible, setEmErrorVisible] = useState(false)

  const openCropperPicker = () => fileInputRef.current?.click()
  const onFileChosen = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropperFile(file)
    setCropperOpen(true)
  }

  return (
    <div className="aws-page">
      <header className="aws-header">
        <h1 className="aws-h1">Auth Wizard Sandbox — T1 visual test</h1>
        <p className="aws-sub">17 composants + 1 OAuthButton interne. Test visuel uniquement, pas de logique.</p>
      </header>

      <Section title="1. AuthScreenContainer">
        <AuthScreenContainer>
          <WizardTitle>INSCRIPTION</WizardTitle>
          <WizardStepSubtitle>Card 460px standard, fond #F4F5F7</WizardStepSubtitle>
          <p className="aws-placeholder">Contenu placeholder à l'intérieur du container.</p>
        </AuthScreenContainer>
      </Section>

      <Section title="2. WizardProgressBar (3 instances avec label, 1 sans)">
        <div className="aws-card">
          <WizardProgressBar progress={1 / 7} stepLabel="Identité" stepNumber={1} showLabel />
          <WizardProgressBar progress={4 / 7} stepLabel="Villes & statuts" stepNumber={4} showLabel />
          <WizardProgressBar progress={7 / 7} stepLabel="Validation" stepNumber={7} showLabel />
          <WizardProgressBar progress={3 / 7} />
        </div>
      </Section>

      <Section title="3. WizardTitle + WizardStepSubtitle">
        <div className="aws-card">
          <WizardTitle>INSCRIPTION</WizardTitle>
          <WizardStepSubtitle>Tes informations de contact</WizardStepSubtitle>
        </div>
      </Section>

      <Section title="4. TextInput (3 instances)">
        <div className="aws-card aws-card-stack">
          <TextInput
            label="Prénom (vide)"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Ton prénom"
            required
          />
          <TextInput
            label="Prénom (rempli)"
            value={textValueFilled}
            onChange={(e) => setTextValueFilled(e.target.value)}
            required
          />
          <TextInput
            label="Email (avec erreur)"
            value="invalide"
            onChange={() => {}}
            type="email"
            error={textValueError}
            required
          />
        </div>
      </Section>

      <Section title="5. TextArea">
        <div className="aws-card">
          <TextArea
            label="Bio"
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            placeholder="Quelques mots sur toi (optionnel)"
            maxLength={300}
          />
        </div>
      </Section>

      <Section title="6. CustomSelect">
        <div className="aws-card">
          <CustomSelect
            label="Année d'études"
            options={['BTS 1', 'BUT 1', 'Master 1', 'Autre']}
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
            placeholder="Sélectionner"
            required
          />
        </div>
      </Section>

      <Section title="7. AutocompleteInput">
        <div className="aws-card">
          <AutocompleteInput
            label="Ville d'école"
            value={autoValue}
            onChange={(e) => setAutoValue(e.target.value)}
            suggestions={['Rennes', 'Nantes', 'Paris', 'Saint-Malo', 'Lyon', 'Bordeaux']}
            placeholder="Tape les premières lettres"
            required
          />
        </div>
      </Section>

      <Section title="8. PrimaryButton (4 instances)">
        <div className="aws-card aws-card-stack">
          <PrimaryButton onClick={() => alert('Continuer')}>Continuer</PrimaryButton>
          <PrimaryButton disabled>Disabled</PrimaryButton>
          <PrimaryButton loading>Loading</PrimaryButton>
          <PrimaryButton ref={shakeRef} onClick={shake}>Cliquer pour shake</PrimaryButton>
        </div>
      </Section>

      <Section title="9. GoogleSignInButton + AppleSignInButton + OrSeparator">
        <div className="aws-card aws-card-stack">
          <GoogleSignInButton onClick={() => alert('Google')} />
          <AppleSignInButton onClick={() => alert('Apple')} />
          <OrSeparator />
          <PrimaryButton>Continuer avec mon email</PrimaryButton>
        </div>
      </Section>

      <Section title="10. BackLink">
        <div className="aws-card">
          <BackLink onClick={() => alert('Retour')}>← Retour</BackLink>
        </div>
      </Section>

      <Section title="10-bis. BottomAuthLinks (3 variants)">
        <div className="aws-card aws-card-stack">
          <BottomAuthLinks retourTo="/inscription" showSignInLink />
          <BottomAuthLinks onRetour={() => alert('Retour')} showSignInLink />
          <BottomAuthLinks retourTo="/inscription" />
        </div>
      </Section>

      <Section title="11. PhotoCropperModal">
        <div className="aws-card">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileChosen}
          />
          <PrimaryButton onClick={openCropperPicker}>Ouvrir cropper</PrimaryButton>
          <PhotoCropperModal
            open={cropperOpen}
            onClose={() => setCropperOpen(false)}
            onConfirm={(blob) => {
              const url = URL.createObjectURL(blob)
              alert(`Crop confirmé. Aperçu : ${url}`)
            }}
            imageFile={cropperFile}
          />
        </div>
      </Section>

      <Section title="12. IntentCardRadio (3 cartes)">
        <div className="aws-card aws-card-stack">
          <IntentCardRadio
            name="type_user"
            value="locataire"
            checked={intent === 'locataire'}
            onChange={() => setIntent('locataire')}
            label="Je cherche un logement"
            description="Pour les semaines où je suis en cours"
          />
          <IntentCardRadio
            name="type_user"
            value="hote"
            checked={intent === 'hote'}
            onChange={() => setIntent('hote')}
            label="Je propose mon logement"
            description="Pour les semaines où je suis en entreprise"
          />
          <IntentCardRadio
            name="type_user"
            value="les_deux"
            checked={intent === 'les_deux'}
            onChange={() => setIntent('les_deux')}
            label="Les deux"
            description="Je cherche dans une ville et je propose dans l'autre"
          />
        </div>
      </Section>

      <Section title="13. RecapBlock (editable + non-editable)">
        <div className="aws-card aws-card-stack">
          <RecapBlock title="Identité" editable onEdit={() => alert('Édit Identité')}>
            Côme Fourel<br />
            06 12 34 56 78<br />
            come@example.com
          </RecapBlock>
          <RecapBlock title="Type de profil">
            Je propose mon logement
          </RecapBlock>
        </div>
      </Section>

      <Section title="14. RhythmCalendarPreview">
        <div className="aws-card">
          <RhythmCalendarPreview rhythm_calendar={MOCK_RHYTHM} />
        </div>
      </Section>

      <Section title="15. RhythmRequiredPopup">
        <div className="aws-card">
          <PrimaryButton onClick={() => setPopupOpen(true)}>Ouvrir popup</PrimaryButton>
          <RhythmRequiredPopup
            open={popupOpen}
            onClose={() => setPopupOpen(false)}
            onConfirm={() => alert('Renseigner mon calendrier')}
          />
        </div>
      </Section>

      <Section title="16. InfoBox">
        <div className="aws-card">
          <InfoBox>
            Photo et bio sont optionnelles. Les renseigner augmente la confiance des autres alternants. Tu pourras les ajouter plus tard si tu préfères.
          </InfoBox>
        </div>
      </Section>

      <Section title="17. ErrorMessage — message d'erreur de formulaire">
        <p className="aws-em-sub">
          Validation E-1 du wizard d'inscription, mapping codes Supabase Auth (cf. UNIFICATION-INSCRIPTION § 3.5.1 et § 4.2.4). Couleur <code>var(--error)</code>, animation <code>emFadeIn</code> 0.25s, attributs <code>role="alert"</code> + <code>aria-live="polite"</code>.
        </p>

        <div className="aws-em-grid">
          <div className="aws-card aws-em-cell">
            <h3 className="aws-em-h3">(a) Message court isolé</h3>
            <ErrorMessage>Cet email n'est pas valide</ErrorMessage>
          </div>

          <div className="aws-card aws-em-cell">
            <h3 className="aws-em-h3">(b) Avec lien intégré</h3>
            <ErrorMessage>
              Cet email est déjà utilisé. <a href="/connexion">Se connecter</a>
            </ErrorMessage>
          </div>

          <div className="aws-card aws-em-cell">
            <h3 className="aws-em-h3">(c) Sous un TextInput</h3>
            <TextInput
              label="Email"
              type="email"
              value="user@invalide"
              onChange={() => {}}
              required
              id="aws-em-input-email"
            />
            <ErrorMessage id="aws-em-input-email-error">Email invalide</ErrorMessage>
          </div>

          <div className="aws-card aws-em-cell">
            <h3 className="aws-em-h3">(d) Sous un PrimaryButton avec shake</h3>
            <PrimaryButton
              ref={emShakeRef}
              onClick={() => {
                emShake()
                setEmErrorVisible(true)
              }}
            >
              Continuer
            </PrimaryButton>
            {emErrorVisible && (
              <ErrorMessage>Une erreur est survenue, réessaie dans un instant</ErrorMessage>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="aws-section">
      <h2 className="aws-h2">{title}</h2>
      {children}
    </section>
  )
}
