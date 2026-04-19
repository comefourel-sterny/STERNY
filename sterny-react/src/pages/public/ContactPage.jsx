import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth.jsx';
import './ContactPage.css';

export default function ContactPage() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState('');
  const [sujetLabel, setSujetLabel] = useState('Choisissez un sujet');
  const [sujetOpen, setSujetOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const SUJETS = [
    { value: 'question', label: 'Question générale' },
    { value: 'inscription', label: "Problème d'inscription" },
    { value: 'paiement', label: 'Question sur un paiement' },
    { value: 'contrat', label: 'Question sur un contrat' },
    { value: 'bug', label: 'Signaler un bug' },
    { value: 'suggestion', label: "Suggestion d'amélioration" },
    { value: 'partenariat', label: 'Partenariat / Presse' },
    { value: 'autre', label: 'Autre' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Retrieve connected user if any
      let userId = null;
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) userId = user.id;
      } catch (_) { /* visitor not logged in */ }

      const { error } = await supabaseClient.from('messages_contact').insert({
        nom: nom.trim(),
        email: email.trim(),
        sujet,
        message: message.trim(),
        user_id: userId,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error) {
      console.error('Erreur envoi:', error);
      setSending(false);
      alert("Une erreur est survenue. Veuillez réessayer ou nous écrire directement à contact@sterny.co");
    }
  };

  return (
    <div className="page-contact">
      <div className="contact-hero">
        <div className="contact-hero-inner">
          <span className="contact-badge">CONTACT</span>
          <h1>Nous contacter</h1>
          <p>Une question, un probl&egrave;me ou une suggestion ? On vous r&eacute;pond sous 24h.</p>
        </div>
      </div>

      <div className="contact-content">
        {/* CANAUX */}
        <div className="contact-channels">
          <div className="contact-channel">
            <div className="contact-channel-header">
              <span className="contact-channel-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </span>
              <h3>Email</h3>
            </div>
            <p>R&eacute;ponse sous 24h</p>
            <a href="mailto:contact@sterny.co">contact@sterny.co</a>
          </div>
          <div className="contact-channel">
            <div className="contact-channel-header">
              <span className="contact-channel-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </span>
              <h3>Messagerie</h3>
            </div>
            <p>Si vous avez un compte</p>
            {user ? <Link to="/messages">Ouvrir mes messages</Link> : <Link to="/connexion">Se connecter</Link>}
          </div>
        </div>

        {/* FORMULAIRE */}
        {!success ? (
          <div className="contact-form-card">
            <h2 className="contact-form-title">Envoyer un message</h2>
            <form aria-label="Formulaire de contact" onSubmit={handleSubmit}>
              <div className="ct-form-row">
                <div className="ct-form-group">
                  <label htmlFor="contactNom">Nom complet</label>
                  <input
                    type="text"
                    id="contactNom"
                    placeholder="Marie Dupont"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
                <div className="ct-form-group">
                  <label htmlFor="contactEmail">Adresse email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    placeholder="marie@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="ct-form-group">
                <label>Sujet</label>
                <div className="ct-select-wrapper" style={{ position: 'relative' }}>
                  <div
                    className="ct-select-trigger"
                    onClick={() => setSujetOpen(!sujetOpen)}
                    style={{ color: sujet ? '#1E293B' : '#94A3B8' }}
                  >
                    <span>{sujetLabel}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0, transition: 'transform 0.2s', transform: sujetOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  <div className={`ct-dropdown${sujetOpen ? ' open' : ''}`}>
                    {SUJETS.map(opt => (
                      <div
                        key={opt.value}
                        className={`ct-dropdown-option${sujet === opt.value ? ' selected' : ''}`}
                        onClick={() => { setSujet(opt.value); setSujetLabel(opt.label); setSujetOpen(false); }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ct-form-group">
                <label htmlFor="contactMessage">Votre message</label>
                <textarea
                  id="contactMessage"
                  placeholder="Décrivez votre demande en détail..."
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="ct-btn-submit" disabled={sending}>
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </form>
          </div>
        ) : (
          <div className="contact-form-card">
            <div className="ct-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h3>Message envoy&eacute; !</h3>
              <p>Merci pour votre message. Nous vous r&eacute;pondrons dans les 24 heures &agrave; l&rsquo;adresse indiqu&eacute;e.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
