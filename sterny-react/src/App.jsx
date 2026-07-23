import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import PasswordGate from './components/PasswordGate'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// Layouts & handlers
import Layout from './components/layout/Layout'
import OAuthHandler from './components/OAuthHandler'
import DashboardLayout from './components/layout/DashboardLayout'
import RedirectIfAuth from './components/layout/RedirectIfAuth'
import { VilleActiveProvider } from './contexts/VilleActiveContext'

// Public pages
import HomePage from './pages/public/HomePage'
import RecherchePage from './pages/public/RecherchePage'
import LogementPage from './pages/public/LogementPage'
import CommentCaMarchePage from './pages/public/CommentCaMarchePage'
import CommentCaMarcheRecherchePage from './pages/public/CommentCaMarcheRecherchePage'
import CommentCaMarcheProprietairePage from './pages/public/CommentCaMarcheProprietairePage'
import CommentCaMarcheAlternerPage from './pages/public/CommentCaMarcheAlternerPage'
import AProposPage from './pages/public/AProposPage'
import AvisPage from './pages/public/AvisPage'
import FaqPage from './pages/public/FaqPage'
import ContactPage from './pages/public/ContactPage'
import AgencesPartenairesPage from './pages/public/AgencesPartenairesPage'

// Auth pages
import ConnexionPage from './pages/auth/ConnexionPage'
import ChoixInscriptionPage from './pages/auth/ChoixInscriptionPage'
import InscriptionRecherchePage from './pages/auth/InscriptionRecherchePage'
import InscriptionProprietairePage from './pages/auth/InscriptionProprietairePage'
import InscriptionPartagerPage from './pages/auth/InscriptionPartagerPage'
import InscriptionAlternantPage from './pages/auth/InscriptionAlternantPage'
import CompleterProfilPage from './pages/auth/CompleterProfilPage'
import MotDePasseOubliePage from './pages/auth/MotDePasseOubliePage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Dashboard pages
import { Navigate } from 'react-router-dom'
import DashboardLocatairePage from './pages/dashboard/DashboardLocatairePage'
import DashboardProprietairePage from './pages/dashboard/DashboardProprietairePage'
import DashboardAdminPage from './pages/dashboard/DashboardAdminPage'
import PlancheCouverturePage from './pages/dashboard/PlancheCouverturePage'

// Annonce pages
import CreerAnnoncePage from './pages/annonce/CreerAnnoncePage'
import ModifierAnnoncePage from './pages/annonce/ModifierAnnoncePage'

// Parametres
import ParametresPage from './pages/parametres/ParametresPage'

// Profil pages
import ProfilPage from './pages/profil/ProfilPage'
import ModifierProfilPage from './pages/profil/ModifierProfilPage'
import ModifierProfilProprietairePage from './pages/profil/ModifierProfilProprietairePage'
import PresentationProprietairePage from './pages/profil/PresentationProprietairePage'
import DossierLocatairePage from './pages/profil/DossierLocatairePage'

// Transaction pages
import MatchActifPage from './pages/transaction/MatchActifPage'
import MatchConfirmationPage from './pages/transaction/MatchConfirmationPage'
import EmailMatchConfirmationPage from './pages/transaction/EmailMatchConfirmationPage'
import ContratLocationPage from './pages/transaction/ContratLocationPage'
import EtatDesLieuxPage from './pages/transaction/EtatDesLieuxPage'
import PaiementInitialPage from './pages/transaction/PaiementInitialPage'
import PaiementSuccessPage from './pages/transaction/PaiementSuccessPage'
import RenouvellementPage from './pages/transaction/RenouvellementPage'

// Communication pages
import MessagesPage from './pages/communication/MessagesPage'

// Legal pages
import CguPage from './pages/legal/CguPage'
import CgvPage from './pages/legal/CgvPage'
import MentionsLegalesPage from './pages/legal/MentionsLegalesPage'
import PolitiqueConfidentialitePage from './pages/legal/PolitiqueConfidentialitePage'
import PolitiqueRemboursementPage from './pages/legal/PolitiqueRemboursementPage'

// Invitation page (no layout)
import InvitationPage from './pages/invitation/InvitationPage'

// Dev pages (no layout, not linked in nav)
import RhythmCalendarPreview from './dev/RhythmCalendarPreview'
import RhythmFileUploadPreview from './dev/RhythmFileUploadPreview'
import RhythmManualBuilderPreview from './dev/RhythmManualBuilderPreview'
import PlancheCouverturePreview from './dev/PlancheCouverturePreview' // DEV ONLY — à retirer (chantier planche à découper T1)
import AuthWizardSandbox from './dev/AuthWizardSandbox'
import ParcoursPropositionPreview from './pages/dev/ParcoursPropositionPreview' // DEV ONLY — conception parcours couverture

// Other
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <PasswordGate>
      <ScrollToTop />
      <OAuthHandler />
      <VilleActiveProvider>
      <Routes>
        {/* Invitation — no layout */}
        <Route path="/invitation/:token" element={<InvitationPage />} />

        {/* Dev — no layout, not linked in nav */}
        <Route path="/dev/rhythm-calendar-preview" element={<RhythmCalendarPreview />} />
        <Route path="/dev/rhythm-file-upload-preview" element={<RhythmFileUploadPreview />} />
        <Route path="/dev/rhythm-manual-builder-preview" element={<RhythmManualBuilderPreview />} />
        <Route path="/dev/planche-couverture" element={<PlancheCouverturePreview />} /> {/* DEV ONLY — à retirer (chantier planche à découper T1) */}
        <Route path="/dev/auth-wizard-sandbox" element={<AuthWizardSandbox />} />
        <Route path="/dev/parcours-proposition" element={<ParcoursPropositionPreview />} /> {/* DEV ONLY — conception parcours couverture */}

        {/* Temp: test */}
        <Route element={<Layout />}>
          <Route path="/annonce/creer" element={<CreerAnnoncePage />} />
        </Route>

        {/* Public layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/recherche" element={<RecherchePage />} />
          <Route path="/logement" element={<LogementPage />} />
          <Route path="/comment-ca-marche" element={<CommentCaMarchePage />} />
          <Route path="/comment-ca-marche/recherche" element={<CommentCaMarcheRecherchePage />} />
          <Route path="/comment-ca-marche/proprietaire" element={<CommentCaMarcheProprietairePage />} />
          <Route path="/comment-ca-marche/alterner" element={<CommentCaMarcheAlternerPage />} />
          <Route path="/a-propos" element={<AProposPage />} />
          <Route path="/avis" element={<AvisPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/agences-partenaires" element={<AgencesPartenairesPage />} />

          {/* Auth pages */}
          <Route path="/connexion" element={<RedirectIfAuth><ConnexionPage /></RedirectIfAuth>} />
          <Route path="/inscription" element={<RedirectIfAuth><ChoixInscriptionPage /></RedirectIfAuth>} />
          <Route path="/inscription/recherche" element={<RedirectIfAuth><InscriptionRecherchePage /></RedirectIfAuth>} />
          <Route path="/inscription/proprietaire" element={<RedirectIfAuth><InscriptionProprietairePage /></RedirectIfAuth>} />
          <Route path="/inscription/partager" element={<RedirectIfAuth><InscriptionPartagerPage /></RedirectIfAuth>} />
          <Route path="/inscription/alternant" element={<RedirectIfAuth><InscriptionAlternantPage /></RedirectIfAuth>} />
          <Route path="/completer-profil" element={<CompleterProfilPage />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOubliePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Legal pages */}
          <Route path="/cgu" element={<CguPage />} />
          <Route path="/cgv" element={<CgvPage />} />
          <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
          <Route path="/politique-remboursement" element={<PolitiqueRemboursementPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dashboard layout (protected) */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardLocatairePage />} />
          <Route path="/dashboard/locataire" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/hote" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/proprietaire" element={<DashboardProprietairePage />} />
          <Route path="/dashboard/admin" element={<DashboardAdminPage />} />

          {/* Annonce */}
          <Route path="/annonce/creer" element={<CreerAnnoncePage />} />
          <Route path="/annonce/modifier" element={<ModifierAnnoncePage />} />

          {/* Planche de couverture */}
          <Route path="/mon-calendrier" element={<PlancheCouverturePage />} />

          {/* Parametres */}
          <Route path="/parametres" element={<ParametresPage />} />

          {/* Profil */}
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/profil/modifier" element={<ModifierProfilPage />} />
          <Route path="/profil/modifier-proprietaire" element={<ModifierProfilProprietairePage />} />
          <Route path="/proprietaire/:id" element={<PresentationProprietairePage />} />
          <Route path="/dossier-locataire" element={<DossierLocatairePage />} />

          {/* Transaction */}
          <Route path="/match-actif" element={<MatchActifPage />} />
          <Route path="/match-confirmation" element={<MatchConfirmationPage />} />
          <Route path="/email-match-confirmation" element={<EmailMatchConfirmationPage />} />
          <Route path="/contrat-location" element={<ContratLocationPage />} />
          <Route path="/etat-des-lieux" element={<EtatDesLieuxPage />} />
          <Route path="/paiement" element={<PaiementInitialPage />} />
          <Route path="/paiement/success" element={<PaiementSuccessPage />} />
          <Route path="/renouvellement" element={<RenouvellementPage />} />

          {/* Communication */}
          <Route path="/messages" element={<MessagesPage />} />
        </Route>
      </Routes>
      </VilleActiveProvider>
    </PasswordGate>
  )
}
