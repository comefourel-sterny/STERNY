# Inventaire de la plateforme Sterny

Document de référence factuel. Décrit **ce qui existe** dans la plateforme à un instant donné : routes, pages, composants, Edge Functions, tables, buckets, skills, conventions, design system appliqué. Ne décrit ni les principes (`VISION-ARCHITECTURE.md`), ni l'historique (`ETAT-COURANT.md`), ni les bugs connus (`DETTE-TECHNIQUE.md`).

**Stabilité** : ce document n'est pas mis à jour à chaque session. Il est mis à jour uniquement quand une page, un composant majeur, une Edge Function, une table, un bucket ou un pattern visuel structurant est créé, supprimé ou modifié. Toute autre évolution (refactor interne, changement de logique métier, fix de bug) ne touche pas ce document.

**Dernière mise à jour** : 25 avril 2026 — création initiale du document à partir des audits `docs/_audit/AUDIT-PLATEFORME-2026-04-25.md` et `docs/_audit/AUDIT-DESIGN-2026-04-25.md` (commit HEAD au moment des audits : `50741de`).

---

## 1. Arborescence du repo

```
/Users/comefourel/Dev/sterny/
│
├── sterny-react/                  ← application React
│   └── src/
│       ├── pages/                 ← une page = une route
│       ├── components/            ← composants partagés
│       ├── hooks/                 ← hooks custom (useAuth, useAccountActions)
│       ├── utils/                 ← helpers purs
│       ├── config/                ← client Supabase singleton
│       ├── dev/                   ← fixtures + previews dev (créé 25 avril)
│       └── App.jsx                ← routing centralisé (toutes les <Route>)
│
├── supabase/
│   ├── functions/                 ← 18 Edge Functions
│   ├── migrations/                ← migrations SQL (5 actuellement)
│   ├── remote_schema.sql          ← dump du schéma prod (source de vérité BDD)
│   └── _rollback/                 ← snapshots locaux pré-DROP (gitignoré)
│
├── docs/
│   ├── CONTEXTE-PROJET.md         ← qui je suis, stack, conventions
│   ├── VISION-ARCHITECTURE.md     ← où on va, principes fondateurs
│   ├── ETAT-COURANT.md            ← historique session par session
│   ├── DETTE-TECHNIQUE.md         ← bugs connus, bypass DEV
│   ├── INVENTAIRE-PLATEFORME.md   ← ce document
│   └── _audit/                    ← rapports d'audit jetables (gitignoré)
│
└── CLAUDE.md                      ← instructions auto-lues par Claude Code
```

---

## 2. Routes actives

Toutes les routes sont déclarées dans `sterny-react/src/App.jsx` (pas de routing décentralisé). Trois layouts coexistent : `<Layout/>` (public), `<DashboardLayout/>` (auth requise), aucun layout (pages nues).

### Auth

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/connexion` | `ConnexionPage` | Layout | public |
| `/inscription` | `ChoixInscriptionPage` | Layout | public |
| `/inscription/recherche` | `InscriptionRecherchePage` | Layout | public |
| `/inscription/proprietaire` | `InscriptionProprietairePage` | Layout | public, `?r=token` parrainage optionnel |
| `/inscription/partager` | `InscriptionPartagerPage` | Layout | public |
| `/completer-profil` | `CompleterProfilPage` | Layout | auth (post Google OAuth principalement) |
| `/mot-de-passe-oublie` | `MotDePasseOubliePage` | Layout | public |
| `/reset-password` | `ResetPasswordPage` | Layout | session de recovery |

### Recherche et public

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/` | `HomePage` | Layout (dark) | public |
| `/recherche` | `RecherchePage` | Layout (dark) | public, CTA alerte = auth |
| `/logement` | `LogementPage` | Layout | public, `?id=` |
| `/comment-ca-marche` | `CommentCaMarchePage` | Layout | public |
| `/comment-ca-marche/recherche` | `CommentCaMarcheRecherchePage` | Layout (dark) | public |
| `/comment-ca-marche/proprietaire` | `CommentCaMarcheProprietairePage` | Layout (dark) | public |
| `/comment-ca-marche/alterner` | `CommentCaMarcheAlternerPage` | Layout (dark) | public |
| `/a-propos` | `AProposPage` | Layout | public |
| `/avis` | `AvisPage` | Layout | lecture publique, écriture auth |
| `/faq` | `FaqPage` | Layout (dark) | public |
| `/contact` | `ContactPage` | Layout (dark) | public |
| `/agences-partenaires` | `AgencesPartenairesPage` | Layout (dark) | public |

### Dashboard

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/dashboard` | `DashboardLocatairePage` | DashboardLayout | auth, sert **tous types alternants** (locataire, hote, les_deux). Le nom de fichier est trompeur — la page est fusionnée. |
| `/dashboard/locataire` | redirect `/dashboard` | DashboardLayout | auth |
| `/dashboard/hote` | redirect `/dashboard` | DashboardLayout | auth |
| `/dashboard/proprietaire` | `DashboardProprietairePage` | DashboardLayout | auth + `type_user='proprietaire'` |
| `/dashboard/admin` | `DashboardAdminPage` | DashboardLayout | auth + `is_admin=true` |

### Annonce

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/annonce/creer` | `CreerAnnoncePage` | Layout (à cause d'un doublon — voir DETTE) | en théorie auth, en pratique sous Layout simple |
| `/annonce/modifier` | `ModifierAnnoncePage` | DashboardLayout | auth + propriétaire de l'annonce |

### Transaction et paiement

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/match-actif` | `MatchActifPage` | DashboardLayout | auth, `?match_id=` |
| `/match-confirmation` | `MatchConfirmationPage` | DashboardLayout | auth, `?match_id=` |
| `/contrat-location` | `ContratLocationPage` | DashboardLayout | auth, signature électronique |
| `/etat-des-lieux` | `EtatDesLieuxPage` | DashboardLayout | auth, `?match_id=` |
| `/paiement` | `PaiementInitialPage` | DashboardLayout | auth, redirige Stripe |
| `/paiement/success` | `PaiementSuccessPage` | DashboardLayout | auth, `?session_id=` |
| `/renouvellement` | `RenouvellementPage` | DashboardLayout | auth, `?contrat_id=` |
| `/email-match-confirmation` | `EmailMatchConfirmationPage` | DashboardLayout | dev/preview d'email transactionnel — à isoler dans `/dev/` |

### Profil et communication

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/parametres` | `ParametresPage` | DashboardLayout | auth |
| `/profil` | `ProfilPage` | DashboardLayout | auth, vue propre profil ou tiers via `?id=` |
| `/profil/modifier` | `ModifierProfilPage` | DashboardLayout | auth + locataire/hote/les_deux |
| `/profil/modifier-proprietaire` | `ModifierProfilProprietairePage` | DashboardLayout | auth + propriétaire |
| `/dossier-locataire` | `DossierLocatairePage` | DashboardLayout | auth + locataire |
| `/proprietaire/:id` | `PresentationProprietairePage` | DashboardLayout | placeholder, n'utilise pas `:id` |
| `/messages` | `MessagesPage` | DashboardLayout | auth, wrap autour de `<ChatComponent mode="page"/>` |

### Onboarding et invitation

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/invitation/:token` | `InvitationPage` | nu | public, token parrainage |

### Légal

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/cgu` | `CguPage` | Layout | public |
| `/cgv` | `CgvPage` | Layout | public |
| `/mentions-legales` | `MentionsLegalesPage` | Layout | public, contient `[À COMPLÉTER]` |
| `/politique-confidentialite` | `PolitiqueConfidentialitePage` | Layout | public, SIRET `[À COMPLÉTER]` |
| `/politique-remboursement` | `PolitiqueRemboursementPage` | Layout | public |

### Dev et catch-all

| Path | Page | Layout | Auth & accès |
|---|---|---|---|
| `/dev/rhythm-calendar-preview` | `RhythmCalendarPreview` | nu | dev/preview, pas de garde |
| `*` | `NotFoundPage` | Layout | public |

---

## 3. Pages principales

41 pages dans `sterny-react/src/pages/`, organisées par sous-dossier domaine.

**`pages/auth/`** : ConnexionPage, ChoixInscriptionPage, InscriptionRecherchePage, InscriptionProprietairePage, InscriptionPartagerPage, CompleterProfilPage, MotDePasseOubliePage, ResetPasswordPage.

**`pages/public/`** : HomePage, RecherchePage, LogementPage, CommentCaMarchePage (+ 3 sous-pages : recherche, proprietaire, alterner), AProposPage, AvisPage, FaqPage, ContactPage, AgencesPartenairesPage.

**`pages/dashboard/`** : DashboardLocatairePage (fusionnée tous types alternants), DashboardProprietairePage, DashboardAdminPage.

**`pages/annonce/`** : CreerAnnoncePage (en WIP, bypass DEV actifs — voir DETTE), ModifierAnnoncePage (clone partiel).

**`pages/transaction/`** : MatchActifPage, MatchConfirmationPage, EmailMatchConfirmationPage (preview d'email, pas une vraie page produit), ContratLocationPage, EtatDesLieuxPage, PaiementInitialPage, PaiementSuccessPage, RenouvellementPage.

**`pages/profil/`** : ProfilPage, ModifierProfilPage, ModifierProfilProprietairePage, PresentationProprietairePage (placeholder, n'utilise pas le param `:id`), DossierLocatairePage.

**`pages/parametres/`** : ParametresPage.

**`pages/legal/`** : MentionsLegalesPage, CguPage, CgvPage, PolitiqueConfidentialitePage, PolitiqueRemboursementPage.

**`pages/communication/`** : MessagesPage.

**`pages/invitation/`** : InvitationPage.

**`pages/`** (racine) : NotFoundPage.

---

## 4. Composants partagés

15 composants dans `sterny-react/src/components/`.

**Racine** (`components/`) : PasswordGate (gate landing par hash SHA-256), GoogleAuthHandler (handler post-OAuth Google).

**`components/layout/`** : Layout, DashboardLayout, Navbar, Footer, UserDropdown.

**`components/dashboard/`** : AgendaCard, ProfileMiniBar.

**`components/chat/`** : ChatComponent (modes `page` et `overlay`).

**`components/rhythm/`** : RhythmCalendar (dumb readonly, créé 25 avril, en WIP — voir ETAT-COURANT).

### Composants morts identifiés au 25 avril

Définis mais non référencés. À nettoyer (voir DETTE) :

- `Stepper` (`components/Stepper.jsx`)
- `FooterMinimal` (`components/layout/FooterMinimal.jsx`)
- `HamburgerMenu` (`components/layout/HamburgerMenu.jsx`)
- `NotificationBell` (`components/layout/NotificationBell.jsx`) — **conséquence importante** : la table `notifications_in_app` n'a plus de consommateur frontend.

---

## 5. Edge Functions

18 fonctions dans `supabase/functions/`. Statut prod croisé avec DETTE #17.

| Nom | Rôle | Statut prod |
|---|---|---|
| `check-baux-expirants` | CRON quotidien — détecte baux expirants, déclenche email rappel | déployée |
| `check-loyers-impays` | CRON quotidien — détecte loyers impayés, déclenche relance email | déployée |
| `create-stripe-checkout` | Crée session Stripe Checkout (SEPA initial ou impayé carte) | déployée |
| `create-stripe-identity-session` | Crée session Stripe Identity (vérif pièce ID hébergée) | déployée |
| `create-stripe-portal` | Crée session Stripe Customer Portal (gérer RIB SEPA) | déployée |
| `delete-account` | Supprime compte + données (RGPD Art. 17) | déployée mais incomplète (DETTE Cat. B audit Zone 1) |
| `expire-candidatures` | CRON — expire candidatures sans réponse > 14 jours | non déployée (DETTE #17) |
| `export-data` | Export données utilisateur (RGPD Art. 20) | non déployée (DETTE #17) + incomplète |
| `parse-school-calendar` | Parse PDF/image planning école via Claude vision → `rhythm_imports` | déployée (v5, validée 25 avril) |
| `restitution-caution` | Refund Stripe du dépôt de garantie en fin de contrat | non déployée (DETTE #17) |
| `send-alert-email` | Email confirmation alerte logement | déployée |
| `send-fin-bail-email` | Email rappel fin de bail (locataire + propriétaire) | déployée |
| `send-landing-email` | Email bienvenue landing page | non déployée (DETTE #17) — appelée mais 404 en prod |
| `send-proprietaire-invitation` | Email invitation propriétaire (parrainage hote→proprio) | déployée |
| `send-recu-paiement` | Reçu de paiement automatique post-Stripe | non déployée (DETTE #17) |
| `send-relance-impaye-email` | Email relance impayé (locataire + propriétaire + garant) | déployée |
| `stripe-webhook` | Reçoit événements Stripe et met à jour BDD | déployée |
| `verify-document` | OCR Google Vision pour vérification documents dossier locataire | déployée |

---

## 6. Tables BDD

17 tables dans le schéma `public`, **toutes avec RLS activée**. Le détail des colonnes vit dans `supabase/remote_schema.sql`.

- **`users`** : profil utilisateur (UUID lié à `auth.users`). Contient `type_user` (`locataire` / `hote` / `proprietaire` / `les_deux`), colonnes rythme (`rhythm_calendar`, `rhythm_source`, etc.), parrainage (`parrain_id`, `code_parrainage`), documents dossier locataire.
- **`annonces`** : logements publiés par les alternants `hote` ou `les_deux`.
- **`alertes`** : alertes de recherche (ville, rythme) déclenchant un email à la prochaine annonce correspondante.
- **`avis`** : avis 5 étoiles entre utilisateurs post-location.
- **`candidatures`** : candidatures locataire → annonce.
- **`contrats`** : contrats de location signés électroniquement (avec colonnes Stripe).
- **`etats_des_lieux`** : checklist EDL d'entrée et de sortie.
- **`favoris`** : favoris locataire ↔ annonce.
- **`messages`** : messagerie privée 1-1 entre utilisateurs.
- **`messages_contact`** : messages depuis le formulaire `/contact`.
- **`mises_en_relation`** : table dont l'usage actif est à éclaircir.
- **`notifications_envoyees`** : log des notifications email envoyées (anti-doublon).
- **`notifications_in_app`** : notifications cloche — sans consommateur frontend actif depuis que `NotificationBell` est mort.
- **`paiements_loyer`** : log des paiements Stripe (initiaux, mensuels, impayés).
- **`renouvellements`** : demandes de renouvellement de bail.
- **`rhythm_imports`** : imports de plannings d'alternance parsés par `parse-school-calendar`. Source brute du Bloc B.
- **`signatures_audit`** : log d'audit immuable des signatures électroniques (eIDAS).

**Tables fantômes référencées dans le code** : `matchs` (référencée dans `export-data` non déployée — n'existe pas en prod). À nettoyer.

---

## 7. Buckets Supabase Storage

5 buckets identifiés via le code applicatif (les buckets ne sont pas dans `remote_schema.sql`).

| Nom | Public/Privé | Usage |
|---|---|---|
| `profils` | public | Photos de profil utilisateur |
| `annonces-photos` | public | Photos d'annonces logement |
| `documents` | mixte (à durcir) | Documents dossier locataire (scolarité, assurance, RIB, garant ID, cautionnement). **Audit Zone 1 Cat. B signale lecture publique non conforme RGPD strict** |
| `etats-des-lieux` | mixte | Photos d'état des lieux |
| `rhythm-documents` | privé | PDFs/images de plannings d'alternance, file size 20 MB, MIME PDF + images |

Configuration `public/private` exacte et présence de policies Storage RLS à vérifier sur le dashboard Supabase.

---

## 8. Skills et tooling Claude

**`.claude/` à la racine** : `settings.local.json` — allowlist Bash de Claude Code. Pas de skill `.md` à ce niveau.

**`sterny-react/.claude/skills/design/`** : skill design Sterny.

- `SKILL.md` — vue d'ensemble du design system, 12 directions visuelles, règles typo/couleur/spacing, Google Fonts recommandés.
- `design-rules.md` — règles UI actionnables.
- `component-patterns.md` — patterns de composants.
- `generators.md` — générateurs CSS.

**`sterny-react/.claude/commands/global.md`** : slash-command `/global` qui applique un redesign anti-AI-slop sur une page React (chaîne `/i-audit` → `/i-bolder` → `/i-typeset` → `/i-colorize` → `/i-animate` → `/i-polish` → `/i-critique`).

CLAUDE.md §10 demande de consulter ces fichiers avant tout changement design important.

---

## 9. Design system appliqué et patterns visuels

Cette section décrit la grammaire visuelle effectivement appliquée sur Sterny au 25 avril 2026. Elle est destinée à servir de référence à toute nouvelle intégration de composant ou de page : on s'aligne sur ce qui suit, sauf justification explicite.

Source : audit `docs/_audit/AUDIT-DESIGN-2026-04-25.md` (rapport complet, conservé localement, non commité).

La doctrine d'origine est la skill `sterny-react/.claude/skills/design/` (4 fichiers, posture "anti-AI-slop"). En pratique, Sterny en applique l'esprit sans en respecter toutes les règles à la lettre — la grammaire effective est plus pragmatique que la doctrine. La référence opérationnelle la plus précise est `sterny-react/.claude/commands/global.md`, mais elle a déjà divergé sur certains points de la pratique réelle. **En cas de doute, c'est la grammaire effective ci-dessous qui prévaut, pas la skill ni le slash-command.**

### 9.1 Tokens

**Couleurs**

- Navy primaire : `#1E293B`
- Orange accent : `#E8622A` (hover : `#D4571F` à standardiser, voir DETTE)
- Page background : `#F4F5F7`
- Card surface : `#FFFFFF` / `white`
- Border subtle (cards, inputs) : `#E8EAF0`
- Texte secondaire : `#94A3B8`
- Texte désactivé : `#9CA3AF`
- Orange pâle (fonds d'icône, badges) : `#FFF1E8` (3 autres variantes coexistent, à harmoniser, voir DETTE)
- Sémantiques : success `#059669` + fond `#ECFDF5` ; danger `#dc2626` + fond `#FEF2F2` ; warning `#F59E0B` + fond `#FFFBEB` ; info `#3B82F6` + fond `#EFF6FF`

Le composant `RhythmCalendar` introduit le pattern `rgba(30, 41, 59, 0.6)` pour son texte secondaire, fidèle à la doctrine "opacity variations of primary" de la skill. Pattern à généraliser à terme, pas en urgence.

**Typographie**

- Famille : `'DM Sans', system-ui, -apple-system, sans-serif` (3 chaînes de fallback coexistent, à harmoniser, voir DETTE)
- Weights actifs : 500 (regular emphasis), 600 (medium-bold), 700 (bold), 800 (display headings). Le 400 est rare et toléré.
- Échelle observée : 11 / 12 / 13 / 14 / 15 / 16 / 18 / 20 / 24 / 28 / 32 / 52. La taille la plus fréquente est 14px (corps).
- Letter-spacing : positif sur les uppercase (0.5 à 2px selon la taille), négatif sur les display (`-1px` sur H1 dashboard, `-1.5px` sur H1 hero).
- Line-height : 1.6 sur le body, 1.1-1.3 sur les titres.

**Espacements**

Échelle utilisée (non strictement 8px, mais cohérente en pratique) : 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 40 / 48.

- Padding standard d'une card de section dashboard : `24px`
- Margin entre cards d'une page dashboard : `16px`
- Gap interne d'une card : `12px` à `16px` selon densité

**Radius**

- Cards de section (dashboard) : `16px`
- Sub-elements internes aux cards (icons, mini-cards, dropdowns) : `12px`
- Boutons et CTAs : `10px`
- Micro-éléments en grille (cellules calendrier, badges secondaires) : `6px` ou `8px`
- Badges pills (statuts) : `20px`
- Avatars : `50%`

**Shadows**

Trois signatures coexistent, chacune avec un rôle sémantique :

- **Navy diaphane** `0 4px 20px rgba(30, 41, 59, 0.06)` — sections dashboard standard (`.dp-card`).
- **Orange diaphane** `0 6px 28px rgba(232, 98, 42, 0.10)` — widgets chaleureux (`AgendaCard`), cards d'auth.
- **Subtle** `0 2px 12px rgba(0, 0, 0, 0.06)` — micro-éléments et nav (utilisée par `RhythmCalendar` actuellement, à arbitrer en intégration).

Pattern hover : la shadow s'amplifie et vire à l'Orange. Ex. `.dp-card:hover` passe de Navy 0.06 à `0 8px 32px rgba(232, 98, 42, 0.12)`.

**Transitions**

- Standard : `all 0.2s` (ease implicite)
- Items de liste rapides : `all 0.15s`
- Dropdowns : `0.12s`

**Container et breakpoints**

- Container dashboard : `max-width: 900px` (centré, padding `32px 24px`)
- Container public : `max-width: 1200px`
- Cards d'auth : `max-width: 460px`
- Breakpoint mobile canonique : `@media (max-width: 768px)`

### 9.2 Anatomie d'une page dashboard

Squelette type :

```
.dashboard-(...)container         max-width 900px, padding 32px 24px
  .page-header                    margin-bottom 28px
    h1                            32px / 800 / -1px / Navy
                                  prénom souligné Orange (#F0783E, offset 4px, thickness 2px)
    p                             14px / 400 / #94A3B8 (sous-titre)
  .dp-card                        ← une par section
    .dp-card-title                15px / 300 / Orange / uppercase / letter-spacing 2px
                                  flex avec icône 32px à gauche dans pill .dp-card-icon (fond #FFF1E8)
    [contenu de la section]
  .dp-card
    ...
```

**Règles** :

- Pas de séparateurs visuels entre sections — uniquement whitespace vertical (`margin-bottom: 16px`).
- Animation stagger d'entrée : chaque section apparaît avec `opacity 0→1` + `translateY(12px→0)` sur 0.4s, avec un délai croissant (`0.08s × index`).
- Hover sur card : `transform: translateY(-2px)` + box-shadow amplifiée (Navy → Orange).
- Le titre de section "kicker Orange uppercase" est la signature Sterny actuelle. Une convention plus sobre (navy 16/700) subsiste sur des éléments legacy.

### 9.3 Composants partagés — signatures visuelles

- **`AgendaCard`** : autoporté, signature **Orange chaleureuse** (radius 16px, shadow Orange 0.10, padding `24px 28px`). Compact, posé directement comme sibling des `.dp-card`. Convient quand le composant est un widget dense et juxtaposable.
- **`ProfileMiniBar`** : autoporté, signature **plate** (radius 16px, sans shadow, juste border #E8EAF0). Format barre horizontale discrète.
- **`Navbar` et `UserDropdown`** : pas de fichiers CSS dédiés — leurs styles vivent dans `sterny-react/src/index.css` (1155 lignes globales). La nav est traitée comme du chrome global, pas comme un composant scopé.
- **`RhythmCalendar`** : actuellement autoporté avec une signature à part (radius 20px, shadow subtle). À aligner lors de l'intégration dans `/dashboard` (voir 9.4).

### 9.4 Contenant card vs nu — règle de décision

La grammaire Sterny distingue deux types de blocs :

- **Widgets compacts juxtaposables** (label + 2-4 items, format barre ou carré) : peuvent être autoportés avec leur propre signature visuelle (`AgendaCard`, `ProfileMiniBar`).
- **Sections complètes** (titre + contenu structuré sur plusieurs lignes/colonnes) : doivent être posées dans une `.dp-card` parent qui fournit le contenant et le `.dp-card-title`.

Le composant ne fournit pas son propre fond/radius/shadow/titre quand il est une section. Le parent les fournit. Cette règle évite la prolifération de signatures visuelles concurrentes sur une même page.

**Application à `RhythmCalendar`** : c'est une section complète. Lors de son intégration dans `/dashboard`, `RhythmCalendar.css` doit perdre `background`, `border-radius`, `box-shadow`, `padding` sur `.rc-card`, et le `.rc-header` doit être retiré (le titre vient du `.dp-card-title` parent). Pour la page de preview standalone `/dev/rhythm-calendar-preview`, on wrap le composant dans une `.dp-card` factice côté preview, plutôt que de complexifier le composant avec une prop `autonomous`.

### 9.5 Convention de scoping CSS

Chaque page et chaque composant utilise un **préfixe court de 2-4 lettres** suivi d'un tiret pour scoper toutes ses classes. C'est un BEM allégé : `préfixe-bloc-élément` séparé par tirets, sans `__` ni `--`. Pas d'utilitaires Tailwind, pas de CSS modules, pas de namespace technique.

Préfixes en usage :

| Préfixe | Composant ou page |
|---|---|
| `rc-` | RhythmCalendar |
| `rcp-` | RhythmCalendarPreview |
| `dp-` | DashboardProprietairePage |
| `lgt-` | LogementPage |
| `rch-` | RecherchePage |
| `ccm-`, `ccmp-`, `ccmr-`, `ccma-` | CommentCaMarche pages |
| `cx-` | ConnexionPage |
| `ir-` | InscriptionRecherchePage |
| `ip-` | InscriptionProprietairePage |
| `cp-` | CompleterProfilPage |
| `agenda-` | AgendaCard |
| `mini-bar-` | ProfileMiniBar |
| `ud-` | UserDropdown (vit dans index.css) |
| `nav-` | Navbar (vit dans index.css) |
| `admin-` | DashboardAdminPage |

**Règle pour tout nouveau composant** : choisir un préfixe de 2-4 lettres unique, en cohérence avec le nom du composant. Documenter ici quand un nouveau préfixe est introduit.

### 9.6 Patterns d'avenir et exceptions à connaître

- **CSS variables locales** : `RhythmCalendar` est le premier composant à exposer des variables CSS locales (`--rc-cell-size`, `--rc-gap`, etc.). Pattern positif (souplesse d'itération) à généraliser quand pertinent.
- **Animations d'entrée** : tout composant posé dans `.dp-card` hérite du stagger parent. S'il est posé nu sur une page sans `.dp-card`, lui ajouter une animation d'entrée pour homogénéité (`opacity 0→1` + `translateY(12px→0)` sur 0.4s).
- **Hover Orange systématique** : tout élément interactif (card, lien, bouton, item) signale son affordance en virant vers l'Orange (color, border, ou shadow). Respecter ce pattern pour tout nouveau composant interactif.
- **`Space Grotesk`** est importée dans `index.css` mais n'est utilisée nulle part dans les CSS audités. Réserve pour usage display futur ou import à nettoyer (DETTE candidate).

---

## 10. Conventions de structure du code

L'arborescence frontend suit une convention **par type de fichier puis par domaine**, pas par feature.

- **Pages** dans `pages/<domaine>/<NomPage>.jsx` (PascalCase). Une page = une route. CSS sœur dans le même dossier.
- **Composants partagés** dans `components/<domaine>/<NomComposant>.jsx`. Sous-dossier dès qu'il y a 2+ composants thématiques.
- **Hooks custom** dans `hooks/` (camelCase, `useXxx.js` ou `.jsx` si JSX dans le provider).
- **Utils** dans `utils/` — helpers purs (formatters, addressVerification, analytics, matching, rateLimiter).
- **Config** dans `config/` — `supabase.js` expose le client singleton via `globalThis.__supabaseClient`. Tout transite par `import { supabaseClient } from '../../config/supabase'`.
- **Fixtures de dev** dans `dev/` — créé 25 avril.
- **Edge Functions** à la racine du repo dans `supabase/functions/<nom>/index.ts` (kebab-case).
- **Migrations Supabase** dans `supabase/migrations/<timestamp>_<nom>.sql` (timestamp `YYYYMMDDHHMMSS`).

**Convention de nommage** : PascalCase (composants, pages), camelCase (utils, hooks), kebab-case (Edge Functions, buckets). Les CSS suivent le nom du fichier source.

**Modèle de données** : pas de couche de service intermédiaire (pas de `services/` ou `api/`). Les requêtes Supabase sont écrites directement dans les composants via le SDK JS.

---

## 11. Anomalies signalées par les audits du 25 avril

Découvertes pendant la génération des deux audits, loguées dans `DETTE-TECHNIQUE.md` aux numéros suivants :

- DETTE #21 : composants morts (Stepper, FooterMinimal, HamburgerMenu, NotificationBell)
- DETTE #22 : doublon de route `/annonce/creer` dans `App.jsx`
- DETTE #23 : `PresentationProprietairePage` placeholder n'utilisant pas le param `:id`
- DETTE #24 : `EmailMatchConfirmationPage` exposée comme route produit au lieu de `/dev/`
- DETTE #25 : `/dev/rhythm-calendar-preview` sans garde auth
- DETTE #26 : chemin obsolète vers `/Users/arnaudfourel/...` dans `commands/global.md`
- DETTE #27 : faux positif "table fantôme `documents`" dans l'audit Zone 1 Cat. C
- DETTE #28 : table fantôme `matchs` dans `export-data`
- DETTE #29 : token Mapbox en dur dans `RecherchePage.jsx`
- DETTE #30 : constantes dupliquées dans 5+ pages
- DETTE #31 : variantes hover Orange (`#D4571F` vs `#D4561F`) à harmoniser
- DETTE #32 : 4 variantes d'Orange pâle (`#FFF1E8`, `#FFF3EE`, `#FDF0EB`, `#FFF7ED`) à harmoniser sur `#FFF1E8`
- DETTE #33 : 3 chaînes de fallback `font-family` DM Sans à harmoniser

---

*Document factuel et stable. Mise à jour uniquement sur changement structurel. Tout détail volatile (tailles de fichier, couplages internes, bugs ponctuels) appartient à `DETTE-TECHNIQUE.md` ou au code lui-même.*
