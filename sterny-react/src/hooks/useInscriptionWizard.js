/**
 * useInscriptionWizard — hook de gestion d'état du wizard d'inscription alternant.
 *
 * Pourquoi useReducer plutôt que 15+ useState ? L'état est complexe (15+ champs
 * répartis sur 7 étapes + métadonnées loading/error/authMethod/currentStep) et
 * les transitions suivent des règles précises (chaque "Continuer" valide,
 * UPDATE BDD partiel, avance d'étape). useReducer centralise ces règles dans
 * un seul reducer (state, action) => newState, à la place d'une cascade de
 * setState dispersés. Le hook expose state + actions wrappées (setField,
 * goToNextStep, etc.) pour que la page n'ait pas à connaître les types d'action.
 */

import { useReducer, useEffect, useCallback } from 'react'
import { supabaseClient } from '../config/supabase'

const TOTAL_STEPS = 7

const initialState = {
  currentStep: 1,
  loading: false,
  error: null,
  awaitingEmailVerification: false,
  authMethod: null, // 'email' | 'google' | 'apple'
  initialized: false,
  userId: null,
  // E-1 Identité
  prenom: '',
  nom: '',
  telephone: '',
  email: '',
  password: '',
  // E-2 Type profil
  type_user: null,
  // E-3 Études
  ecole: '',
  annee_etudes: '',
  filiere: '',
  // E-4 Villes & statuts
  ville_ecole: '',
  ville_entreprise: '',
  statut_ville_ecole: null,
  statut_ville_entreprise: null,
  // E-5 Calendrier — placeholder T2, sera intégré en T8 (RhythmManualBuilder)
  // E-6 Profil personnel
  date_naissance: '',
  sexe: '',
  photo_profil_url: null,
  bio: '',
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_DONE':
      return {
        ...state,
        initialized: true,
        authMethod: action.authMethod,
        userId: action.userId,
      }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.step }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    default:
      return state
  }
}

function detectAuthMethod(session) {
  if (!session?.user) return 'email'
  const provider = session.user.app_metadata?.provider
  if (provider === 'google') return 'google'
  if (provider === 'apple') return 'apple'
  return 'email'
}

export function useInscriptionWizard() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (cancelled) return
      const authMethod = detectAuthMethod(session)
      const userId = session?.user?.id ?? null
      dispatch({ type: 'INIT_DONE', authMethod, userId })
    }
    init()
    return () => { cancelled = true }
  }, [])

  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const goToStep = useCallback((step) => {
    dispatch({ type: 'GO_TO_STEP', step })
  }, [])

  const goToPrevStep = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP', step: Math.max(1, state.currentStep - 1) })
  }, [state.currentStep])

  const goToNextStep = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP', step: Math.min(TOTAL_STEPS, state.currentStep + 1) })
  }, [state.currentStep])

  return {
    state,
    setField,
    goToStep,
    goToPrevStep,
    goToNextStep,
  }
}
