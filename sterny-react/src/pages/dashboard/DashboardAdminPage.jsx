import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import './DashboardAdminPage.css'

const SECTION_NAMES = ['dashboard', 'users', 'annonces', 'contrats', 'signalements', 'litiges', 'contact']

const CATEGORIES_LABELS = {
  logement_non_conforme: 'Logement non conforme',
  equipement_defectueux: 'Equipement defectueux',
  nuisances: 'Nuisances',
  probleme_paiement: 'Probleme paiement',
  comportement: 'Comportement',
  securite: 'Securite',
  autre: 'Autre'
}

export default function DashboardAdminPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')

  // Stats
  const [stats, setStats] = useState({
    users: '\u2014', locataires: '\u2014', annonces: '\u2014',
    contrats: '\u2014', messages: '\u2014', signalements: '\u2014'
  })
  const [badgeSignalements, setBadgeSignalements] = useState(0)
  const [badgeLitiges, setBadgeLitiges] = useState(0)
  const [badgeContact, setBadgeContact] = useState(0)

  // Data
  const [dashboardCandidatures, setDashboardCandidatures] = useState(null) // null = loading
  const [usersData, setUsersData] = useState(null)
  const [usersCount, setUsersCount] = useState('\u2014')
  const [annoncesData, setAnnoncesData] = useState(null)
  const [annoncesCount, setAnnoncesCount] = useState('\u2014')
  const [contratsData, setContratsData] = useState(null)
  const [contratsCount, setContratsCount] = useState('\u2014')
  const [signalementsData, setSignalementsData] = useState(null)
  const [signalementsCount, setSignalementsCount] = useState('\u2014')
  const [litigesData, setLitigesData] = useState(null)
  const [litigesCount, setLitigesCount] = useState('\u2014')
  const [contactData, setContactData] = useState(null)
  const [contactCount, setContactCount] = useState('\u2014')

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const isAdmin = await verifierAdmin()
    if (!isAdmin) return
    chargerStats()
  }

  async function verifierAdmin() {
    try {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      if (!authUser) { navigate('/connexion'); return false }

      const { data: userData, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !userData || !userData.is_admin) {
        alert('Acces non autorise.')
        navigate('/')
        return false
      }

      setCurrentAdmin(userData)
      return true
    } catch (e) {
      navigate('/connexion')
      return false
    }
  }

  function showSection(name) {
    setActiveSection(name)
    if (name === 'users') chargerUsers()
    if (name === 'annonces') chargerAnnonces()
    if (name === 'contrats') chargerContrats()
    if (name === 'signalements') chargerSignalements()
    if (name === 'litiges') chargerLitiges()
    if (name === 'contact') chargerMessagesContact()
  }

  async function chargerStats() {
    try {
      const [u, l, a, c, m] = await Promise.all([
        supabaseClient.from('users').select('*', { count: 'exact', head: true }),
        supabaseClient.from('users').select('*', { count: 'exact', head: true }).eq('type_user', 'locataire'),
        supabaseClient.from('annonces').select('*', { count: 'exact', head: true }),
        supabaseClient.from('contrats').select('*', { count: 'exact', head: true }),
        supabaseClient.from('messages').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        users: u.count || 0,
        locataires: l.count || 0,
        annonces: a.count || 0,
        contrats: c.count || 0,
        messages: m.count || 0,
        signalements: '\u2014'
      })

      // Signalements ouverts
      try {
        const { count } = await supabaseClient.from('signalements').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
        const sigCount = count || 0
        setStats(prev => ({ ...prev, signalements: sigCount }))
        if (sigCount > 0) setBadgeSignalements(sigCount)
      } catch (e) { setStats(prev => ({ ...prev, signalements: 0 })) }

      // Litiges ouverts
      try {
        const { count } = await supabaseClient.from('litiges').select('*', { count: 'exact', head: true }).eq('statut', 'ouvert')
        if (count > 0) setBadgeLitiges(count)
      } catch (e) {}

      // Messages contact
      try {
        const { count } = await supabaseClient.from('messages_contact').select('*', { count: 'exact', head: true }).eq('statut', 'nouveau')
        if (count > 0) setBadgeContact(count)
      } catch (e) {}

      // Dernieres candidatures
      chargerDernieresCandidatures()
    } catch (e) {
      console.error('Erreur stats:', e)
    }
  }

  async function chargerDernieresCandidatures() {
    try {
      const { data, error } = await supabaseClient
        .from('candidatures')
        .select('*, users!candidatures_locataire_id_fkey(prenom, nom, email)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      setDashboardCandidatures(data || [])
    } catch (e) {
      setDashboardCandidatures([])
    }
  }

  async function chargerUsers() {
    try {
      const { data, error, count } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsersCount(`${count || data.length} utilisateur(s)`)
      setUsersData(data || [])
    } catch (e) {
      setUsersData([])
    }
  }

  async function chargerAnnonces() {
    try {
      const { data, error, count } = await supabaseClient
        .from('annonces')
        .select('*, users!annonces_proprietaire_id_fkey(prenom, nom)', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (error) throw error
      setAnnoncesCount(`${count || data.length} annonce(s)`)
      setAnnoncesData(data || [])
    } catch (e) {
      setAnnoncesData([])
    }
  }

  async function chargerContrats() {
    try {
      const { data, error, count } = await supabaseClient
        .from('contrats')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (error) throw error
      setContratsCount(`${count || data.length} contrat(s)`)
      setContratsData(data || [])
    } catch (e) {
      setContratsData([])
    }
  }

  async function chargerSignalements() {
    try {
      const { data, error, count } = await supabaseClient
        .from('signalements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (error) throw error
      setSignalementsCount(`${count || data.length} signalement(s)`)
      setSignalementsData(data || [])
    } catch (e) {
      setSignalementsData([])
    }
  }

  async function traiterSignalement(id) {
    if (!window.confirm('Marquer ce signalement comme traite ?')) return
    try {
      await supabaseClient.from('signalements').update({ statut: 'traite' }).eq('id', id)
      chargerSignalements()
      chargerStats()
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
  }

  async function chargerLitiges() {
    try {
      const { data, error, count } = await supabaseClient
        .from('litiges')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (error) throw error
      setLitigesCount(`${count || data.length} litige(s)`)
      setLitigesData(data || [])
    } catch (e) {
      setLitigesData([])
    }
  }

  async function prendreEnChargeLitige(id) {
    if (!window.confirm('Prendre en charge ce litige ?')) return
    try {
      await supabaseClient.from('litiges').update({ statut: 'en_cours' }).eq('id', id)
      chargerLitiges()
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
  }

  async function resoudreLitige(id) {
    const resolution = window.prompt('Indiquez la resolution du litige :')
    if (!resolution) return
    try {
      await supabaseClient.from('litiges').update({ statut: 'resolu', resolution }).eq('id', id)
      chargerLitiges()
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
  }

  async function chargerMessagesContact() {
    try {
      const { data, error, count } = await supabaseClient
        .from('messages_contact')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setContactCount(`${count || (data ? data.length : 0)} message(s)`)
      setContactData(data || [])
    } catch (e) {
      setContactData([])
    }
  }

  async function marquerContactLu(id) {
    try {
      await supabaseClient.from('messages_contact').update({ statut: 'lu' }).eq('id', id)
      chargerMessagesContact()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  async function marquerContactTraite(id) {
    try {
      await supabaseClient.from('messages_contact').update({ statut: 'traite' }).eq('id', id)
      chargerMessagesContact()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  async function deconnexionAdmin() {
    await signOut()
    navigate('/')
  }

  const sidebarItems = [
    { name: 'dashboard', label: 'Tableau de bord', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg> },
    { name: 'users', label: 'Utilisateurs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, section: 'gestion' },
    { name: 'annonces', label: 'Annonces', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, section: 'gestion' },
    { name: 'contrats', label: 'Contrats', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, section: 'gestion' },
    { name: 'signalements', label: 'Signalements', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>, badge: badgeSignalements, section: 'moderation' },
    { name: 'litiges', label: 'Litiges', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, badge: badgeLitiges, section: 'moderation' },
    { name: 'contact', label: 'Messages contact', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, badge: badgeContact, section: 'moderation' },
  ]

  // Group sidebar items
  const generalItems = sidebarItems.filter(i => !i.section)
  const gestionItems = sidebarItems.filter(i => i.section === 'gestion')
  const moderationItems = sidebarItems.filter(i => i.section === 'moderation')

  return (
    <div>
      {/* ADMIN NAV */}
      <div className="admin-nav-bar">
        <div className="admin-nav-left">
          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 800, fontSize: '18px' }}>STERNY</Link>
          <span className="admin-nav-badge">Admin</span>
        </div>
        <div className="admin-nav-right">
          <Link to="/">Retour au site</Link>
          <button onClick={deconnexionAdmin} style={{ opacity: 0.5 }}>Deconnexion</button>
          <span className="admin-user">{currentAdmin?.email || '\u2014'}</span>
        </div>
      </div>

      <div className="admin-layout">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">General</div>
            {generalItems.map(item => (
              <button key={item.name} className={`sidebar-item${activeSection === item.name ? ' active' : ''}`} onClick={() => showSection(item.name)}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">Gestion</div>
            {gestionItems.map(item => (
              <button key={item.name} className={`sidebar-item${activeSection === item.name ? ' active' : ''}`} onClick={() => showSection(item.name)}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">Moderation</div>
            {moderationItems.map(item => (
              <button key={item.name} className={`sidebar-item${activeSection === item.name ? ' active' : ''}`} onClick={() => showSection(item.name)}>
                {item.icon}
                {item.label}
                {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="admin-main">

          {/* DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div>
              <h1 className="admin-page-title">Tableau de bord</h1>
              <p className="admin-page-subtitle">Vue d'ensemble de la plateforme STERNY</p>

              <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div><div className="stat-value">{stats.users}</div><div className="stat-label">Utilisateurs inscrits</div></div>
                <div className="stat-card"><div className="stat-card-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div><div className="stat-value">{stats.annonces}</div><div className="stat-label">Annonces publiees</div></div>
                <div className="stat-card"><div className="stat-card-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div><div className="stat-value">{stats.contrats}</div><div className="stat-label">Contrats signes</div></div>
                <div className="stat-card"><div className="stat-card-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div><div className="stat-value">{stats.messages}</div><div className="stat-label">Messages echanges</div></div>
                <div className="stat-card"><div className="stat-card-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg></div><div className="stat-value">{stats.locataires}</div><div className="stat-label">Locataires</div></div>
                <div className="stat-card"><div className="stat-card-icon red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg></div><div className="stat-value">{stats.signalements}</div><div className="stat-label">Signalements ouverts</div></div>
              </div>

              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Dernieres candidatures</span>
                </div>
                {dashboardCandidatures === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : dashboardCandidatures.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucune candidature</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Locataire</th><th>Date</th><th>Statut</th></tr></thead>
                    <tbody>
                      {dashboardCandidatures.map(c => {
                        const nom = c.users ? `${c.users.prenom || ''} ${c.users.nom || ''}` : 'Inconnu'
                        const date = c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '\u2014'
                        const badgeClass = c.statut === 'acceptee' ? 'badge-green' : c.statut === 'en_attente' ? 'badge-orange' : c.statut === 'refusee' ? 'badge-red' : 'badge-gray'
                        return <tr key={c.id}><td>{nom}</td><td>{date}</td><td><span className={`badge ${badgeClass}`}>{c.statut || '\u2014'}</span></td></tr>
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeSection === 'users' && (
            <div>
              <h1 className="admin-page-title">Utilisateurs</h1>
              <p className="admin-page-subtitle">Gestion des comptes utilisateurs</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Tous les utilisateurs</span>
                  <span className="admin-table-count">{usersCount}</span>
                </div>
                {usersData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : usersData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucun utilisateur</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Utilisateur</th><th>Type</th><th>Email</th><th>Inscrit le</th><th>Actions</th></tr></thead>
                    <tbody>
                      {usersData.map(u => {
                        const initiales = ((u.prenom || '')[0] || '') + ((u.nom || '')[0] || '')
                        const nom = `${u.prenom || ''} ${u.nom || ''}`.trim() || 'Sans nom'
                        const typeClass = u.type_user === 'proprietaire' ? 'badge-orange' : 'badge-blue'
                        const date = u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '\u2014'
                        return (
                          <tr key={u.id}>
                            <td><div className="user-info-cell"><div className="user-avatar-small">{initiales.toUpperCase()}</div><span>{nom}</span></div></td>
                            <td><span className={`badge ${typeClass}`}>{u.type_user || '\u2014'}</span></td>
                            <td>{u.email || '\u2014'}</td>
                            <td>{date}</td>
                            <td><button className="btn-admin" onClick={() => alert('Detail utilisateur : ' + u.id)}>Voir</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ANNONCES */}
          {activeSection === 'annonces' && (
            <div>
              <h1 className="admin-page-title">Annonces</h1>
              <p className="admin-page-subtitle">Toutes les annonces de logement</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Annonces</span>
                  <span className="admin-table-count">{annoncesCount}</span>
                </div>
                {annoncesData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : annoncesData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucune annonce</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Titre</th><th>Ville</th><th>Prix</th><th>Proprietaire</th><th>Statut</th><th>Actions</th></tr></thead>
                    <tbody>
                      {annoncesData.map(a => {
                        const proprio = a.users ? `${a.users.prenom || ''} ${a.users.nom || ''}` : '\u2014'
                        const badgeClass = a.statut === 'active' ? 'badge-green' : a.statut === 'archivee' ? 'badge-gray' : 'badge-orange'
                        return (
                          <tr key={a.id}>
                            <td>{a.titre || 'Sans titre'}</td>
                            <td>{a.ville || '\u2014'}</td>
                            <td>{a.prix || '\u2014'}EUR/sem</td>
                            <td>{proprio}</td>
                            <td><span className={`badge ${badgeClass}`}>{a.statut || '\u2014'}</span></td>
                            <td><Link to={`/logement?id=${a.id}`} className="btn-admin">Voir</Link></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* CONTRATS */}
          {activeSection === 'contrats' && (
            <div>
              <h1 className="admin-page-title">Contrats</h1>
              <p className="admin-page-subtitle">Contrats de location en cours et termines</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Contrats</span>
                  <span className="admin-table-count">{contratsCount}</span>
                </div>
                {contratsData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : contratsData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucun contrat</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Debut</th><th>Fin</th><th>Loyer</th><th>Statut</th></tr></thead>
                    <tbody>
                      {contratsData.map(c => {
                        const debut = c.date_debut ? new Date(c.date_debut).toLocaleDateString('fr-FR') : '\u2014'
                        const fin = c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '\u2014'
                        const statut = c.statut || 'actif'
                        const badgeClass = statut === 'actif' ? 'badge-green' : statut === 'resilie' ? 'badge-red' : 'badge-gray'
                        return (
                          <tr key={c.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{(c.id || '').substring(0, 8)}...</td>
                            <td>{debut}</td>
                            <td>{fin}</td>
                            <td>{c.loyer_mensuel || '\u2014'}EUR/mois</td>
                            <td><span className={`badge ${badgeClass}`}>{statut}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* SIGNALEMENTS */}
          {activeSection === 'signalements' && (
            <div>
              <h1 className="admin-page-title">Signalements</h1>
              <p className="admin-page-subtitle">Signalements d'annonces par les utilisateurs</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Signalements</span>
                  <span className="admin-table-count">{signalementsCount}</span>
                </div>
                {signalementsData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : signalementsData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucun signalement</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Date</th><th>Motif</th><th>Description</th><th>Statut</th><th>Actions</th></tr></thead>
                    <tbody>
                      {signalementsData.map(s => {
                        const date = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '\u2014'
                        const badgeClass = s.statut === 'en_attente' ? 'badge-amber' : s.statut === 'traite' ? 'badge-green' : 'badge-gray'
                        const desc = (s.description || '').substring(0, 60) + ((s.description || '').length > 60 ? '...' : '')
                        return (
                          <tr key={s.id}>
                            <td>{date}</td>
                            <td>{s.motif || '\u2014'}</td>
                            <td>{desc}</td>
                            <td><span className={`badge ${badgeClass}`}>{s.statut || '\u2014'}</span></td>
                            <td>{s.statut === 'en_attente' && <button className="btn-admin success" onClick={() => traiterSignalement(s.id)}>Traiter</button>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* LITIGES */}
          {activeSection === 'litiges' && (
            <div>
              <h1 className="admin-page-title">Litiges</h1>
              <p className="admin-page-subtitle">Litiges ouverts entre locataires et proprietaires</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Litiges</span>
                  <span className="admin-table-count">{litigesCount}</span>
                </div>
                {litigesData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : litigesData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucun litige</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Date</th><th>Categorie</th><th>Description</th><th>Statut</th><th>Actions</th></tr></thead>
                    <tbody>
                      {litigesData.map(l => {
                        const date = l.created_at ? new Date(l.created_at).toLocaleDateString('fr-FR') : '\u2014'
                        const cat = CATEGORIES_LABELS[l.categorie] || l.categorie || '\u2014'
                        const desc = (l.description || '').substring(0, 60) + ((l.description || '').length > 60 ? '...' : '')
                        const badgeClass = l.statut === 'ouvert' ? 'badge-red' : l.statut === 'en_cours' ? 'badge-amber' : l.statut === 'resolu' ? 'badge-green' : 'badge-gray'
                        return (
                          <tr key={l.id}>
                            <td>{date}</td>
                            <td>{cat}</td>
                            <td>{desc}</td>
                            <td><span className={`badge ${badgeClass}`}>{l.statut || '\u2014'}</span></td>
                            <td>
                              {l.statut === 'ouvert' && <button className="btn-admin" onClick={() => prendreEnChargeLitige(l.id)}>Prendre en charge</button>}
                              {l.statut === 'en_cours' && <button className="btn-admin success" onClick={() => resoudreLitige(l.id)}>Resoudre</button>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* MESSAGES CONTACT */}
          {activeSection === 'contact' && (
            <div>
              <h1 className="admin-page-title">Messages de contact</h1>
              <p className="admin-page-subtitle">Messages envoyes via le formulaire de contact</p>
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <span className="admin-table-title">Messages</span>
                  <span className="admin-table-count">{contactCount}</span>
                </div>
                {contactData === null ? (
                  <div className="loading-spinner">Chargement...</div>
                ) : contactData.length === 0 ? (
                  <div className="admin-empty-state"><div className="admin-empty-state-text">Aucun message de contact</div></div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Date</th><th>Nom</th><th>Email</th><th>Sujet</th><th>Message</th><th>Statut</th><th>Actions</th></tr></thead>
                    <tbody>
                      {contactData.map(m => {
                        const date = new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                        const statutStyle = m.statut === 'nouveau' ? { color: '#E8622A', fontWeight: 700 } : m.statut === 'lu' ? { color: '#3B82F6' } : { color: '#059669' }
                        const msgTrunc = m.message.length > 60 ? m.message.substring(0, 60) + '...' : m.message
                        return (
                          <tr key={m.id}>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{date}</td>
                            <td style={{ fontWeight: 600 }}>{m.nom}</td>
                            <td><a href={`mailto:${m.email}`} style={{ color: '#E8622A' }}>{m.email}</a></td>
                            <td>{m.sujet}</td>
                            <td style={{ fontSize: '12px', maxWidth: '200px' }} title={m.message}>{msgTrunc}</td>
                            <td style={{ ...statutStyle, textTransform: 'capitalize' }}>{m.statut}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {m.statut === 'nouveau' && <button className="btn-contact-lu" onClick={() => marquerContactLu(m.id)}>Lu</button>}
                              {m.statut !== 'traite' && <button className="btn-contact-traite" onClick={() => marquerContactTraite(m.id)}>Traite</button>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
