import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'

export default function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [target, setTarget] = useState('/dashboard')

  useEffect(() => {
    if (loading) return
    if (!user) {
      setChecking(false)
      return
    }
    let cancelled = false
    supabaseClient
      .from('users')
      .select('type_user, is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.is_admin) setTarget('/dashboard/admin')
        else if (data?.type_user === 'proprietaire') setTarget('/dashboard/proprietaire')
        else setTarget('/dashboard')
        setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [loading, user])

  if (loading || checking) return null
  if (user) return <Navigate to={target} replace />
  return children
}
