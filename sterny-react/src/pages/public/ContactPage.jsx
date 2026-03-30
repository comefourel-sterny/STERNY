import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../../config/supabase';
import './ContactPage.css';

export default function ContactPage() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

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
      <div className="contact-card">
        <Link to="/" className="btn-back-top">
          <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Retour
        </Link>
        <h1>Nous contacter</h1>
        <p className="subtitle">Une question, un probl&egrave;me ou une suggestion ? On vous r&eacute;pond sous 24h.</p>

        {/* CANAUX DE CONTACT */}
        <div className="contact-channels">
          <div className="channel-card">
            <div className="channel-icon">
              <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <h3>Email</h3>
            <p>R&eacute;ponse sous 24h</p>
            <a href="mailto:contact@sterny.co">contact@sterny.co</a>
          </div>
          <div className="channel-card">
            <div className="channel-icon">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h3>Messagerie</h3>
            <p>Si vous avez un compte</p>
            <a href="/messages">Ouvrir mes messages</a>
          </div>
        </div>

        {/* FORMULAIRE */}
        {!success ? (
          <>
            <h2 className="contact-form-title">Envoyer un message</h2>
            <form aria-label="Formulaire de contact" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactNom">Nom complet</label>
                  <input
                    type="text"
                    id="contactNom"
                    placeholder="Prénom Nom"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contactEmail">Adresse email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    placeholder="vous@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contactSujet">Sujet</label>
                <select
                  id="contactSujet"
                  required
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                >
                  <option value="" disabled>Choisissez un sujet</option>
                  <option value="question">Question g&eacute;n&eacute;rale</option>
                  <option value="inscription">Probl&egrave;me d&rsquo;inscription</option>
                  <option value="paiement">Question sur un paiement</option>
                  <option value="contrat">Question sur un contrat</option>
                  <option value="bug">Signaler un bug</option>
                  <option value="suggestion">Suggestion d&rsquo;am&eacute;lioration</option>
                  <option value="partenariat">Partenariat / Presse</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contactMessage">Votre message</label>
                <textarea
                  id="contactMessage"
                  placeholder="Décrivez votre demande en détail..."
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={sending}>
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </form>
          </>
        ) : (
          <div className="form-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Message envoy&eacute; !</h3>
            <p>Merci pour votre message. Nous vous r&eacute;pondrons dans les 24 heures &agrave; l&rsquo;adresse indiqu&eacute;e.</p>
          </div>
        )}
      </div>
    </div>
  );
}
