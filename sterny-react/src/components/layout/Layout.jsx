import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === '/recherche' || location.pathname === '/agences-partenaires'
  return (
    <>
      <Navbar variant={isHome ? 'dark' : 'default'} />
      <Outlet />
      <Footer />
    </>
  )
}
