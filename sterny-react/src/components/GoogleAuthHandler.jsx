import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabaseClient } from '../config/supabase'

export default function GoogleAuthHandler() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!user || checkedRef.current) return

    const checkProfile = async () => {
      checkedRef.current = true

      try {
        // Vérifier si le profil existe dans la table users
        const { data: profile } = await supabaseClient
          .from('users')
          .select('id, nom, prenom, type_user, profil_complet')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          if (profile.profil_complet) {
            // Profil complet — dashboard
            const dashboard = profile.type_user === 'proprietaire'
              ? '/dashboard/proprietaire'
              : profile.type_user === 'hote'
                ? '/dashboard/hote'
                : '/dashboard/locataire'
            navigate(dashboard)
          } else if (profile.type_user === 'proprietaire') {
            // Propriétaire incomplet — modifier profil directement
            navigate('/dashboard/proprietaire')
          } else {
            // Locataire incomplet — compléter profil
            navigate('/completer-profil')
          }
          return
        }

        // Pas de profil — nouvel utilisateur Google
        // Récupérer les données Google
        const googleName = user.user_metadata?.full_name || ''
        const googleEmail = user.email || ''
        const nameParts = googleName.split(' ')
        const prenom = nameParts[0] || ''
        const nom = nameParts.slice(1).join(' ') || ''

        // Récupérer le parrainage depuis sessionStorage
        const referralToken = sessionStorage.getItem('referral_token')
        const referralCode = sessionStorage.getItem('referral_code')
        const referrerId = sessionStorage.getItem('referrer_id')

        let parrainId = referrerId || null

        // Token d'invitation (nouveau système)
        if (!parrainId && referralToken) {
          const { data: parrain } = await supabaseClient
            .from('users')
            .select('id')
            .eq('invitation_token', referralToken)
            .maybeSingle()
          if (parrain) parrainId = parrain.id
        }

        // Fallback ancien système (code_parrainage)
        if (!parrainId && referralCode) {
          const { data: parrain } = await supabaseClient
            .from('users')
            .select('id')
            .eq('code_parrainage', referralCode.toUpperCase())
            .maybeSingle()
          if (parrain) parrainId = parrain.id
        }

        // Déterminer le type (par défaut locataire, sauf si session indique proprietaire)
        const typeUser = sessionStorage.getItem('signup_type') || 'locataire'

        // Créer le profil
        await supabaseClient
          .from('users')
          .insert([{
            id: user.id,
            email: googleEmail,
            prenom,
            nom,
            type_user: typeUser,
            parrain_id: parrainId
          }])

        // Nettoyer la session
        sessionStorage.removeItem('referral_token')
        sessionStorage.removeItem('referral_code')
        sessionStorage.removeItem('referrer_id')
        sessionStorage.removeItem('signup_type')

        // Propriétaire → dashboard, locataire → complétion pour rythme/ville/école
        if (typeUser === 'proprietaire') {
          navigate('/dashboard/proprietaire')
        } else {
          navigate('/completer-profil')
        }
      } catch (err) {
        console.warn('GoogleAuthHandler:', err.message)
      }
    }

    checkProfile()
  }, [user, navigate, location.pathname])

  return null
}
