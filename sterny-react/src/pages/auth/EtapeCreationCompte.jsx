/**
 * EtapeCreationCompte — écran final E-7 du wizard d'inscription alternant.
 *
 * Pourquoi un composant co-localisé et pas un rendu inline (comme E-1…E-6) ?
 * E-7 porte son PROPRE état local (phase form/otp, password, code, loading,
 * error, verified, snapshot, resendInfo) + un useEffect + useNavigate. Les
 * règles des hooks interdisent de les déclarer dans la branche conditionnelle
 * `if (currentStep === 7)` de la page. On isole donc l'étape dans ce composant,
 * rendu depuis la page quand currentStep === 7 (même point de branchement que
 * les autres étapes). Le mot de passe est saisi ICI, en local, jamais persisté
 * dans le reducer du wizard.
 *
 * Capture seule en amont : la dérivation des 4 colonnes ville/statut se fait au
 * dernier moment via deriveVilleColonnes (VISION §65-86), juste avant la RPC.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { parseDateFRtoISO } from '../../utils/dateHelpers.js'
import { deriveVilleColonnes } from '../../utils/deriveVilleColonnes'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import PrimaryButton from '../../components/auth-wizard/PrimaryButton'
import AuthErrorBanner from '../../components/auth-wizard/AuthErrorBanner'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
import RecapBlock from '../../components/auth-wizard/RecapBlock'

const OTP_STORAGE_KEY = 'sterny_e7_otp_pending'

const TYPE_USER_LABELS = {
  locataire: 'Recherche',
  hote: 'Propose',
  les_deux: 'Recherche et propose',
}

export default function EtapeCreationCompte({ state, onRetour }) {
  const navigate = useNavigate()

  const [phase, setPhase] = useState('form') // 'form' | 'otp'
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verified, setVerified] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [resendInfo, setResendInfo] = useState(null)
  const [accountCreated, setAccountCreated] = useState(false)

  // Reprise après refresh pendant la vérification du code.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(OTP_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setSnapshot(parsed)
        setPhase('otp')
      }
    } catch {
      // entrée corrompue : on ignore, l'utilisateur recommencera depuis le form
    }
  }, [])

  // Assemble le snapshot envoyé à la RPC (profil + calendrier + source).
  const buildSnapshot = () => {
    const iso = parseDateFRtoISO(state.date_naissance)
    if (!iso) return { error: 'Date de naissance invalide.' }

    const cols = deriveVilleColonnes({
      type_user: state.type_user,
      nature_ville: state.nature_ville,
      ville_entreprise: state.ville_entreprise,
      ville_ecole: state.ville_ecole,
    })

    const p_profile = {
      prenom: state.prenom,
      nom: state.nom,
      email: state.email.trim(),
      telephone: state.telephone,
      type_user: state.type_user,
      ecole: state.ecole,
      annee_etudes: state.annee_etudes,
      filiere: state.filiere,
      ...cols,
      date_naissance: iso,
      sexe: state.sexe,
    }

    return {
      snapshot: {
        email: state.email.trim(),
        p_profile,
        p_rhythm_calendar: state.rhythm_calendar,
        p_rhythm_source: 'manual',
      },
    }
  }

  // Appelle la RPC finale. Idempotente (ON CONFLICT id) → on ne purge pas le
  // sessionStorage en cas d'échec (retry possible).
  const completeInscription = async (snap) => {
    const { error: rpcError } = await supabaseClient.rpc('complete_inscription_alternant', {
      p_profile: snap.p_profile,
      p_rhythm_calendar: snap.p_rhythm_calendar,
      p_rhythm_source: snap.p_rhythm_source,
    })
    if (rpcError) {
      console.error(rpcError)
      setError('Une erreur est survenue lors de la finalisation de ton inscription. Réessaie.')
      return false
    }
    sessionStorage.removeItem(OTP_STORAGE_KEY)
    navigate('/dashboard')
    return true
  }

  const handleCreateAccount = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    const built = buildSnapshot()
    if (built.error) {
      setError(built.error)
      return
    }
    setLoading(true)
    try {
      if (!accountCreated) {
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email: built.snapshot.email,
          password,
        })
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('Un compte est déjà associé à cet email. Essaie de te connecter.')
          } else {
            console.error(signUpError)
            setError('La création du compte a échoué. Réessaie.')
          }
          return
        }
        // Confirmation ON + email déjà inscrit : identities vide (pas d'erreur explicite).
        if (data?.user?.identities && data.user.identities.length === 0) {
          setError('Un compte est déjà associé à cet email. Essaie de te connecter.')
          return
        }
        setAccountCreated(true)
        if (!data?.session) {
          // Confirmation activée : on attend le code à 6 chiffres.
          sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(built.snapshot))
          setSnapshot(built.snapshot)
          setPhase('otp')
          return
        }
      }
      // Confirmation désactivée OU réessai après échec RPC : compte déjà créé + session active.
      await completeInscription(built.snapshot)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async () => {
    setError(null)
    setResendInfo(null)
    if (code.length !== 6) {
      setError('Entre le code à 6 chiffres reçu par email.')
      return
    }
    setLoading(true)
    try {
      if (!verified) {
        const { error: otpError } = await supabaseClient.auth.verifyOtp({
          email: snapshot.email,
          token: code,
          type: 'email',
        })
        if (otpError) {
          setError('Code invalide ou expiré. Vérifie le code ou demande un nouveau code.')
          return
        }
        setVerified(true)
      }
      await completeInscription(snapshot)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const { error: resendError } = await supabaseClient.auth.resend({
      type: 'signup',
      email: snapshot.email,
    })
    if (resendError) {
      setError('Impossible de renvoyer le code pour le moment. Patiente quelques secondes.')
    } else {
      setResendInfo('Un nouveau code vient de t\'être envoyé.')
    }
  }

  // Récap des villes selon le type de profil (valeur seule, le libellé est porté à part).
  const isLesDeux = state.type_user === 'les_deux'
  const villesValue = isLesDeux
    ? `${state.ville_entreprise || '—'} (propose) · ${state.ville_ecole || '—'} (cherche)`
    : `${state.ville_entreprise || '—'}`

  if (phase === 'otp') {
    return (
      <AuthScreenContainer>
        <h1 className="aw-screen-title">VÉRIFICATION</h1>
        <p className="ial-step-subtitle">
          On a envoyé un code à 6 chiffres à {snapshot?.email}. Saisis-le pour finaliser ton inscription.
        </p>
        <div className="ial-form">
          <TextInput
            label="Code à 6 chiffres"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
          />
          {resendInfo && <p className="ial-step-subtitle">{resendInfo}</p>}
          <PrimaryButton
            onClick={handleOtpSubmit}
            loading={loading}
            disabled={loading || code.length !== 6}
            style={{ marginTop: 'auto' }}
          >
            Vérifier et finaliser
          </PrimaryButton>
          <div className="aw-bottom-auth">
            <button
              type="button"
              className="aw-bottom-auth-link"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
              onClick={handleResend}
            >
              Renvoyer le code
            </button>
          </div>
        </div>
        {error && <AuthErrorBanner message={error} />}
      </AuthScreenContainer>
    )
  }

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title">INSCRIPTION</h1>
      <div className="ial-form">
        <RecapBlock>
          <div className="aw-recap-row">
            <span className="aw-recap-label">Nom</span>
            <span className="aw-recap-value">{state.prenom} {state.nom}</span>
          </div>
          <div className="aw-recap-row">
            <span className="aw-recap-label">Email</span>
            <span className="aw-recap-value">{state.email}</span>
          </div>
          <div className="aw-recap-row">
            <span className="aw-recap-label">Service</span>
            <span className="aw-recap-value">{TYPE_USER_LABELS[state.type_user] || state.type_user}</span>
          </div>
          <div className="aw-recap-row">
            <span className="aw-recap-label">{isLesDeux ? 'Villes' : 'Ville'}</span>
            <span className="aw-recap-value">{villesValue}</span>
          </div>
          <div className="aw-recap-row">
            <span className="aw-recap-label">Rythme</span>
            <span className="aw-recap-value">{state.rhythm_calendar?.length || 0} semaines</span>
          </div>
        </RecapBlock>
        <TextInput
          label="Choisis un mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
        />
        <PrimaryButton
          onClick={handleCreateAccount}
          loading={loading}
          disabled={loading || password.length < 8}
          style={{ marginTop: 'auto' }}
        >
          Créer mon compte
        </PrimaryButton>
      </div>
      {error
        ? <AuthErrorBanner message={error} />
        : <BottomAuthLinks onRetour={onRetour} retourLabel="Retour" />}
    </AuthScreenContainer>
  )
}
