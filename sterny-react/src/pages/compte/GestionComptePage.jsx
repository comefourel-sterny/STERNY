import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { getInitials } from '../../utils/formatters'
import './GestionComptePage.css'

// Icônes SVG inline (style Feather, cohérent avec ParametresPage) — pas de lucide-react.
const IconInfos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const IconEtudes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
)
const IconAlternance = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
)
const IconApropos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
)
const IconDocuments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
)
const IconGarant = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
const IconCompte = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
const IconNotifications = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)

// Catégories groupées, dans l'ordre validé (3 groupes / 8 catégories).
const GROUPES = [
  {
    label: 'Profil',
    items: [
      { id: 'infos', libelle: 'Infos personnelles', Icone: IconInfos },
      { id: 'etudes', libelle: 'Tes études', Icone: IconEtudes },
      { id: 'alternance', libelle: 'Ton alternance', Icone: IconAlternance },
      { id: 'apropos', libelle: 'À propos de toi', Icone: IconApropos },
    ],
  },
  {
    label: 'Dossier',
    items: [
      { id: 'documents', libelle: 'Tes documents', Icone: IconDocuments },
      { id: 'garant', libelle: 'Ton garant', Icone: IconGarant },
    ],
  },
  {
    label: 'Compte',
    items: [
      { id: 'compte', libelle: 'Compte', Icone: IconCompte },
      { id: 'notifications', libelle: 'Notifications', Icone: IconNotifications },
    ],
  },
]

export default function GestionComptePage() {
  const { user } = useAuth()
  const [userData, setUserData] = useState(null)
  const [categorieActive, setCategorieActive] = useState('infos')

  useEffect(() => {
    if (!user) return
    supabaseClient
      .from('users')
      .select('prenom, nom, email, telephone, type_user, photo_profil_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setUserData(data) })
  }, [user])

  if (!user) return null

  const roleLabel = userData
    ? (userData.type_user === 'proprietaire' ? 'Proprietaire'
      : userData.type_user === 'hote' ? 'Hote'
      : userData.type_user === 'les_deux' ? 'Locataire & Hote'
      : 'Locataire')
    : ''

  const libelleActif = GROUPES
    .flatMap(g => g.items)
    .find(i => i.id === categorieActive)?.libelle || ''

  return (
    <div className="gc-page">
      <div className="gc-layout">
        <aside className="gc-sidebar">
          <div className="gc-identite">
            {userData?.photo_profil_url
              ? <img className="gc-avatar" src={userData.photo_profil_url} alt="" />
              : <div className="gc-avatar gc-avatar-initiales">{getInitials(userData?.prenom, userData?.nom)}</div>
            }
            <div className="gc-identite-texte">
              <div className="gc-identite-nom">{userData ? `${userData.prenom} ${userData.nom}` : '...'}</div>
              <div className="gc-identite-role">{roleLabel}</div>
            </div>
          </div>

          {GROUPES.map(groupe => (
            <div key={groupe.label} className="gc-groupe">
              <div className="gc-groupe-label">{groupe.label}</div>
              {groupe.items.map(({ id, libelle, Icone }) => (
                <button
                  key={id}
                  type="button"
                  className={`gc-item ${categorieActive === id ? 'gc-item-actif' : ''}`}
                  onClick={() => setCategorieActive(id)}
                >
                  <Icone />
                  <span>{libelle}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="gc-panel">
          <div className="gc-panel-titre">{libelleActif}</div>
          <div className="gc-placeholder">Cette section arrive au prochain patch.</div>
        </section>
      </div>
    </div>
  )
}
