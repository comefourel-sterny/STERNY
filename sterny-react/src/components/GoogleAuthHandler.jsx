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
          .select('id, nom, prenom, type_user')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          // Profil existe — vérifier si le nom est renseigné
          if (!profile.nom || !profile.prenom) {
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
        const referralCode = sessionStorage.getItem('referral_code')
        const referrerId = sessionStorage.getItem('referrer_id')

        let parrainId = referrerId || null

        // Si on a un code mais pas d'ID, vérifier le code
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
        sessionStorage.removeItem('referral_code')
        sessionStorage.removeItem('referrer_id')
        sessionStorage.removeItem('signup_type')

        // Si le nom est incomplet, rediriger vers complétion
        if (!prenom || !nom) {
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
