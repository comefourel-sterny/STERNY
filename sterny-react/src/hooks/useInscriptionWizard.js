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
 *
 * Modèle d'erreur (Fix B, conv 5) : un seul `globalError` (string | null) qui
 * porte le message unique affiché par <AuthErrorBanner>. Plus d'objet `errors`
 * par-champ — la page n'affiche qu'un message global qui auto-disparaît au bout
 * de 2s ou dès que l'utilisateur retape dans un champ (clearError au typing).
 */

import { useReducer, useEffect, useCallback } from 'react'
import { supabaseClient } from '../config/supabase'
import { isValidDateFR } from '../utils/dateHelpers.js'

const TOTAL_STEPS = 7

const initialState = {
  currentStep: 1,
  loading: false,
  error: null,
  globalError: null,        // string | null — message affiché par <AuthErrorBanner>
  awaitingEmailVerification: false,
  authMethod: null,         // 'email' | 'google' | 'apple'
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
  // E-5 Calendrier d'alternance (capturé via RhythmManualBuilder, écrit one-pass à E-7)
  rhythm_calendar: null, // [{week_start:'YYYY-MM-DD', status:'school'|'company'}] | null
  // E-6 Profil personnel
  // bio retirée d'E-6 (amendement VISION conv 15) — reportée à ModifierProfilPage post-inscription.
  date_naissance: '',
  sexe: '',
  photo_profil_url: null,
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
    case 'SET_GLOBAL_ERROR':
      return { ...state, globalError: action.message }
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

// ─── Validation frontend E-1 méthode email ─────────────────────────────────
//
// Règles précisées dans UNIFICATION-INSCRIPTION § 3.5.1.
// Renvoie un message global (string) ou null si tout OK.
//
// Logique Fix B (conv 5) :
// - Si AU MOINS UN champ vide → "Veuillez remplir tous les champs"
// - Si TOUS remplis mais PLUSIEURS invalides → "Certains champs sont invalides"
// - Si TOUS remplis mais UN SEUL invalide → message ciblé du seul champ invalide

const PHONE_RE = /^(?:\+\d{1,3}\d{6,14}|0[1-9]\d{8})$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanPhone(raw) {
  return (raw ?? '').replace(/[\s.-]/g, '')
}

export function validateE1Email(state) {
  const prenom = (state.prenom ?? '').trim()
  const nom = (state.nom ?? '').trim()
  const telephoneClean = cleanPhone(state.telephone)
  const email = (state.email ?? '').trim()

  // 1. Détection des champs vides
  const empties = []
  if (prenom.length === 0) empties.push('prenom')
  if (nom.length === 0) empties.push('nom')
  if (telephoneClean.length === 0) empties.push('telephone')
  if (email.length === 0) empties.push('email')

  if (empties.length > 0) {
    return 'Veuillez remplir tous les champs'
  }

  // 2. Tous remplis : détection des invalides
  const invalids = []
  if (prenom.length < 2) invalids.push('Prénom requis (min. 2 caractères)')
  if (nom.length < 2) invalids.push('Nom requis (min. 2 caractères)')
  if (!PHONE_RE.test(telephoneClean)) invalids.push('Numéro de téléphone invalide')
  if (!EMAIL_RE.test(email)) invalids.push('Email invalide')

  if (invalids.length === 0) return null
  if (invalids.length === 1) return invalids[0]
  return 'Certains champs sont invalides'
}

// getE1InvalidFields — Set des noms de champs E-1 à marquer en erreur visuelle
// (bordure rouge). Logique alignée sur validateE1Email : un champ vide est
// invalide (cas particulier de "longueur < 2" pour prenom/nom, et regex échoue
// sur '' pour telephone/email). Tous-vides → Set des 4 noms.
export function getE1InvalidFields(state) {
  const prenom = (state.prenom ?? '').trim()
  const nom = (state.nom ?? '').trim()
  const telephoneClean = cleanPhone(state.telephone)
  const email = (state.email ?? '').trim()

  const invalid = new Set()
  if (prenom.length < 2) invalid.add('prenom')
  if (nom.length < 2) invalid.add('nom')
  if (!PHONE_RE.test(telephoneClean)) invalid.add('telephone')
  if (!EMAIL_RE.test(email)) invalid.add('email')
  return invalid
}

// Validation frontend E-3 — école / année d'études / filière
// Règles précisées dans UNIFICATION-INSCRIPTION § 3.7. 3 champs requis non vides.
// Renvoie un message global (string) ou null si tout OK.
export function validateE3(state) {
  const ecole = (state.ecole ?? '').trim()
  const annee = (state.annee_etudes ?? '').trim()
  const filiere = (state.filiere ?? '').trim()
  if (ecole.length === 0 || annee.length === 0 || filiere.length === 0) {
    return 'Veuillez remplir tous les champs'
  }
  return null
}

// Validation frontend E-4 — villes (refonte conv 12, cf. UNIFICATION-INSCRIPTION § 3.8)
// Mono-ville pour locataire/hote (state.ville_entreprise), bi-ville pour les_deux
// (state.ville_entreprise = ville où il propose, state.ville_ecole = ville où il cherche).
// Statuts dérivés de type_user au moment de l'INSERT (E-7), pas stockés dans le state ici.
// Renvoie un message global (string) ou null si tout OK.
export function validateE4(state) {
  const villeEntreprise = (state.ville_entreprise ?? '').trim()

  if (state.type_user === 'locataire' || state.type_user === 'hote') {
    if (villeEntreprise.length === 0) {
      return 'Veuillez choisir une ville'
    }
    return null
  }

  if (state.type_user === 'les_deux') {
    const villeEcole = (state.ville_ecole ?? '').trim()
    if (villeEntreprise.length === 0 || villeEcole.length === 0) {
      return 'Veuillez renseigner tes deux villes'
    }
    return null
  }

  return null
}

// Validation frontend E-6 — profil personnel (cf. UNIFICATION-INSCRIPTION § 3.10)
// date_naissance + sexe obligatoires, photo_profil_url + bio optionnels.
// Pas de check âge ≥ 18 ans : en attente d'avis professionnel Q-AVO-001 + Q-DPO-002
// (cf. CONTEXTE-PROJET §3 sur les mineurs alternants).
// Renvoie un message global (string) ou null si tout OK.
export function validateE6(state) {
  const dateNaissance = (state.date_naissance ?? '').trim()
  const sexe = state.sexe ?? ''

  if (dateNaissance === '') {
    return 'Veuillez renseigner ta date de naissance'
  }
  if (!isValidDateFR(dateNaissance)) {
    return 'Date de naissance invalide (format attendu : JJ/MM/AAAA)'
  }
  if (sexe === '') {
    return 'Veuillez renseigner ton sexe'
  }
  if (!['homme', 'femme', 'autre', 'non-precise'].includes(sexe)) {
    return 'Valeur de sexe invalide'
  }
  return null
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

  // clearError : efface globalError. Conserve le nom historique (compat usages
  // existants côté page) — équivaut à dispatch SET_GLOBAL_ERROR null.
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_GLOBAL_ERROR', message: null })
  }, [])

  const setGlobalError = useCallback((message) => {
    dispatch({ type: 'SET_GLOBAL_ERROR', message })
  }, [])

  return {
    state,
    setField,
    goToStep,
    goToPrevStep,
    goToNextStep,
    clearError,
    setGlobalError,
  }
}
