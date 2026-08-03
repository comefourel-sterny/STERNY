import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabaseClient } from '../config/supabase'

// Routes considérées comme callbacks d'authentification — seules routes où
// le handler doit fetch le profil et router. Sur toute autre route, l'utilisateur
// est arrivé volontairement et ne doit pas être redirigé.
//
// Le handler intercepte également toute route /inscription/* SAUF
// /inscription/proprietaire (qui gère son propre callback OAuth, cf.
// docs/archives/UNIFICATION-INSCRIPTION.md § 4.5.3 et § 4.10).
const AUTH_CALLBACK_ROUTES = ['/', '/connexion', '/completer-profil']
const HANDLER_BYPASS_ROUTES = ['/inscription/proprietaire']

export default function OAuthHandler() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const checkedRef = useRef(false)

  useEffect(() => {
    // Garde de route : ne déclencher la logique que sur les callbacks d'auth.
    const isBypassedRoute = HANDLER_BYPASS_ROUTES.some(route => location.pathname.startsWith(route))
    const isInscriptionRoute = location.pathname.startsWith('/inscription') && !isBypassedRoute
    const isAuthCallback = AUTH_CALLBACK_ROUTES.includes(location.pathname) || isInscriptionRoute
    if (!isAuthCallback) return

    if (!user || checkedRef.current) return

    const checkProfile = async () => {
      checkedRef.current = true

      try {
        const { data: profile } = await supabaseClient
          .from('users')
          .select('id, profil_complet')
          .eq('id', user.id)
          .maybeSingle()

        // Cas A — ligne users absente : nouvel utilisateur OAuth.
        // Le wizard alternant prend la main pour l'INSERT initial à E-1
        // (Q5 actée, cf. UNIFICATION-INSCRIPTION § 4.7).
        if (!profile) {
          navigate('/inscription/alternant')
          return
        }

        // Cas B — profil incomplet : reprise du wizard à la 1ère étape
        // avec un champ obligatoire encore vide (cf. § 2.5).
        if (!profile.profil_complet) {
          navigate('/inscription/alternant')
          return
        }

        // Cas C — profil complet : dashboard.
        // Plus de cas type_user='proprietaire' à gérer ici — le parcours
        // proprio est sur sa route dédiée (bypass).
        navigate('/dashboard')
      } catch (err) {
        console.warn('OAuthHandler:', err.message)
      }
    }

    checkProfile()
  }, [user, navigate, location.pathname])

  return null
}
