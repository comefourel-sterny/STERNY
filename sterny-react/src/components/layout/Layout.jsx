import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isDarkPage = location.pathname === '/' || location.pathname === '/recherche' || location.pathname === '/agences-partenaires' || location.pathname.startsWith('/comment-ca-marche/')
  return (
    <>
      <Navbar variant={isDarkPage ? 'dark' : 'default'} />
      <Outlet />
      <Footer />
    </>
  )
}
