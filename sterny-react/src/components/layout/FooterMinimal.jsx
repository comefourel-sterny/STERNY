import { Link } from 'react-router-dom'

export default function FooterMinimal() {
  return (
    <footer role="contentinfo" style={{
      background: '#1E293B',
      color: 'white',
      padding: '20px',
      textAlign: 'center',
      marginTop: 'auto',
      fontSize: '13px'
    }}>
      <p style={{ margin: 0 }}>
        STERNY &copy; {new Date().getFullYear()} &mdash;{' '}
        <Link to="/cgv" style={{ color: '#E8622A', textDecoration: 'none' }}>CGV</Link> &middot;{' '}
        <Link to="/cgu" style={{ color: '#E8622A', textDecoration: 'none' }}>CGU</Link> &middot;{' '}
        <Link to="/mentions-legales" style={{ color: '#E8622A', textDecoration: 'none' }}>Mentions légales</Link> &middot;{' '}
        <Link to="/politique-confidentialite" style={{ color: '#E8622A', textDecoration: 'none' }}>Confidentialité</Link>
      </p>
    </footer>
  )
}
