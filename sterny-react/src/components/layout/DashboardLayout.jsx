import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import FooterMinimal from './FooterMinimal'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function DashboardLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'DM Sans, sans-serif',
        color: '#6B7280'
      }}>
        Chargement...
      </div>
    )
  }

  if (!user && !import.meta.env.DEV) {
    return <Navigate to="/connexion" replace />
  }

  return (
    <>
      <Navbar />
      <Outlet />
      <FooterMinimal />
    </>
  )
}
