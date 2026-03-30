import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseClient } from '../../config/supabase'
import './ConversationPage.css'

export default function ConversationPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/connexion')
      return
    }

    async function redirect() {
      try {
        const { data } = await supabaseClient
          .from('users')
          .select('type_user')
          .eq('id', user.id)
          .single()

        if (data && data.type_user === 'proprietaire') {
          navigate('/dashboard/proprietaire')
        } else {
          navigate('/dashboard/locataire')
        }
      } catch (e) {
        navigate('/dashboard/locataire')
      }
    }

    redirect()
  }, [user, loading, navigate])

  return null
}
