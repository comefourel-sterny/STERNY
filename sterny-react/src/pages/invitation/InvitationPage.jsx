import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './InvitationPage.css'

export default function InvitationPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [parrain, setParrain] = useState(null)
  const [invalid, setInvalid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return }

    supabaseClient
      .from('users')
      .select('id, prenom, nom')
      .eq('invitation_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setInvalid(true)
        } else {
          setParrain(data)
        }
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="inv-page">
        <div className="inv-loading">Chargement...</div>
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="inv-page" style={{ justifyContent: 'center' }}>
        <div className="inv-left" style={{ maxWidth: 480, textAlign: 'center', alignItems: 'center' }}>
          <img src="/Logo-Sterny-V1.svg" alt="STERNY" className="inv-logo" />
          <h1 className="inv-title">LIEN INVALIDE</h1>
          <p className="inv-desc">Ce lien d'invitation n'est plus valide ou a expiré.</p>
          <button className="inv-cta" style={{ maxWidth: 320 }} onClick={() => navigate('/')}>Retour à l'accueil</button>
        </div>
      </div>
    )
  }

  return (
    <div className="inv-page">
      {/* ══ LEFT — contenu ══ */}
      <div className="inv-left">
        <div className="inv-left-top">
          <img src="/Logo-Sterny-V1.svg" alt="STERNY" className="inv-logo inv-stagger" />

          <p className="inv-inviter inv-stagger" style={{ animationDelay: '0.08s' }}>
            <strong>{parrain.prenom}</strong> vous a invité sur STERNY
          </p>

          <h1 className="inv-heading inv-stagger" style={{ animationDelay: '0.16s' }}>
            Gérez la relation avec votre locataire en toute simplicité
          </h1>

          <div className="inv-benefits inv-stagger" style={{ animationDelay: '0.24s' }}>
            <div className="inv-benefit">
              <div className="inv-benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="inv-benefit-text">
                <strong>Mise en relation directe</strong>
                <span>Connectez-vous avec votre locataire alternant en quelques clics</span>
              </div>
            </div>

            <div className="inv-benefit">
              <div className="inv-benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div className="inv-benefit-text">
                <strong>Paiements sécurisés</strong>
                <span>Loyers gérés et versés automatiquement sur la plateforme</span>
              </div>
            </div>

            <div className="inv-benefit">
              <div className="inv-benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="inv-benefit-text">
                <strong>100% gratuit pour vous</strong>
                <span>Aucun frais pour les propriétaires, inscription en 2 minutes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="inv-left-bottom inv-stagger" style={{ animationDelay: '0.32s' }}>
          <button
            className="inv-cta"
            onClick={() => navigate(`/inscription/proprietaire?r=${token}`)}
          >
            Créer mon compte gratuitement
          </button>
          <p className="inv-reassurance">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Données sécurisées · Aucun engagement
          </p>
        </div>
      </div>

      {/* ══ RIGHT — vidéo ══ */}
      <div className="inv-right inv-stagger" style={{ animationDelay: '0.24s' }}>
        <div className="inv-video">
          <div className="inv-play">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
              <path d="M9.5 7.5v9l7-4.5z" />
            </svg>
          </div>
          <span className="inv-video-label">Découvrir STERNY en 1 min</span>
        </div>
      </div>
    </div>
  )
}
