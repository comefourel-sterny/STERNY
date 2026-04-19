import { useState } from 'react';
import { Link } from 'react-router-dom';
import './FaqPage.css';

function FaqItem({ question, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <div className="faq-answer">
        <div className="faq-answer-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="page-faq">
      <div className="faq-hero">
        <div className="faq-hero-inner">
          <span className="faq-badge">CENTRE D'AIDE</span>
          <h1>Besoin d'aide ?</h1>
          <p>Retrouvez ici toutes les r&eacute;ponses &agrave; vos questions sur STERNY</p>
        </div>
      </div>

      <div className="faq-content">
        {/* SECTION : GENERAL */}
        <h2 className="faq-section-title">
          <span className="faq-section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          G&eacute;n&eacute;ral
        </h2>

        <FaqItem question="Qu'est-ce que STERNY ?">
          STERNY est une plateforme de mise en relation entre <strong>&eacute;tudiants en alternance</strong> et <strong>propri&eacute;taires</strong>. Elle permet aux alternants de trouver un logement adapt&eacute; &agrave; leur rythme (1 semaine entreprise / 1 semaine &eacute;cole, etc.) et aux propri&eacute;taires de louer &agrave; des locataires v&eacute;rifi&eacute;s.
        </FaqItem>

        <FaqItem question="STERNY est-il gratuit ?">
          L&rsquo;inscription et la recherche sont <strong>100% gratuites</strong>. Des frais de service s&rsquo;appliquent uniquement lors de la signature d&rsquo;un contrat de location (d&eacute;p&ocirc;t de garantie et premier loyer). Consultez nos <Link to="/cgv">CGV</Link> pour le d&eacute;tail.
        </FaqItem>

        <FaqItem question="Dans quelles villes STERNY est-il disponible ?">
          STERNY est actuellement disponible &agrave; <strong>Rennes, Nantes et Brest</strong>. Nous &eacute;tendrons bient&ocirc;t &agrave; d&rsquo;autres villes &eacute;tudiantes en France.
        </FaqItem>

        {/* SECTION : LOCATAIRES */}
        <h2 className="faq-section-title">
          <span className="faq-section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          Pour les &eacute;tudiants / locataires
        </h2>

        <FaqItem question="Comment m'inscrire en tant qu'étudiant ?">
          Cliquez sur <Link to="/inscription">&laquo; S&rsquo;inscrire &raquo;</Link>, choisissez votre profil (&eacute;tudiant qui cherche un logement ou qui souhaite partager le sien), puis compl&eacute;tez votre profil avec vos informations d&rsquo;alternance (ville entreprise, ville &eacute;cole, rythme).
        </FaqItem>

        <FaqItem question="Comment fonctionne le matching ?">
          STERNY analyse votre <strong>rythme d&rsquo;alternance</strong>, vos <strong>villes</strong> (entreprise et &eacute;cole) et votre <strong>budget</strong> pour vous proposer les logements les plus compatibles. Plus votre profil est complet, meilleur sera le matching.
        </FaqItem>

        <FaqItem question="Quels documents dois-je fournir ?">
          Pour constituer votre dossier locataire, vous aurez besoin de : <strong>pi&egrave;ce d&rsquo;identit&eacute;</strong>, <strong>contrat d&rsquo;alternance ou convention</strong>, <strong>justificatif de revenus</strong> (ou garant), et un <strong>RIB</strong>. Tous les documents sont t&eacute;l&eacute;charg&eacute;s de mani&egrave;re s&eacute;curis&eacute;e sur la plateforme.
        </FaqItem>

        <FaqItem question="Je peux annuler ma candidature ?">
          Oui, tant que le propri&eacute;taire n&rsquo;a pas accept&eacute; votre candidature, vous pouvez l&rsquo;annuler depuis votre <strong>dashboard</strong>. Apr&egrave;s acceptation, il faudra suivre la proc&eacute;dure de r&eacute;siliation.
        </FaqItem>

        {/* SECTION : PROPRIETAIRES */}
        <h2 className="faq-section-title">
          <span className="faq-section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
          Pour les propri&eacute;taires
        </h2>

        <FaqItem question="Comment publier une annonce ?">
          Apr&egrave;s inscription, acc&eacute;dez &agrave; votre <strong>espace propri&eacute;taire</strong> et cliquez sur &laquo; Cr&eacute;er une annonce &raquo;. Renseignez la description, les photos, le loyer, la caution, les &eacute;quipements et les disponibilit&eacute;s. Votre annonce sera visible imm&eacute;diatement.
        </FaqItem>

        <FaqItem question="Comment sont sélectionnés les locataires ?">
          Vous recevez les candidatures dans votre dashboard. Vous pouvez consulter le <strong>profil complet</strong> et le <strong>dossier locataire</strong> de chaque candidat, puis accepter ou refuser. C&rsquo;est vous qui choisissez.
        </FaqItem>

        <FaqItem question="Les paiements sont-ils sécurisés ?">
          Oui, tous les paiements passent par <strong>Stripe</strong>, leader mondial du paiement en ligne. Les transactions sont chiffr&eacute;es et s&eacute;curis&eacute;es. STERNY ne stocke jamais vos informations bancaires.
        </FaqItem>

        {/* SECTION : CONTRAT & PAIEMENT */}
        <h2 className="faq-section-title">
          <span className="faq-section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </span>
          Contrat &amp; Paiement
        </h2>

        <FaqItem question="Comment se passe la signature du contrat ?">
          Apr&egrave;s l&rsquo;acceptation de la candidature, un <strong>contrat de location</strong> est g&eacute;n&eacute;r&eacute; automatiquement. Les deux parties le signent &eacute;lectroniquement sur la plateforme. Une fois sign&eacute;, le paiement du d&eacute;p&ocirc;t de garantie et du premier loyer est d&eacute;clench&eacute;.
        </FaqItem>

        <FaqItem question="Comment résilier mon contrat ?">
          Locataire ou propri&eacute;taire, vous pouvez initier une r&eacute;siliation depuis la page de votre <strong>logement actif</strong>. Choisissez un motif, ajoutez un commentaire, et l&rsquo;autre partie sera notifi&eacute;e. La restitution de la caution sera g&eacute;r&eacute;e ensuite.
        </FaqItem>

        <FaqItem question="Comment fonctionne la restitution de caution ?">
          En fin de contrat, le propri&eacute;taire initie la restitution en indiquant le montant &eacute;ventuellement retenu (d&eacute;gradations, impay&eacute;s). Le locataire peut accepter ou contester. Le remboursement est effectu&eacute; automatiquement via Stripe.
        </FaqItem>

        {/* BOX CONTACT */}
        <div className="faq-contact-box">
          <p>Vous ne trouvez pas la r&eacute;ponse &agrave; votre question ?</p>
          <Link to="/contact">Contactez-nous</Link>
        </div>
      </div>
    </div>
  );
}
