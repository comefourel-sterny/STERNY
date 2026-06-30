# Audit fonctionnel Sterny — 30 avril → 3 mai 2026

**Statut** : Phase 1 (audit code statique) rédigée par Claude Code le 30 avril 2026 après-midi. Phase 2 (audit fonctionnel manuel) à remplir par Côme du 1er au 3 mai 2026.

> ⚠️ **PARTIELLEMENT PÉRIMÉ — revu le 2026-06-30 (conv 103).** Cet audit date du 30/04→03/05 (HEAD 03eec77, ~2 mois). Le tunnel inscription→remise des clés a été ré-audité en conv 103 (lecture seule) : voir `docs/ETAT-COURANT.md` bloc « 2026-06-30 (conv 103) ». Faits marquants depuis : #14 et #90 RÉSOLUES (trigger candidature corrigé + accept/refus côté hôte câblé) ; #22/#28/#29 toujours ouvertes (re-vérifiées) ; restitution-caution orpheline ; modèle 2 locataires (#93) non exploité à la signature. DÉCISION : gel volontaire de tout l'aval du tunnel + cap design. Se référer à ETAT-COURANT pour l'état courant ; ce document reste utile comme photo Phase 1.

**Périmètre** : 47 pages React (`sterny-react/src/pages/`), 18 Edge Functions Supabase (`supabase/functions/`), 4 fixtures de dev (`sterny-react/src/dev/`). HEAD au moment de l'audit : `03eec77` (post-clôture spike #3 + DETTE #42 + cadrage spike #4).

---

## 1. Méthodologie

### Phase 1 — audit code statique par Claude Code (ce document, partie remplie le 30 avril)

Lecture seule de la base de code. 4 sous-agents Explore mobilisés en parallèle pour couvrir l'ensemble :
- Agent A : `pages/auth` + `pages/public` + `pages/legal` + `pages/invitation` + `NotFoundPage`
- Agent B : `pages/dashboard` + `pages/profil` + `pages/parametres` + `pages/communication`
- Agent C : `pages/annonce` + `pages/transaction` (les pages critiques Stripe + signature)
- Agent D : 18 Edge Functions Supabase

Pour chaque page : état du design (tokens Sterny appliqués), Edge Functions invoquées, TODO/FIXME/bypass DEV, données mockées vs réelles, bugs visibles à la lecture statique. Pour chaque Edge Function : rôle, appelants frontend, variables d'environnement requises, état apparent.

Convention de priorisation P0/P1/P2 :
- **P0** = bloquant pour une démo de bout en bout (un parcours utilisateur s'arrête net)
- **P1** = important pour un MVP testable par 5 utilisateurs réels (parcours fonctionne mais expérience dégradée)
- **P2** = polish, nice to have (cosmétique, message d'erreur peu clair, page placeholder secondaire)

### Phase 2 — audit fonctionnel manuel par Côme (à remplir vendredi-dimanche)

Section 7 préparée avec un squelette par parcours utilisateur et flux runtime. Côme remplit en navigateur, en regardant ce qui se passe vraiment lorsqu'un utilisateur clique.

---

## 2. Audit code par page

### 2.1 `pages/auth` (8 pages)

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| ChoixInscriptionPage | finalisé | — | — | — | — | — |
| CompleterProfilPage | finalisé | — | — | listes hardcodées (écoles, villes, rythmes — DETTE #30) | — | P2 |
| ConnexionPage | finalisé | — | — | — | redirections dynamiques OK | — |
| InscriptionPartagerPage | finalisé | — | — | listes hardcodées | — | — |
| InscriptionProprietairePage | finalisé | — | — | sessionStorage referral OK | — | — |
| InscriptionRecherchePage | finalisé | — | — | listes hardcodées (DETTE #30) | — | P2 |
| MotDePasseOubliePage | finalisé | — | — | — | — | — |
| ResetPasswordPage | finalisé | — | — | — | setTimeout 3s avant redirect | — |

**Synthèse auth** : 8 pages stylisées (DM Sans, navy `#1E293B`, orange `#E8622A`, fond `#F4F5F7`, animations stagger). Aucune Edge Function appelée. RAS bloquant pour démo.

### 2.2 `pages/public` (12 pages)

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| HomePage | partiel | — | — | `CITY_LISTINGS` hardcodé (images Unsplash) | — | P1 |
| RecherchePage | partiel | `send-alert-email` (l. 1201) | — | listes hardcodées | **token Mapbox `pk.eyJ...` en dur l. 10 (DETTE #29)** | P0 |
| LogementPage | finalisé | `create-stripe-identity-session` (l. 697) | — | mapboxgl init via `import.meta.env.VITE_MAPBOX_TOKEN` ✓ | — | — |
| AvisPage | partiel | — | — | useState catégories | — | P2 |
| AProposPage | finalisé | — | — | — | — | — |
| ContactPage | finalisé | — | — | `messages_contact` BDD ✓ | — | — |
| FaqPage | finalisé | — | — | accordion local OK | — | — |
| AgencesPartenairesPage | finalisé | — | — | — | — | — |
| CommentCaMarchePage | finalisé | — | — | — | — | — |
| CommentCaMarcheRecherchePage | finalisé | — | — | — | — | — |
| CommentCaMarcheProprietairePage | finalisé | — | — | — | — | — |
| CommentCaMarcheAlternerPage | finalisé | — | — | — | — | — |

**Synthèse public** : 9 pages OK, 2 partielles (HomePage et AvisPage avec données mockées), 1 `RecherchePage` avec un problème connu (token Mapbox en dur — DETTE #29, restriction de domaine à vérifier dans la console Mapbox).

### 2.3 `pages/dashboard` (3 pages)

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| DashboardLocatairePage | finalisé | `send-alert-email` (l. 421), `send-proprietaire-invitation` (l. 566), `delete-account` (l. 490 fetch direct), `export-data` (l. 509 fetch direct) | — | — | discrimination correcte selon `users.type_user` (locataire/hote/les_deux) | — |
| DashboardProprietairePage | finalisé | `delete-account` (l. 386 fetch direct), `export-data` (l. 404 fetch direct) | — | — | **pas de garde explicite `type_user==='proprietaire'`** dans le composant — dépend du routing | P1 |
| DashboardAdminPage | finalisé | — | — | — | garde `is_admin=true` présente ✓ | — |

### 2.4 `pages/profil` (5 pages)

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| ProfilPage | finalisé | — | — | — | accès conditionné `user_id` param + admin | — |
| ModifierProfilPage | finalisé | `delete-account` (l. 461 fetch direct) | — | listes écoles hardcodées (DETTE #30) | pas d'appel `export-data` détecté → cohérence avec ParametresPage à valider | P2 |
| ModifierProfilProprietairePage | finalisé | — | — | — | — | — |
| DossierLocatairePage | partiel | `verify-document` (l. 238 **fetch direct**, pas via supabase.functions.invoke) | — | — | bucket Storage `documents` (cf. DETTE #27, c'est bien un bucket pas une table) | P1 |
| **PresentationProprietairePage** | **placeholder** | — | — | — | **31 lignes, n'utilise pas `:id` de la route `/proprietaire/:id` (DETTE #23)** | **P0** |

### 2.5 `pages/annonce` (2 pages)

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| **CreerAnnoncePage** | finalisé | `create-stripe-identity-session` (l. 1609, **bypassée par `skipStripeIdentity=true`** — DETTE #4) | 5× `[DEBUG]` + `[DEBUG RENDER]` (DETTE #4) | demo mode si `id=demo`, listes villes hardcodées (`CODE_POSTAL_VILLE`, DETTE #30) | **bypass DEV intentionnels (DETTE #1-4)** : `validateStep` `return true` (l. 1461), modale confirmation bypassée (l. 1572 → `publierAnnonce` direct), `skipStripeIdentity=true` (l. 1596) ; **bugs préexistants** : useEffect en boucle (l. 562-579, DETTE #5), 2600+ lignes JSX latence saisie (DETTE #6), Cropper photo cassé (l. 876-891 setTimeout fragile, DETTE #7), modale CSS `display:none` (DETTE #8) | **P0** (rappel : bypass volontaires en attente Phase 0bis, ne pas nettoyer) |
| ModifierAnnoncePage | finalisé | `create-stripe-identity-session` (l. 1435) | — | — | clone partiel de CreerAnnoncePage, validation propre (`return true` admin uniquement) | P1 |

### 2.6 `pages/transaction` (8 pages — flux le plus critique)

| Page | État design | Edge Functions appelées | SDK Stripe | Signature électronique | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|---|---|
| MatchActifPage | finalisé | — | — | — | — | demo si `!matchId` (Lucas/Emma hardcodés) | — | P1 |
| MatchConfirmationPage | finalisé | — | — | — | — | demo si `!matchId` | gardes `isLocataire/isProprietaire/isAdmin` OK | P1 |
| **ContratLocationPage** | finalisé | — | — | **signature custom** (stocke nom + IP + UA + hash + consent en BDD `signatures_audit`) | — | demo (setTimeout 1s sans `contratDataRef`) | **pas de PDF de contrat généré, pas de DocuSign/HelloSign/eIDAS Lv2** ; checkbox + nom = preuve faible | **P0 juridique** |
| EtatDesLieuxPage | finalisé | — | — | signature custom (même pattern) | — | — | auto-save 2s OK, validation nom OK | P1 |
| **PaiementInitialPage** | finalisé | `create-stripe-checkout` (l. 283 **fetch POST direct** vers `/functions/v1/`, pas via invoke) | Stripe Checkout (SEPA initial / carte impayé) | — | — | demo si `contrat_id==='demo'` (setTimeout 1.5s) | success_url + cancel_url câblées | P0 |
| PaiementSuccessPage | finalisé | — | — | — | — | demo si `?demo=true` | lookup `stripe_session_id` dans `paiements_loyer` OU `contrats`, fallback gracieux | P1 |
| RenouvellementPage | finalisé | — | — | — | — | — | states machine (form→proprio→attente→accepte/refuse) | P1 |
| **EmailMatchConfirmationPage** | placeholder | — | — | — | — | données dummies inline | **route produit `/email-match-confirmation` exposée alors que c'est une preview email** (DETTE #24, à déplacer dans `/dev/`) | P2 |

### 2.7 `pages/parametres` + `pages/communication` + `pages/invitation` + racine

| Page | État design | Edge Functions appelées | TODO/FIXME | Mocks détectés | Bugs statiques | Priorité |
|---|---|---|---|---|---|---|
| ParametresPage | finalisé | `delete-account` + `export-data` (via hook `useAccountActions`) | — | — | implémente RGPD Art. 17 + Art. 20 ✓ | — |
| MessagesPage | finalisé | — | — | — | wrapper minimal autour de `<ChatComponent mode="page"/>` | — |
| InvitationPage | finalisé | — | — | token URL param OK, requête Supabase OK | gestion erreur + loading OK | — |
| NotFoundPage | finalisé | — | — | — | redirect vers `/recherche` OK | — |

---

## 3. Audit code par flux critique

### 3.1 Flux candidature locataire → match

**Pages impliquées** : `RecherchePage` → `LogementPage` → (modal candidature) → `DashboardLocatairePage` (suivi) → `MatchActifPage` → `MatchConfirmationPage` → `DossierLocatairePage`.

**Edge Functions impliquées** : `send-alert-email` (alerte logement), `verify-document` (OCR pièces dossier), aucune autre.

**État** :
- `RecherchePage` : token Mapbox en dur **P0** (DETTE #29).
- `LogementPage` : OK (utilise env var Mapbox correctement).
- `DashboardLocatairePage` : OK, discrimine bien `type_user`.
- `MatchActifPage` + `MatchConfirmationPage` : OK avec demo mode si pas de `match_id`.
- `DossierLocatairePage` : OK mais `verify-document` invoqué via `fetch` direct au lieu de `supabase.functions.invoke` (incohérence interne — P1).

**Trou critique** : **DETTE #14** — le trigger `trg_notif_candidature` (BDD prod) référence `annonces.proprietaire_id` qui n'existe pas dans le schéma. Conséquence attendue : **chaque INSERT dans `candidatures` plante avec rollback de la transaction**. À tester en priorité absolue en audit fonctionnel manuel — si confirmé, **bloque tout le flux candidature**.

### 3.2 Flux parrainage propriétaire (alternant `hote` invite son propriétaire)

**Pages impliquées** : `DashboardLocatairePage` (génération du lien parrainage) → email envoyé via `send-proprietaire-invitation` → propriétaire reçoit l'email → clique le lien → `/inscription/proprietaire?r=token` ou `/invitation/:token` → `InscriptionProprietairePage` ou `InvitationPage`.

**Edge Functions impliquées** : `send-proprietaire-invitation` (déployée).

**État** : flux complet et cohérent en lecture statique. `InvitationPage` lit le token, requête la BDD pour résoudre l'invitation, redirige vers inscription propriétaire avec contexte. Pas de trou détecté.

### 3.3 Flux signature électronique (locataire + propriétaire)

**Pages impliquées** : `ContratLocationPage`.

**Edge Functions impliquées** : aucune. La signature est gérée côté client puis stockée dans `signatures_audit` (table BDD).

**État** :
- Implémentation custom : checkbox de consentement + saisie nom → stockage `nom + IP + user-agent + hash + consent` dans `signatures_audit`.
- Pas de PDF de contrat généré, pas d'horodatage qualifié, pas de DocuSign / HelloSign / Yousign / Universign.
- **Niveau eIDAS** : signature électronique simple (Lv1), valeur probante limitée (recevable mais contestable en cas de litige).

**Trou critique** : **[P0 juridique]** la conformité du dispositif actuel à l'art. 1367 du Code civil et à eIDAS pour des contrats de bail (résidence principale) doit être validée par un avocat. La consultation est explicitement listée comme prérequis dans `CONTEXTE-PROJET.md` §9 et `VISION-ARCHITECTURE.md` §10.

### 3.4 Flux paiement Stripe

**Pages impliquées** : `MatchConfirmationPage` → `ContratLocationPage` (signature) → `PaiementInitialPage` → redirection Stripe Checkout → `PaiementSuccessPage`.

**Edge Functions impliquées** :
- `create-stripe-checkout` (déployée, OK)
- `stripe-webhook` (déployée, OK — vérifie `STRIPE_WEBHOOK_SECRET`)
- `send-recu-paiement` — **DETTE #17 : non déployée** → reçu post-paiement non envoyé.
- `restitution-caution` — **DETTE #17 : non déployée** → fin de bail bloque sur restitution caution.

**État** :
- `PaiementInitialPage` invoque `create-stripe-checkout` via `fetch` direct (l. 283), redirige vers `https://checkout.stripe.com/...`, `success_url` + `cancel_url` câblées.
- `PaiementSuccessPage` lit `?session_id=` et lookup `stripe_session_id` dans `paiements_loyer` ou `contrats`.
- Demo mode bypass dans `PaiementInitialPage` si `contrat_id==='demo'` (setTimeout 1.5s puis redirect success).

**Trou critique** : **[P0]** `send-recu-paiement` non déployée → utilisateur ne reçoit pas de reçu de paiement post-Stripe. **[P1]** absence d'un check serveur sur le `session_id` rendu par `PaiementSuccessPage` — un attaquant pourrait crafter une URL `/paiement/success?session_id=...&isDemo=true` pour simuler un paiement réussi.

### 3.5 Flux état des lieux

**Pages impliquées** : `EtatDesLieuxPage` (entrée + sortie).

**Edge Functions impliquées** : aucune (signature custom stockée en BDD `etats_des_lieux` + `signatures_audit`).

**État** :
- Auto-save toutes les 2s.
- Signature dual locataire + propriétaire avec validation nom → statut `'valide'` quand les 2 ont signé.
- Pas de génération de PDF d'EDL ni de stockage Storage du document signé final.

**Trou critique** : **[P1]** restitution de caution (`restitution-caution` Edge Function) **non déployée**. Le flux EDL de sortie ne peut pas déclencher le refund Stripe.

### 3.6 Flux RGPD (Art. 17 + Art. 20)

**Pages impliquées** : `ParametresPage` (canonique via hook `useAccountActions`), `DashboardLocatairePage`, `DashboardProprietairePage`, `ModifierProfilPage` (**fetch direct, doublons à harmoniser**).

**Edge Functions impliquées** :
- `delete-account` (déployée mais **incomplète** selon DETTE / audit Zone 1 Cat. B)
- `export-data` (**DETTE #17 : non déployée + DETTE #28 : référence table fantôme `matchs`**)

**Trou critique** : **[P0]** `export-data` non déployée et avec une requête vers `matchs` (table inexistante) → l'export RGPD plantera à l'exécution même après déploiement. À corriger avant toute revendication de conformité RGPD.

---

## 4. Audit code par Edge Function

| Edge Function | Rôle | Page(s) appelante(s) | Env vars requises | État apparent |
|---|---|---|---|---|
| check-baux-expirants | CRON quotidien 8h UTC, baux expirants | CRON | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | déployée, complète |
| check-loyers-impays | CRON quotidien 9h UTC, loyers impayés | CRON | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | déployée, complète |
| create-stripe-checkout | Stripe Checkout SEPA / carte | `PaiementInitialPage:283` (fetch direct) | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | déployée, complète |
| create-stripe-identity-session | Stripe Identity (vérif pièce ID) | `CreerAnnoncePage:1609` (**bypassée DETTE #4**), `ModifierAnnoncePage:1435`, `LogementPage:697` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` | déployée, complète |
| create-stripe-portal | Stripe Customer Portal (gérer RIB SEPA) | **orpheline frontend** | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | déployée, **non câblée frontend** |
| delete-account | Supprime compte + données (RGPD Art. 17) | `useAccountActions:55`, `ModifierProfilPage:461`, `DashboardLocatairePage:490`, `DashboardProprietairePage:386` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | déployée mais **incomplète** (DETTE audit Zone 1 Cat. B) |
| expire-candidatures | CRON, candidatures > 14j sans réponse | CRON | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **non déployée** (DETTE #17) |
| export-data | RGPD Art. 20 — export données | `useAccountActions:73`, `DashboardLocatairePage:509`, `DashboardProprietairePage:404` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | **non déployée + référence table fantôme `matchs` (DETTE #28)** |
| parse-school-calendar | Parse PDF/image planning via Claude vision | `RhythmFileUpload:104` | `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | déployée v5 (validée 25 avril) |
| restitution-caution | Refund Stripe dépôt de garantie | **orpheline frontend** | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | **non déployée** (DETTE #17) |
| send-alert-email | Email confirmation alerte logement | `PasswordGate:57`, `DashboardLocatairePage:421`, `RecherchePage:1201` | `RESEND_API_KEY` | déployée, complète |
| send-fin-bail-email | Email rappel fin de bail | invoquée par `check-baux-expirants` | `RESEND_API_KEY` | déployée, complète |
| send-landing-email | Email bienvenue landing | **orpheline frontend** (DETTE #17 mentionnait `PasswordGate.jsx:57` mais c'est `send-alert-email` qui y est appelée — DETTE #17 partiellement obsolète) | `RESEND_API_KEY` | **non déployée** mais sans appelant frontend → P2 plutôt que P1 |
| send-proprietaire-invitation | Email invitation propriétaire (parrainage) | `DashboardLocatairePage:566` | `RESEND_API_KEY` | déployée, complète |
| send-recu-paiement | Reçu paiement post-Stripe | invoquée par `stripe-webhook` (en théorie) | `RESEND_API_KEY` | **non déployée** (DETTE #17) |
| send-relance-impaye-email | Email relance impayé | invoquée par `check-loyers-impays` | `RESEND_API_KEY` | déployée, complète |
| stripe-webhook | Reçoit événements Stripe, met à jour BDD | webhook HTTP POST (Stripe → Supabase) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | déployée, complète |
| verify-document | OCR Google Vision pour dossier locataire | `DossierLocatairePage:238` (**fetch direct**) | `GOOGLE_CLOUD_API_KEY` | déployée mais **pas de check `if (!GOOGLE_CLOUD_API_KEY)` → silent fail possible** |

**Edge Functions orphelines (sans appelant frontend identifié)** : `create-stripe-portal`, `restitution-caution` (non déployée), `send-landing-email` (non déployée).

**Variables d'environnement à vérifier dans Supabase Dashboard → Functions → Settings** :
- **Stripe** : `STRIPE_SECRET_KEY` (test/live ?), `STRIPE_WEBHOOK_SECRET`
- **Resend** : `RESEND_API_KEY`
- **Anthropic** : `ANTHROPIC_API_KEY`
- **Google** : `GOOGLE_CLOUD_API_KEY` (alias possible : `GOOGLE_VISION_KEY`)
- **Supabase** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (généralement auto-configurés)

---

## 5. Trous identifiés en lecture statique (par priorité)

### P0 — bloquants pour démo bout en bout

1. **DETTE #14 — Trigger `trg_notif_candidature` référence `annonces.proprietaire_id` qui n'existe pas en prod**. Conséquence attendue : chaque INSERT dans `candidatures` plante avec rollback. **À tester en tout premier en audit fonctionnel manuel**. Si confirmé : tout le flux candidature locataire est bloqué.

2. **DETTE #22 — Doublon de route `/annonce/creer` dans `App.jsx`** (lignes 96-99 sous `<Layout/>` ET 145-147 sous `<DashboardLayout/>`). Le premier match gagne, donc la garde auth `<DashboardLayout/>` est shuntée. Confirmé par agent C lecture statique aux lignes 106 + 154 (numérotation actuelle).

3. **DETTE #28 — `export-data` référence table fantôme `matchs`** ligne 94. La fonction n'est pas déployée (DETTE #17), mais même après déploiement, l'export plante sur ce SELECT. RGPD Art. 20 cassé.

4. **`send-recu-paiement` non déployée** (DETTE #17) → utilisateur ne reçoit pas de reçu après paiement Stripe. À déployer avant toute démo qui inclut un parcours paiement.

5. **`PresentationProprietairePage` placeholder de 31 lignes** (DETTE #23) qui n'utilise pas `:id` de la route `/proprietaire/:id`. Si un parcours démo passe par cette URL, il atterrit sur une page sans contenu.

6. **Token Mapbox public en dur dans `RecherchePage.jsx:10`** (DETTE #29). Pratique tolérable **uniquement** si des restrictions de domaine sont activées sur le dashboard Mapbox (sterny.co + localhost). À vérifier dans la console Mapbox immédiatement.

7. **Signature électronique custom dans `ContratLocationPage`** : checkbox + nom + stockage `signatures_audit`. Niveau eIDAS Lv1, valeur probante limitée. **À faire valider par un avocat avant tout contrat réel signé** (consultation listée comme prérequis dans `VISION-ARCHITECTURE.md` §10).

### P1 — important pour MVP testable

8. **DETTE #17 — 4 autres Edge Functions non déployées** : `expire-candidatures`, `export-data`, `restitution-caution`, `send-landing-email`. Impact :
   - `expire-candidatures` : candidatures s'accumulent indéfiniment au statut `en_attente` (pas critique mais polluant).
   - `restitution-caution` : flux fin de bail bloqué sur le refund Stripe.
   - `send-landing-email` : sans appelant frontend identifié dans le code actuel, dégradé en P2.

9. **`verify-document` sans garde sur `GOOGLE_CLOUD_API_KEY`** (silent fail si la var d'env est absente sur Supabase). À ajouter `if (!GOOGLE_CLOUD_API_KEY) throw` en début de handler.

10. **`DashboardProprietairePage` sans garde explicite `type_user==='proprietaire'`** dans le composant. Dépend du routing — sécurité à confirmer.

11. **Incohérence d'invocation** : 4 pages utilisent `fetch` direct vers `/functions/v1/<nom>` (PaiementInitialPage, DashboardLocatairePage, DashboardProprietairePage, ModifierProfilPage, DossierLocatairePage), une seule (ParametresPage via `useAccountActions`) utilise `supabase.functions.invoke`. À harmoniser pour la gestion d'erreur centralisée.

12. **`HomePage` `CITY_LISTINGS` hardcodé** avec images Unsplash. Pas critique pour démo si l'objectif est de présenter le concept, mais signaler que ce n'est pas alimenté par la BDD.

13. **`ContratLocationPage` et `EtatDesLieuxPage` chargent en useEffect sans guard `if (!user) navigate('/connexion')` à la racine du composant**. Risque race condition entre fetch et auth check.

14. **Bypass DEV actifs dans `CreerAnnoncePage`** : `validateStep` `return true` (l. 1461), modale confirmation bypassée (l. 1572), `skipStripeIdentity=true` (l. 1596), 5× logs `[DEBUG]`. **Volontaires (DETTE #1-4), à NE PAS retirer en Phase 1, à retirer en Phase 0bis**. Mention ici uniquement pour traçabilité — pas une action à mener ce week-end.

15. **Bugs préexistants dans `CreerAnnoncePage`** : useEffect en boucle (DETTE #5), 2600+ lignes JSX → latence de saisie (DETTE #6), Cropper photo cassé via setTimeout fragile (DETTE #7), modale CSS `display:none` (DETTE #8). Tous datés et tracés. Pas un parcours bloquant tant que les bypass DEV restent actifs.

### P2 — polish, nice to have

16. **`EmailMatchConfirmationPage` exposée en route produit** (DETTE #24) — à déplacer dans `/dev/`.

17. **Routes `/dev/*` sans garde auth** (DETTE #25) — à supprimer du build prod ou ajouter `if (!import.meta.env.DEV) return <Navigate to="/" />`.

18. **Constantes dupliquées massivement dans 5+ pages** (DETTE #30) : `SYMMETRIC_OPTIONS`, `ASYMMETRIC_OPTIONS`, `SIGLES_ECOLES`, `ECOLES_POPULAIRES`, etc. À factoriser dans `utils/constants/`.

19. **Composants morts** (DETTE #21) : `Stepper`, `FooterMinimal`, `HamburgerMenu`, `NotificationBell`. À supprimer en Phase 0bis. Conséquence importante : la table `notifications_in_app` n'a plus de consommateur frontend.

20. **Divergences design tokens** (DETTE #31-33) : 2 variantes orange hover (`#D4571F` vs `#D4561F`), 4 variantes orange pâle, 3 chaînes de fallback DM Sans. À harmoniser en un seul commit Phase 0bis.

---

## 6. Pages dont l'état doit être confirmé en audit fonctionnel manuel

Les éléments suivants ne peuvent pas être conclus en lecture statique seule. Côme les vérifie en navigateur ce week-end.

### 6.1 Trigger BDD `trg_notif_candidature` (DETTE #14)

**Question à vérifier** : un `INSERT` dans `candidatures` réussit-il en prod ou plante-t-il avec `column a.proprietaire_id does not exist` ?

**Méthode** : se connecter en locataire, postuler à une annonce existante, observer si la candidature s'enregistre (rafraîchir, vérifier dans `DashboardLocatairePage` section candidatures), surveiller la console DevTools pour erreurs réseau 500.

### 6.2 Token Mapbox restreint au domaine ?

**Question** : le token `pk.eyJ...` hardcodé dans `RecherchePage.jsx:10` est-il restreint à `sterny.co` + `localhost` dans le dashboard Mapbox ?

**Méthode** : se connecter sur https://account.mapbox.com/access-tokens/, identifier le token, vérifier la liste des URLs autorisées.

### 6.3 Edge Functions non déployées (DETTE #17)

**Question** : `expire-candidatures`, `export-data`, `restitution-caution`, `send-landing-email`, `send-recu-paiement` sont-elles vraiment absentes en prod ?

**Méthode** : `supabase functions list --project-ref rkffpmuhyvwwgfbdqmqr` (depuis racine du repo) et croiser avec la liste locale.

### 6.4 Variables d'environnement Supabase

**Question** : toutes les env vars listées en section 4 sont-elles bien configurées dans Supabase Dashboard → Functions → Settings ?

**Méthode** : `supabase secrets list --project-ref rkffpmuhyvwwgfbdqmqr`.

### 6.5 Flux Stripe en mode test

**Question** : `create-stripe-checkout` en mode test renvoie-t-il bien une session Checkout ? Le webhook `stripe-webhook` reçoit-il l'événement `checkout.session.completed` et met-il à jour `paiements_loyer` ?

**Méthode** : initier un paiement test depuis `PaiementInitialPage` (carte Stripe test 4242 4242 4242 4242), suivre le flux, vérifier les logs côté Stripe Dashboard et les rows BDD.

### 6.6 RhythmCalendar et parser

**Question** : le composant `RhythmCalendar` v1 (DETTE #36) est-il intégrable dans `/dashboard` même en mode visuel non finalisé ?

**Méthode** : ouvrir `/dev/rhythm-calendar-preview`, vérifier le rendu, comparer avec le mock visuel attendu.

### 6.7 CreerAnnoncePage avec bypass DEV actifs

**Question** : avec les bypass actifs (DETTE #1-4), est-il possible de publier une annonce de bout en bout ? La modale de confirmation est-elle vraiment invisible (DETTE #8) ou s'affiche-t-elle dans certains cas ?

**Méthode** : se connecter, lancer la création d'annonce, observer DevTools → Elements pour la modale `.confirmation-modal`, valider que `publierAnnonce()` est appelé directement.

---

## 7. Audit fonctionnel manuel — à remplir par Côme du 1er au 3 mai

### 7.1 Parcours locataire (alternant qui cherche un logement)

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| Inscription via `/inscription/recherche` | | |
| Connexion (`/connexion`) | | |
| Complétion profil (`/completer-profil`) | | |
| Upload du planning d'alternance (composant RhythmFileUpload) | | |
| Visualisation du calendrier extrait (`RhythmCalendar`) | | |
| Recherche d'un logement (`/recherche` avec filtres ville + rythme) | | |
| Ouverture d'une annonce (`/logement?id=...`) | | |
| Candidature à l'annonce (modal candidature ou bouton dédié) | | |
| **Vérifier que l'INSERT candidature ne plante pas (DETTE #14)** | KO | Confirmé en SQL le 2026-04-30 soir (Supabase Dashboard SQL Editor, INSERT + ROLLBACK). Erreur 42703 column a.proprietaire_id does not exist levée depuis trigger_notif_candidature() ligne 7. P0 bloquant. Détails dans DETTE-TECHNIQUE.md #14. |
| Suivi de la candidature dans `/dashboard` | | |
| Match créé : page `/match-confirmation?match_id=...` | | |
| Page dossier locataire `/dossier-locataire` (upload pièces) | | |
| Vérification document via Google Vision (`verify-document`) | | |
| Signature contrat `/contrat-location` | | |
| Paiement initial `/paiement` → Stripe Checkout | | |
| Retour sur `/paiement/success` | | |
| Reçu de paiement reçu par email (`send-recu-paiement` — **non déployée**) | | |
| Modification profil (`/profil/modifier`) | | |
| Suppression compte (`/parametres` → delete-account) | | |
| Export RGPD (`/parametres` → export-data — **non déployée**) | | |

### 7.2 Parcours hôte (alternant qui propose un logement)

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| Inscription en tant que `hote` (ou bascule depuis `locataire` via dashboard) | | |
| Création d'annonce `/annonce/creer` (avec **bypass DEV actifs** : validateStep `true`, modale shuntée, Stripe Identity sauté) | | |
| Cropper photo logement (DETTE #7 : fragile via setTimeout) | | |
| Modale de confirmation (DETTE #8 : `display:none`, visible ou pas ?) | | |
| Annonce publiée → visible dans `/dashboard` | | |
| Recevoir une candidature locataire | | |
| Accepter la candidature → match créé | | |
| Signature contrat côté hôte (`/contrat-location`) | | |
| Réception loyer (cron `check-loyers-impays`) | | |
| Email rappel fin de bail (cron `check-baux-expirants` → `send-fin-bail-email`) | | |
| Renouvellement (`/renouvellement?contrat_id=...`) | | |
| Restitution caution (`restitution-caution` — **non déployée**) | | |
| État des lieux entrée + sortie (`/etat-des-lieux`) | | |

### 7.3 Parcours `les_deux` (alternant qui propose ET cherche)

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| Bascule profil `locataire` → `les_deux` depuis `/dashboard` | | |
| Vérifier que les 2 villes (école + entreprise) sont gérées sans friction | | |
| Créer une annonce dans la ville d'école | | |
| Chercher un logement dans la ville d'entreprise | | |
| Pré-remplissage cohérent dans les 2 contextes | | |
| Bascule descendante `les_deux` → `locataire` ou `hote` (**non implémentée** selon CONTEXTE-PROJET §3) | | |

### 7.4 Parcours propriétaire (parrainé par un alternant `hote`)

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| Réception email d'invitation (`send-proprietaire-invitation` envoyé par alternant) | | |
| Clic sur le lien → `/inscription/proprietaire?r=token` ou `/invitation/:token` | | |
| Inscription propriétaire | | |
| Page d'accueil propriétaire `/dashboard/proprietaire` | | |
| Validation du contrat de sous-location proposé par l'alternant | | |
| Modification profil propriétaire (`/profil/modifier-proprietaire`) | | |

### 7.5 Flux Stripe runtime

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| `create-stripe-checkout` répond-il avec une session Checkout ? | | |
| Redirection vers `https://checkout.stripe.com/...` fonctionnelle | | |
| Carte Stripe test 4242 4242 4242 4242 acceptée | | |
| Webhook `checkout.session.completed` reçu et traité par `stripe-webhook` | | |
| Row `paiements_loyer` créée avec `stripe_session_id` correct | | |
| `PaiementSuccessPage` lookup le `session_id` et affiche le bon statut | | |
| Paiement SEPA initial (différent de Checkout carte) | | |
| Paiement mensuel récurrent (Subscription SEPA) | | |
| Stripe Identity (`create-stripe-identity-session`) — **bypassée par CreerAnnoncePage** | | |
| Stripe Customer Portal (`create-stripe-portal`) — **orpheline frontend** | | |

### 7.6 Flux signature électronique runtime

| Étape | OK / KO / Partiel | Notes |
|---|---|---|
| Affichage du contrat dans `ContratLocationPage` | | |
| Saisie nom + checkbox consentement | | |
| Hash + IP + UA stockés dans `signatures_audit` | | |
| Signature locataire → statut `signe_locataire` | | |
| Signature propriétaire → statut `signe_proprietaire` puis `signe` (les 2) | | |
| **Validation par un avocat de la conformité eIDAS** : à faire avant prod | | |

### 7.7 Flux email transactionnel runtime

| Email | Émetteur | Destinataire | OK / KO / Partiel | Notes |
|---|---|---|---|---|
| `send-alert-email` | PasswordGate, RecherchePage, DashboardLocatairePage | locataire | | |
| `send-proprietaire-invitation` | DashboardLocatairePage (parrainage) | propriétaire | | |
| `send-recu-paiement` | stripe-webhook (théorique) | locataire | | **non déployée** |
| `send-fin-bail-email` | check-baux-expirants (cron) | locataire + propriétaire | | |
| `send-relance-impaye-email` | check-loyers-impays (cron) | locataire + propriétaire + garant | | |
| `send-landing-email` | aucun appelant frontend identifié | inscrits landing | | **non déployée** |

### 7.8 Vérifications transverses

| Élément | OK / KO / Partiel | Notes |
|---|---|---|
| Token Mapbox restreint au domaine (DETTE #29) | | |
| Trigger `trg_notif_candidature` non plantant (DETTE #14) | KO | Plante systématiquement, validé en SQL 2026-04-30 soir. |
| Bucket Storage `documents` lecture publique conforme RGPD (audit Zone 1 Cat. B) | | |
| Variables d'env Supabase Dashboard complètes | | |
| Edge Functions non déployées listées (DETTE #17) | | |
| Bypass DEV CreerAnnoncePage actifs et fonctionnels | | |

---

*Document généré le 30 avril 2026 par Claude Code en lecture statique uniquement. Phase 2 manuelle à compléter par Côme du 1er au 3 mai.*
