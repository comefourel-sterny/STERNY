# Unification du parcours d'inscription Sterny

**Statut** : document de cadrage en cours de rédaction. Sections 1-2 finalisées le 2 mai 2026 nuit (conv Claude.ai 1). Sections 3-7 à produire en nouvelle conv Claude.ai 2 dédiée.

**Décision parente** : Option A actée le 2 mai 2026 soir (VISION §6 sous-section "Parcours d'inscription unifié"), périmètre élargi le 2 mai soir bis après audit lecture-seule (Q8-Q15 actées).

**Audits sources** :
- `docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md` (audit fonctionnel des 5 pages d'inscription + GoogleAuthHandler + modèle BDD users)
- `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md` (audit design visuel des 2 pages wizard existantes)

Les 2 fichiers d'audit sont dans le dossier gitignoré `docs/_audit/`. Référence textuelle uniquement, pas de copie ici.

**Périmètre** : couvre le parcours unifié pour les 3 type_user alternant (`locataire`, `hote`, `les_deux`). Le parcours `proprietaire` (route séparée `/inscription/proprietaire?r=token`) est hors scope de ce document (conserve son flow actuel avec garde durcie token obligatoire — Q8 actée).

---

## Sommaire

1. Modèle BDD final consolidé ✅
2. Séquence des étapes du parcours unifié ✅
3. Design des écrans — à produire (audit design `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md` disponible)
4. Gestion des 3 méthodes auth (email, Google, Apple) — à produire
5. Table des 9 parcours bout-en-bout à tester (3 type_user × 3 méthodes auth) — à produire
6. Sujets RGPD et juridiques à signaler — à produire
7. Plan d'implémentation séquencé — à produire

---

## 1. Modèle BDD final consolidé

### 1.1 Périmètre

Cette section décrit l'état BDD garanti en sortie du parcours unifié `InscriptionAlternantPage`, pour les 3 type_user alternant. Référence : table `users` du schéma `public`, 51 colonnes inventoriées par audit `docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md` § 8.

### 1.2 Colonnes écrites par le parcours unifié

Légende des sources :
- **Auth** = injectée par Supabase Auth (auto)
- **OAuth-pré** = pré-remplie depuis le provider Google ou Apple, modifiable
- **E-N** = saisie utilisateur en étape N
- **Auto** = constante ou dérivée
- **NULL** = laissée NULL en sortie d'inscription, à remplir plus tard via `ModifierProfilPage` ou flux métier dédié

#### 1.2.1 Identification & Auth

| Colonne | Type | Source | Étape | Valeur en sortie |
|---|---|---|---|---|
| `id` | uuid | Auth | E-1 | `auth.users.id` (FK CASCADE) |
| `email` | text | Auth ou OAuth-pré | E-1 | email saisi (méthode email) ou email provider (Google/Apple, peut être un alias `@privaterelay.appleid.com` pour Apple) |
| `created_at` | timestamptz | Auto | — | `now()` |

#### 1.2.2 Identité personnelle (E-1)

| Colonne | Type | NOT NULL | Source | Validation frontend |
|---|---|---|---|---|
| `prenom` | text | ✅ (BDD) | E-1 (pré-rempli OAuth, modifiable) | non vide après trim() |
| `nom` | text | ✅ (BDD) | E-1 (pré-rempli OAuth, modifiable) | non vide après trim() |
| `telephone` | text | ✅ (frontend) | E-1 | regex permissive (10 chiffres FR ou format international), pas de validation SMS à ce stade |

Décision Q-S1.A : `telephone` rendu obligatoire à l'inscription (besoin opérationnel en cas d'incident, standard du marché Airbnb / Le Bon Coin / Stripe). Sujet RGPD léger à mentionner section 6.

#### 1.2.3 Type d'utilisateur (E-2)

| Colonne | Type | NOT NULL | Source | Valeur |
|---|---|---|---|---|
| `type_user` | text | ✅ (CHECK actif) | E-2 | exactement `'locataire'`, `'hote'`, ou `'les_deux'` selon choix radio explicite |

Décision Q10 : sens canonique de `type_user` aligné sur le choix utilisateur explicite. Plus d'incohérence type `'locataire'` + `a_logement=true` quand l'intent est partage (anomalie observée dans `InscriptionRecherchePage` actuel, audit § 9 incohérence #8).

#### 1.2.4 Études (E-3)

| Colonne | Type | NOT NULL | Source |
|---|---|---|---|
| `ecole` | text | ❌ | E-3 |
| `annee_etudes` | text | ❌ | E-3 |
| `filiere` | text | ❌ | E-3 |

Note : listes hardcodées actuelles (DETTE #30) à remplacer par dropdown autocomplete BDD lors de la refonte. À traiter en parallèle ou dans une session ultérieure dédiée.

#### 1.2.5 Villes & statuts (E-4)

| Colonne | Type | NOT NULL | Source | Valeur |
|---|---|---|---|---|
| `ville_ecole` | text | ❌ | E-4 | toujours saisie (Q-S1.B Option A actée) |
| `statut_ville_ecole` | text | ❌ | E-4 | `'recherche'` / `'hote'` / NULL selon `type_user` (cf. table 1.3) |
| `ville_entreprise` | text | ❌ | E-4 | toujours saisie (Q-S1.B Option A actée) |
| `statut_ville_entreprise` | text | ❌ | E-4 | `'recherche'` / `'hote'` / NULL selon `type_user` |

Décision Q-S1.B : les 2 villes (école et entreprise) sont systématiquement saisies par tous les type_user alternant, peu importe leur intent. Pas de message explicatif particulier — modèle BDD uniforme pour faciliter les fonctionnalités futures (suggestion d'usage élargi, pré-remplissage barre de recherche).

#### 1.2.6 Rythme d'alternance (E-5)

| Colonne | Type | NOT NULL | Source | Valeur |
|---|---|---|---|---|
| `rhythm_calendar` | jsonb | ❌ | E-5 | tableau `[{week_start: "YYYY-MM-DD", status: "school"|"company"}]` semaine par semaine, format VISION §3 |
| `rhythm_start_date` | date | ❌ | E-5 | premier lundi du calendrier saisi |
| `rhythm_end_date` | date | ❌ | E-5 | dernier lundi du calendrier saisi |
| `rhythm_source` | text | ❌ | E-5 | `'manual'` (CHECK actif `manual` ou `document_import`) |
| `rhythm_import_id` | uuid | ❌ | E-5 | NULL (saisie manuelle uniquement, Q-S2.A actée) |

Décision Q-S2.A : E-5 = saisie manuelle assistée uniquement via `RhythmManualBuilder`. Pas d'upload planning dans le parcours unifié (parser hors-ligne, abandon production acté 29 avril 2026, VISION §5 et §7 risque 4). L'intégration concrète de `RhythmManualBuilder` se fait dans une session post-unification dédiée.

#### 1.2.7 Profil personnel (E-6)

| Colonne | Type | NOT NULL | Source | Validation |
|---|---|---|---|---|
| `date_naissance` | text | ✅ (frontend) | E-6 | format `YYYY-MM-DD`, âge calculé ≥ 18 ans |
| `sexe` | text | ⚠️ à arbitrer | E-6 | radio 3 valeurs `'homme' / 'femme' / 'autre'`, pas de CHECK BDD |
| `photo_profil_url` | text | ❌ | E-6 (optionnel) | upload + cropper, message « + confiance » |
| `bio` | text | ❌ | E-6 (optionnel) | texte libre, message « + confiance » |

Décision Q13 : photo et bio optionnelles avec message expliquant que les renseigner augmente la confiance des autres alternants. Possibilité de les ajouter plus tard via `ModifierProfilPage`.

⚠️ Champ `sexe` : finalité métier à clarifier section 6 RGPD. Si pas de finalité légitime documentée, le champ est retiré (principe de minimisation RGPD).

#### 1.2.8 Statuts système (submit final E-7)

| Colonne | Type | Valeur en sortie | Source |
|---|---|---|---|
| `profil_complet` | boolean | `true` | RPC atomique submit final E-7 (Q12 actée : 1 passe) |
| `identite_verifiee` | text | `'non_verifiee'` (default BDD) | Auto |
| `is_admin` | boolean | `false` (default BDD) | Auto |
| `preferences_email` | jsonb | objet par défaut (5 clés) | Auto |
| `invitation_token` | text | UUID v4 généré | Auto (permet à cet alternant de parrainer un propriétaire plus tard via lien `/inscription/proprietaire?r=<token>`) |

Décision Q12 : `profil_complet` mis à `true` en 1 seule passe, à la sortie du parcours unifié. Pas de modèle "inscription minimale + complétion ultérieure".

#### 1.2.9 Pas de parrainage entre alternants

Décision Q-S1.D : pas de mécanisme de parrainage entre alternants pour le lancement. `parrain_id` et `code_parrainage` toujours NULL en sortie du parcours unifié alternant. Le parrainage proprio (`users.invitation_token` + `?r=token` sur `/inscription/proprietaire`) reste en place, hors scope de ce document.

### 1.3 Variations de `(statut_ville_*, type_user)`

Source : VISION §3 "Modèle officiel des colonnes ville utilisateur".

| `type_user` | Cas | `ville_ecole` | `statut_ville_ecole` | `ville_entreprise` | `statut_ville_entreprise` |
|---|---|---|---|---|---|
| `locataire` | cherche dans ville d'école | renseignée | `'recherche'` | renseignée | NULL |
| `locataire` | cherche dans ville d'entreprise | renseignée | NULL | renseignée | `'recherche'` |
| `hote` | propose ville d'école | renseignée | `'hote'` | renseignée | NULL |
| `hote` | propose ville d'entreprise | renseignée | NULL | renseignée | `'hote'` |
| `les_deux` | propose école + cherche entreprise | renseignée | `'hote'` | renseignée | `'recherche'` |
| `les_deux` | cherche école + propose entreprise | renseignée | `'recherche'` | renseignée | `'hote'` |
| `les_deux` | cherche les 2 villes (rare) | renseignée | `'recherche'` | renseignée | `'recherche'` |
| `les_deux` | propose les 2 villes (marginal) | renseignée | `'hote'` | renseignée | `'hote'` |

### 1.4 Colonnes non écrites par le parcours unifié

#### 1.4.1 Legacy (gel d'écriture, conservées en BDD)

| Colonne | Raison du gel | Plan |
|---|---|---|
| `users.ville` | doublonne `(ville_ecole, ville_entreprise)` | gel d'écriture, suppression en phase de nettoyage VISION §9 |
| `a_logement` | dérivable de `type_user IN ('hote', 'les_deux')` ou `statut_ville_* = 'hote'` (Q11 actée) | gel d'écriture, audit ciblé des lectures avant suppression |

#### 1.4.2 Dépréciées (modèle abstrait abandonné)

| Colonne | Raison |
|---|---|
| `type_alternance` | abstraction sym/asym remplacée par `rhythm_calendar` réel |
| `rythme_alternance` | pattern textuel `'4-2'` remplacé par `rhythm_calendar` réel |

#### 1.4.3 Colonnes flux métier post-inscription (NULL en sortie)

Renseignées plus tard via dossier locataire / vérification d'identité / processus contractuels :

`doc_piece_id_url`, `doc_scolarite_url`, `doc_scolarite_statut`, `doc_scolarite_motif_rejet`, `doc_rib_url`, `doc_rib_statut`, `doc_rib_motif_rejet`, `doc_assurance_url`, `doc_assurance_statut`, `doc_assurance_motif_rejet`, `doc_garant_id_statut`, `doc_garant_id_motif_rejet`, `doc_cautionnement_statut`, `doc_cautionnement_motif_rejet`, `garant_prenom`, `garant_nom`, `garant_telephone`, `garant_email`.

#### 1.4.4 À investiguer

`ville_recherche_secondaire` (text) : sémantique non documentée. Lue par `DashboardLocatairePage` (cf. audit § 9 incohérence #12). À ne pas écrire dans le parcours unifié tant qu'on n'a pas tranché si elle a un usage actif. Note dans `idees-en-attente.md`.

### 1.5 Mécanisme d'écriture atomique recommandé

Pour garantir cohérence "tout ou rien" et profil_complet=true seulement quand tout est OK :

**RPC PostgreSQL `complete_inscription_alternant(p_payload jsonb)`** appelée au submit final E-7 :

1. Valide que toutes les colonnes structurantes sont présentes (`type_user`, `ville_ecole`, `ville_entreprise`, au moins un `statut_ville_*` non NULL, `rhythm_calendar` non vide, `date_naissance` ≥ 18 ans, `prenom`, `nom`, `telephone`).
2. Met à jour `users` en une seule requête atomique avec tous les champs.
3. Met `profil_complet = true` à la fin de la même transaction.
4. Retourne succès ou code d'erreur explicite (RAISE EXCEPTION mappable côté frontend).

**Sauvegarde progressive** : à chaque clic "Continuer" entre étapes, UPDATE partiel des colonnes saisies à cette étape (sans toucher à `profil_complet`). Permet le pattern de reprise (VISION §6 "Périmètre élargi") : utilisateur abandonne, revient plus tard, reprend où il s'est arrêté.

⚠️ Décision technique précise (RPC unique vs UPDATE incrémentaux + RPC finale légère) à arbitrer en section 7. Cette section pose le contrat de données, pas l'API.

---

## 2. Séquence des étapes du parcours unifié

### 2.1 Vue d'ensemble — 7 étapes

| # | Nom court | Champs | Skippable ? | Bloquant pour passer à E+1 ? |
|---|---|---|---|---|
| E-1 | Identité | prenom, nom, telephone, email + mdp (méthode email) | non | oui |
| E-2 | Type de profil | choix `type_user` (locataire / hote / les_deux) | non | oui |
| E-3 | Études | ecole, annee_etudes, filiere | non | oui |
| E-4 | Villes & statuts | ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise | non | oui |
| E-5 | Calendrier d'alternance | `RhythmManualBuilder` → rhythm_calendar (saisie manuelle uniquement, Q-S2.A) | non | oui |
| E-6 | Profil personnel | date_naissance, sexe, photo (opt.), bio (opt.) | photo + bio oui | oui pour date_naissance + sexe |
| E-7 | Validation finale | récap + RPC `complete_inscription_alternant` + `profil_complet = true` | non | finalisation |

### 2.2 Justification de l'ordre

**E-1 → E-2** : on capture l'identité avant le type de profil pour que la session Supabase Auth soit créée tôt et qu'on puisse sauvegarder l'état au fil de l'eau (pattern de reprise).

**E-2 → E-3 → E-4** : `type_user` choisi en premier conditionne l'UI des étapes suivantes (notamment statuts ville en E-4). Études en E-3 avant villes en E-4 — connaître l'école aide à pré-remplir intelligemment la ville d'école.

**E-4 → E-5** : villes saisies avant calendrier parce que `RhythmManualBuilder` a besoin de connaître quelle ville est `recherche` vs `hote` pour la logique Q8 de sélection inverse (cf. ETAT-COURANT 2 mai après-midi Bloc 9).

**E-5 → E-6** : le calendrier est l'étape la plus structurante, on la place avant le polish profil.

**E-6 → E-7** : récap final permet relecture avant le commit BDD atomique.

### 2.3 Conditions de skip

Aucun skip d'étape entière. Tous les type_user alternant passent par les 7 étapes.

Skips de champs intra-étape :
- E-6 : photo et bio optionnelles, bouton "Continuer" cliquable sans les renseigner. Message neutre type "+ Photo et bio augmentent la confiance des autres alternants. Tu pourras les ajouter plus tard."

Branchements intra-étape :
- E-1 méthode email : 5 champs (prenom, nom, telephone, email, mdp)
- E-1 méthode OAuth : 3 champs (prenom, nom, telephone), prenom/nom pré-remplis depuis provider, email géré par Auth
- E-4 selon type_user : nombre de `statut_ville_*` activés varie (1 pour locataire/hote, 2 pour les_deux)

### 2.4 Phase auth en amont

Avant que l'utilisateur arrive à E-1, il a choisi sa méthode d'authentification sur la page `/inscription` (`ChoixInscriptionPage` refondue) :

- 3 boutons OAuth en haut : "Continuer avec Google" / "Continuer avec Apple" / "Continuer avec mon email"
- 1 lien en bas : "Déjà un compte ? Se connecter"
- Plus aucun choix proprio (Q8 actée — proprio = parcours par invitation uniquement)
- Plus aucun choix `type_user` à ce niveau (déplacé en E-2)

#### Flow méthode email

1. Clic "Continuer avec mon email" → arrivée sur E-1, formulaire prenom + nom + telephone + email + mdp
2. Submit E-1 → `supabase.auth.signUp({email, password})` → session créée → enchaînement E-2

#### Flow méthode Google

1. Clic "Continuer avec Google" → `supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: '/inscription/alternant'}})`
2. Callback Google → retour sur `/inscription/alternant`
3. `GoogleAuthHandler` détecte la session, **ne crée plus de ligne `users`** (Q5 actée), redirige vers E-1 si `users` n'existe pas pour ce `auth.users.id`, ou vers `/dashboard` si `profil_complet=true`
4. E-1 affichée avec prenom + nom pré-remplis depuis `user.user_metadata` (Google), telephone à saisir, pas d'email/mdp
5. Submit E-1 → INSERT `users` avec les 3 champs + `id` de la session Auth

#### Flow méthode Apple (à concevoir, DETTE #51)

1. Clic "Continuer avec Apple" → `supabase.auth.signInWithOAuth({provider: 'apple', options: {redirectTo: '/inscription/alternant'}})`
2. Callback Apple → retour sur `/inscription/alternant`
3. `AppleAuthHandler` (à créer) détecte la session, **ne crée pas de ligne `users`**, redirige vers E-1
4. ⚠️ Particularité Apple : `name` n'est fourni qu'à la 1ère connexion. Le handler doit lire `user.user_metadata` au callback initial et le passer à E-1 via state React. Si `name` absent, E-1 demande prenom + nom à saisir manuellement.
5. E-1 avec prenom/nom pré-remplis si présents, telephone à saisir, pas d'email/mdp
6. Submit E-1 → INSERT `users` avec les 3 champs + `id` de la session Auth + flag `email_is_apple_relay` si email matche `*@privaterelay.appleid.com` (à signaler section 6 RGPD)

### 2.5 Persistance progressive et reprise

À chaque clic "Continuer", UPDATE partiel `users` avec les champs saisis à l'étape courante. `profil_complet` reste à `false` jusqu'au submit final E-7.

Si l'utilisateur quitte au milieu (ferme l'onglet, déconnecte, attend une semaine) :
- Prochaine connexion : `GoogleAuthHandler` / `AppleAuthHandler` / logique connexion email lit `profil_complet`. Si `false`, redirection vers `/inscription/alternant`
- Le parcours charge `users` pour ce `id`, détecte les champs déjà saisis, amène à la première étape avec un champ obligatoire encore vide

Logique de reprise simple :
- `prenom` + `nom` + `telephone` saisis → skip E-1, démarrage à E-2
- `type_user` saisi → skip E-2, démarrage à E-3
- Etc.

Comportement "modifier" si l'utilisateur veut revenir en arrière (← Précédent) : autorisé, le state React conserve les valeurs déjà sauvées en BDD, l'utilisateur peut éditer, "Continuer" ré-update.

### 2.6 Routing et URLs

Pas d'URL distincte par étape. Le parcours unifié vit sur une seule URL `/inscription/alternant`, l'étape courante est gérée en state React (pattern wizard, comme `InscriptionRecherchePage` actuel `currentStep`).

Routes liées :
- `/inscription` → `ChoixInscriptionPage` refondue (3 boutons OAuth + 1 lien connexion)
- `/inscription/recherche` → redirection 301 vers `/inscription/alternant` pendant 30 jours (Q3 actée)
- `/inscription/partager` → supprimée (Q9 actée)
- `/inscription/proprietaire?r=token` → inchangé, garde durcie token obligatoire (Q8 actée)
- `/inscription/proprietaire` sans token → redirection 301 vers `/inscription`
- `/inscription/alternant` → nouvelle route, parcours unifié 7 étapes
- `/completer-profil` → conservée transitoirement avec redirection vers `/inscription/alternant` si `profil_complet=false`, sinon `/dashboard`. Suppression définitive en commit dédié post-stabilisation (cohérent VISION §9 phase de gel).

---

## 3. Design des écrans

### 3.1 Principes design hérités

Le parcours unifié reprend le design hybride IR + CP recommandé par `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md` § 7. Synthèse des choix fondateurs :

| Élément | Source | Détail |
|---|---|---|
| Squelette page | IR | flex centré fond `#F4F5F7`, card 460px max-width, animation `irFadeIn` appliquée systématiquement |
| Card | IR + CP | border-radius 16px, padding 36px, fond blanc, box-shadow `0 6px 28px rgba(232,98,42,0.10)`, border `1.5px solid #E8EAF0`, `overflow: visible` (autorise dropdowns) |
| Bouton principal | pattern existant des pages d'auth de la plateforme | identique à `ChoixInscriptionPage` / `ConnexionPage` — pas de modification dans le scope de ce chantier |
| Sous-titre dynamique d'étape | CP | `.cp-subtitle` 11px weight 600 ls 1.5px gris uppercase, affiche le nom de l'étape courante |
| Hover input | CP | border `#CBD5E1` au survol (micro-affordance) |
| Cropper photo | CP | modal 360px radius 20px overlay sombre, drag + zoom + canvas.toBlob |
| Shake bouton sur erreur | IR | hook `useShakeButton` |
| OAuth + séparateur "ou" | IR | uniquement sur l'écran 0 (page choix méthode auth) |

Design system Sterny appliqué (cf. `INVENTAIRE-PLATEFORME.md` §9.1) : Navy `#1E293B`, Orange `#E8622A`, Fond `#F4F5F7`, DM Sans, focus orange + ring `0 0 0 3px rgba(232,98,42,0.15)`, animations stagger 0.4s avec délais 0.08s × index.

### 3.2 Arbitrages des patterns recensés audit § 7

| # | Pattern | Décision | Justification |
|---|---|---|---|
| 1 | Animation entrée card | **appliquer systématiquement** | corrige bug CP (`cpFadeIn` définie mais jamais appliquée) |
| 2 | Sous-titre par étape | **conserver** | gain de clarté pour wizard 7 étapes |
| 3 | Stepper visuel | **barre 2px + libellé "Étape N — [Nom]"** au-dessus, sans le total "sur 7" | volonté UX : progression visible (barre) + repère d'étape (libellé) sans afficher le total qui pourrait décourager |
| 4 | Couleur hover orange | **tokeniser en `--accent-hover: #D4571F`** | DETTE #31, à faire dans la tranche 1 d'extraction composants |
| 5 | Variables `--error / --success` | **harmoniser sur design system Sterny** (`#dc2626` / `#059669`) | DETTE #53, à faire dans la même tranche 1 |

Hauteur bouton principal et style disabled bouton : non modifiés — on réutilise le pattern existant des pages d'auth de la plateforme.

### 3.3 Composants partagés à créer (`components/auth-wizard/`)

12 composants identifiés audit § 6, à extraire dans la tranche 1 du plan d'implémentation (cf. section 7) :

| Composant | Rôle | Réutilisable ailleurs ? |
|---|---|---|
| `<AuthScreenContainer>` | page flex centrée + card | oui (reset password, Apple OAuth handler) |
| `<WizardProgressBar progress={n/7} stepLabel="Études" stepNumber={3}>` | barre 2px + libellé "Étape N — [Nom]" | oui (autres wizards futurs) |
| `<WizardTitle>` + `<WizardStepSubtitle>` | titre INSCRIPTION + sous-titre dynamique | oui |
| `<TextInput>` | input texte avec hover + focus orange + ring | oui (toute la plateforme) |
| `<TextArea>` | idem version multilignes | oui |
| `<CustomSelect>` | trigger + portal dropdown chevron | oui (remplace `CustomSelect` IR + `CpSelect` CP) |
| `<AutocompleteInput>` | input + suggestions portal générique | oui (remplace `VilleAutocomplete` + `CpSuggestionsPortal`) |
| `<PrimaryButton>` | wrapper minimal sur le pattern bouton standard d'auth | oui — wrapper, pas un nouveau bouton |
| `<GoogleSignInButton>` + `<AppleSignInButton>` + `<OrSeparator>` | OAuth + séparateur "ou" | oui (page de connexion) |
| `<BackLink>` | séparateur top + lien retour orange | oui |
| `<PhotoCropperModal>` | modal 360px drag + zoom + canvas | oui (modification profil) |
| `useShakeButton` (hook) | shake animation sur erreur | oui |

Volume estimé d'extraction : ~600 lignes de duplication CSS+JS éliminées (audit § 6).

### 3.4 Écran 0 — `/inscription` (ChoixInscriptionPage refondue)

**Périmètre** : page d'entrée publique, choix de la méthode d'authentification. Pas de wizard — page simple d'arrivée.

**Layout** : `<AuthScreenContainer>` standard, card 460px.

**Contenu** :

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardStepSubtitle> "Crée ton compte alternant"
├── <GoogleSignInButton>     "Continuer avec Google"
├── <AppleSignInButton>      "Continuer avec Apple"
├── <OrSeparator>            "ou"
├── <PrimaryButton variant="email">  "Continuer avec mon email"
└── <BackLink>               "Déjà un compte ? Se connecter"
```

**Interactions** :

- Clic Google → `supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: '/inscription/alternant'}})`
- Clic Apple → idem provider `'apple'`
- Clic email → navigation route `/inscription/alternant` directe, E-1 affiche le formulaire 5 champs (prenom, nom, telephone, email, mdp)
- Clic "Se connecter" → `/connexion`

**Suppressions vs version actuelle** :

- Plus de cartes choix `type_user` (déplacé en E-2)
- Plus de bouton "Je suis propriétaire" (Q8 — proprio par invitation uniquement)

**Pas de `<WizardProgressBar>`** : pas une étape du wizard, pas de progression à afficher.

### 3.5 Écran E-1 — Identité

**Périmètre** : 1ère étape du wizard. Création/complétion de la session Auth + capture identité.

**Branchement par méthode auth** (cf. audit `AUDIT-INSCRIPTION-2026-05-02.md` § 3 signatures Supabase Auth) :

#### 3.5.1 Méthode email (5 champs)

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={1/7} stepLabel="Identité" stepNumber={1}>
├── <WizardStepSubtitle> "Tes informations de contact"
├── <TextInput label="Prénom" required>
├── <TextInput label="Nom" required>
├── <TextInput label="Téléphone" type="tel" required>
├── <TextInput label="Email" type="email" required>
├── <TextInput label="Mot de passe" type="password" required>
├── <PrimaryButton> "Continuer"
└── <BackLink href="/inscription"> "Retour"
```

Validation au submit :
- prenom non vide après trim()
- nom non vide après trim()
- telephone : regex permissive (10 chiffres FR ou format international avec `+`), pas de validation SMS
- email : regex standard
- mdp : longueur ≥ 8 caractères

Au clic "Continuer" :
1. `supabase.auth.signUp({email, password, options: {data: {prenom, nom, telephone}}})` — la session se crée, `auth.users.id` est généré
2. INSERT initial `users` avec `id`, `email`, `prenom`, `nom`, `telephone`, `profil_complet=false`
3. Navigation E-2

#### 3.5.2 Méthode Google ou Apple (3 champs)

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={1/7} stepLabel="Identité" stepNumber={1}>
├── <WizardStepSubtitle> "Confirme tes informations"
├── <TextInput label="Prénom" required value={prenom_oauth_pre_rempli}>
├── <TextInput label="Nom" required value={nom_oauth_pre_rempli}>
├── <TextInput label="Téléphone" type="tel" required>
├── <PrimaryButton> "Continuer"
└── <BackLink href="/inscription"> "Retour"
```

Pré-remplissage prenom + nom depuis `user.user_metadata.full_name` (Google) ou `user.user_metadata.name` (Apple, 1ère connexion uniquement). Champs modifiables au cas où le provider renvoie un nom incorrect (courant chez Apple).

Au clic "Continuer" :
1. INSERT initial `users` avec `id` (= `auth.users.id` déjà créée par OAuth), `email`, `prenom`, `nom`, `telephone`, `profil_complet=false`
2. Navigation E-2

**Pas d'email/mdp à saisir** : la session Auth est déjà ouverte au retour du callback OAuth, le wizard arrive avec une session active.

**Cas particulier Apple Hide My Email** : l'`email` peut matcher `*@privaterelay.appleid.com`. Détection au callback, flag interne `email_is_apple_relay` à logger côté frontend, à signaler section 6.

**Erreur** : si email déjà existant en BDD (signup email) ou conflit de session (OAuth), affichage `<ErrorMessage>` rouge sous le formulaire + shake bouton via `useShakeButton`.

### 3.6 Écran E-2 — Type de profil

**Périmètre** : choix `type_user` parmi 3 valeurs.

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={2/7} stepLabel="Type de profil" stepNumber={2}>
├── <WizardStepSubtitle> "Tu cherches, tu proposes, ou les deux ?"
│
├── <IntentCardRadio name="type_user" value="locataire">
│     [Icône maison + flèche vers la droite]
│     Je cherche un logement
│     Pour les semaines où je suis en cours
│
├── <IntentCardRadio name="type_user" value="hote">
│     [Icône maison avec clé sortante]
│     Je propose mon logement
│     Pour les semaines où je suis en entreprise
│
├── <IntentCardRadio name="type_user" value="les_deux">
│     [Icône cycle / 2 flèches alternées]
│     Les deux
│     Je cherche dans une ville et je propose dans l'autre
│
├── <PrimaryButton> "Continuer"
└── <BackLink onClick={prevStep}> "Retour"
```

**Composant `<IntentCardRadio>`** : carte cliquable pleine largeur, border `1.5px solid #E8EAF0` au repos, border + bg orange diaphane quand sélectionnée (état `aria-checked="true"`). Repris du pattern `.intent-card` IR (audit § 6).

Validation : un radio doit être coché. Bouton "Continuer" disabled sinon.

Au clic "Continuer" : UPDATE `users.type_user` + navigation E-3.

### 3.7 Écran E-3 — Études

**Périmètre** : école, année, filière.

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={3/7} stepLabel="Études" stepNumber={3}>
├── <WizardStepSubtitle> "Ton cursus actuel"
│
├── <AutocompleteInput label="École" placeholder="Tape les premières lettres" suggestions={ecoles_api}>
│
├── <CustomSelect label="Année d'études" options={["BTS 1", "BTS 2", "BUT 1", "BUT 2", "BUT 3", "Licence 1", ..., "Master 2", "Autre"]}>
│
├── <AutocompleteInput label="Filière" placeholder="Ex : Informatique, GEA, Marketing" suggestions={filieres_api}>
│
├── <PrimaryButton> "Continuer"
└── <BackLink onClick={prevStep}> "Retour"
```

**Note** : les listes `ecoles_api`, `annee_etudes`, `filieres_api` sont aujourd'hui hardcodées (DETTE #30). À remplacer par dropdown autocomplete BDD dans une session ultérieure dédiée. En sortie de section 7 du doc cadrage, on pose la dette : pour la première version du parcours unifié on conserve les listes hardcodées, le remplacement BDD est à séquencer en parallèle.

Validation : tous les champs requis. Au clic "Continuer" : UPDATE `users.ecole + annee_etudes + filiere` + navigation E-4.

### 3.8 Écran E-4 — Villes & statuts

**Périmètre** : 4 colonnes BDD à remplir : `ville_ecole`, `statut_ville_ecole`, `ville_entreprise`, `statut_ville_entreprise`.

UI conditionnelle selon `type_user` choisi en E-2 (cf. table 1.3 section 1) :

#### Cas `type_user = 'locataire'`

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={4/7} stepLabel="Villes & statuts" stepNumber={4}>
├── <WizardStepSubtitle> "Où sont ton école et ton entreprise ?"
│
├── <AutocompleteInput label="Ville de mon école" required>
├── <AutocompleteInput label="Ville de mon entreprise" required>
│
├── <Question> "Dans laquelle des deux cherches-tu un logement ?"
├── <RadioGroup>
│     ○ Ville de mon école
│     ○ Ville de mon entreprise
│   </RadioGroup>
│
├── <PrimaryButton> "Continuer"
└── <BackLink> "Retour"
```

Logique : la ville sélectionnée → `statut_ville_X = 'recherche'`, l'autre `statut_ville_X = NULL`.

#### Cas `type_user = 'hote'`

Même UI, libellé radio adapté : "Dans laquelle des deux proposes-tu ton logement ?". La ville sélectionnée → `statut_ville_X = 'hote'`, l'autre `NULL`.

#### Cas `type_user = 'les_deux'`

```
[Card]
├── ...
│
├── <AutocompleteInput label="Ville de mon école" required>
├── <CustomSelect label="Dans cette ville je..." options={["cherche un logement", "propose mon logement"]}>
│
├── <AutocompleteInput label="Ville de mon entreprise" required>
├── <CustomSelect label="Dans cette ville je..." options={["cherche un logement", "propose mon logement"]}>
│
├── <PrimaryButton> "Continuer"
└── <BackLink> "Retour"
```

Mapping : "cherche un logement" → `'recherche'`, "propose mon logement" → `'hote'`. Les 8 combinaisons de la table 1.3 sont toutes couvertes.

Validation : 2 villes saisies (BDD : NOT NULL respecté), 1 (locataire / hote) ou 2 (les_deux) statuts choisis. Bouton disabled tant que non-conforme.

Au clic "Continuer" : UPDATE des 4 colonnes + navigation E-5.

### 3.9 Écran E-5 — Calendrier d'alternance

**Périmètre** : capture du `rhythm_calendar` via `RhythmManualBuilder`.

**Layout** : E-5 reste **dans la card 460px standard**, comme toutes les autres étapes du wizard. Pas de rupture visuelle.

```
[Card 460px standard]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={5/7} stepLabel="Calendrier" stepNumber={5}>
├── <WizardStepSubtitle> "Renseigne semaine par semaine ton rythme"
│
├── <RhythmManualBuilder>
│   [composant refondu pour s'adapter à la largeur 460px de la card]
│
├── <PrimaryButton> "Continuer"
└── <BackLink onClick={prevStep}> "Retour"
```

**Prérequis bloquant — refonte responsive de RhythmManualBuilder** : le composant a été livré le 2 mai après-midi avec un design pleine largeur (12 colonnes mensuelles qui scrollent horizontalement) qui ne tient pas dans 460px. Le composant doit être refondu pour s'adapter à cette largeur avant d'être intégré au parcours unifié. Dette logguée en `DETTE-TECHNIQUE.md` (DETTE #54). Cette refonte est un prérequis bloquant de la tranche 8 du plan d'implémentation (cf. section 7).

**Validation** : le composant remonte `rhythm_calendar` (tableau de semaines) + `rhythm_start_date` + `rhythm_end_date`. Validation non vide.

**Particularité Q9 — pop-up RhythmRequiredPopup** : l'utilisateur qui essaie de "Continuer" sans avoir renseigné de calendrier déclenche la pop-up RhythmRequiredPopup (cf. § 3.12 ci-dessous). Pas de simple bouton disabled — la pop-up explique pourquoi le calendrier est indispensable au matching Sterny et ne propose pas de skip.

Au clic "Continuer" (calendrier renseigné) : UPDATE `users.rhythm_calendar + rhythm_start_date + rhythm_end_date + rhythm_source = 'manual' + rhythm_import_id = NULL` + navigation E-6.

### 3.10 Écran E-6 — Profil personnel

**Périmètre** : date_naissance, sexe, photo (optionnel), bio (optionnel).

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={6/7} stepLabel="À propos de toi" stepNumber={6}>
├── <WizardStepSubtitle> "Pour personnaliser ton expérience"
│
├── <TextInput label="Date de naissance" type="date" required>
│
├── <CustomSelect label="Sexe" options={["Homme", "Femme", "Autre"]} required>
│
├── <PhotoUploadButton onClick={openCropper}>
│     [Icône appareil photo + texte "Ajouter une photo de profil"]
│   </PhotoUploadButton>
│   ← (si photo déjà sélectionnée : aperçu rond 80×80 + bouton "Modifier")
│
├── <TextArea label="Bio" placeholder="Quelques mots sur toi (optionnel)" maxLength={300}>
│
├── <InfoBox> "Photo et bio sont optionnelles. Les renseigner augmente la confiance des autres alternants. Tu pourras les ajouter plus tard si tu préfères."</InfoBox>
│
├── <PrimaryButton> "Continuer"
└── <BackLink> "Retour"
```

Validation : date_naissance NOT NULL + âge ≥ 18 ans (calculé côté frontend), sexe NOT NULL. Photo et bio optionnelles : bouton "Continuer" cliquable même si vides.

**Cropper** : `<PhotoCropperModal>` se déclenche au clic `<PhotoUploadButton>`. UX identique au cropper CP actuel (modal 360px overlay sombre, drag + zoom + bouton "Recadrer"). À la confirmation, l'image cropée est uploadée vers Supabase Storage et l'URL est stockée en state local React (pas encore en BDD : seulement à l'UPDATE qui suit le clic "Continuer").

Au clic "Continuer" : UPDATE `users.date_naissance + sexe + photo_profil_url + bio` + navigation E-7.

### 3.11 Écran E-7 — Validation finale

**Périmètre** : récapitulatif éditable + appel RPC `complete_inscription_alternant` qui flippe `profil_complet=true`.

```
[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardProgressBar progress={7/7} stepLabel="Validation" stepNumber={7}>
├── <WizardStepSubtitle> "Vérifie tes informations avant de finaliser"
│
├── <RecapBlock title="Identité" editable onEdit={() => goToStep(1)}>
│     Prénom, Nom
│     Téléphone : +33 6 XX XX XX XX
│     Email : xxx@xxx
│   </RecapBlock>
│
├── <RecapBlock title="Type de profil" editable onEdit={() => goToStep(2)}>
│     "Je cherche un logement" / "Je propose mon logement" / "Les deux"
│   </RecapBlock>
│
├── <RecapBlock title="Études" editable onEdit={() => goToStep(3)}>
│     IUT de Saint-Malo
│     BUT 3 — Gestion des Entreprises et Administrations
│   </RecapBlock>
│
├── <RecapBlock title="Villes" editable onEdit={() => goToStep(4)}>
│     École : Saint-Malo (je propose)
│     Entreprise : Rennes (je cherche)
│   </RecapBlock>
│
├── <RecapBlock title="Calendrier" editable onEdit={() => goToStep(5)}>
│     [Mini-aperçu visuel : semaines colorées école/entreprise]
│     Du 02/09/2026 au 27/06/2027 — 43 semaines
│   </RecapBlock>
│
├── <RecapBlock title="À propos de toi" editable onEdit={() => goToStep(6)}>
│     [Aperçu photo rond 60×60 si présente]
│     Né(e) le XX/XX/XXXX
│     Bio (si présente)
│   </RecapBlock>
│
├── <PrimaryButton> "Finaliser mon inscription"
└── <BackLink> "Retour"
```

**Composant `<RecapBlock>` à créer** : carte plate avec border subtle 1.5px, padding 16px, titre 11px weight 700 navy uppercase + icône crayon en haut à droite, contenu en texte foncé `#1E293B`. Au clic sur l'icône crayon : navigation à l'étape correspondante en mode édition. Au retour de l'étape : retour automatique en E-7 avec le récap mis à jour.

**Mini-aperçu calendrier** : version réduite du `<RhythmManualBuilder>` en mode read-only, sans interaction. Composant à créer : `<RhythmCalendarPreview>`.

Au clic "Finaliser mon inscription" :
1. Appel RPC `complete_inscription_alternant(p_payload jsonb)` (cf. section 1.5)
2. La RPC valide la cohérence finale (toutes les colonnes structurantes présentes), fait l'UPDATE final, flippe `profil_complet=true` dans la même transaction
3. Si succès : redirection `/dashboard`
4. Si erreur (exemple : validation BDD côté serveur échoue) : `<ErrorMessage>` au-dessus du bouton + shake bouton, l'utilisateur reste en E-7 avec ses données préservées

### 3.12 Pop-up Q9 — RhythmRequiredPopup

**Périmètre** : pop-up affichée quand l'utilisateur tente de "Continuer" en E-5 sans avoir renseigné son calendrier.

**Pattern visuel** : reprise du `.cp-crop-overlay` (overlay sombre plein écran + panel centré).

```
[Overlay rgba(15,20,35,0.85) plein écran z-index 1000]
│
[Panel centré, max-width 400px, fond blanc, border-radius 20px, padding 32px, box-shadow 0 24px 64px rgba(0,0,0,0.25)]
│
├── [Icône calendrier en haut, 48×48, orange diaphane]
│
├── <Title> "Ton calendrier est indispensable"
│   (font-size 18px, weight 700, navy)
│
├── <Body>
│     Sterny te trouve des logements seulement pour les semaines où tu en as besoin. Sans ton calendrier, on ne peut pas savoir quelles semaines tu cherches ni quelles semaines tu proposes.
│
│     Renseigner ton calendrier prend environ 2 minutes. Tu peux le modifier plus tard si ton planning change.
│   </Body>
│   (font-size 14px, weight 400, gris #4B5563, line-height 1.5)
│
└── <PrimaryButton> "Renseigner mon calendrier"
    (ferme la pop-up, focus sur le builder)
```

**Pas de bouton "Continuer sans calendrier"** : la pop-up ne propose pas de skip. Le calendrier est non-négociable (cf. VISION §1 — principe fondateur).

**Pas de bouton "Fermer"** type croix : la pop-up se ferme uniquement par le clic CTA, qui ramène au builder. Un clic sur l'overlay sombre ferme aussi la pop-up (UX standard) mais ne fait pas progresser le wizard — l'utilisateur reste bloqué en E-5 jusqu'à renseignement.

Composant `<RhythmRequiredPopup>` à créer dans `components/auth-wizard/`.

### 3.13 Récapitulatif des composants à créer

Total : **17 composants/hooks** pour la section design, à créer dans la tranche 1 du plan d'implémentation (section 7) :

12 composants partagés audit § 6 + 5 composants spécifiques wizard identifiés section 3 :
- `<IntentCardRadio>` (§ 3.6)
- `<RecapBlock>` (§ 3.11)
- `<RhythmCalendarPreview>` (§ 3.11)
- `<RhythmRequiredPopup>` (§ 3.12)
- `<InfoBox>` (§ 3.10)

### 3.14 Sujets à arbitrer ailleurs dans le doc

- **Variables CSS à introduire** (DETTE #31, #53) : `--accent-hover: #D4571F`, `--error: #dc2626`, `--success: #059669`, plus tokens pour border-radius, box-shadows, transitions actuellement hardcodés. À traiter dans la tranche 1 (extraction composants partagés).

- **DETTE #30 listes hardcodées** (écoles, années, filières en E-3) : à remplacer par dropdown autocomplete BDD dans une session ultérieure dédiée. Pour la 1ère version du parcours unifié, on conserve les listes hardcodées telles quelles.

- **DETTE #54 refonte responsive RhythmManualBuilder** : prérequis bloquant de la tranche 8. À traiter dans une session dédiée avant intégration en E-5.

- **Animations de transition entre étapes** : aujourd'hui aucune (display none/flex brut). Possibilité d'ajouter une animation slide ou fade horizontale en v2. Hors scope de la 1ère version.

- **Mobile UX** : la card 460px se réduit à `padding 28px 24px + border-radius 14px` à `max-width: 480px` (DETTE #44). Spécificités E-5 (RhythmManualBuilder dans card refondue) à valider visuellement sur mobile une fois implémenté.

---

## 4-7. Sections à produire dans la suite de la conv Claude.ai 2

### 4. Gestion des 3 méthodes auth (email, Google, Apple)

Spécifications détaillées de chaque flow : signature exacte des appels Supabase Auth, refonte GoogleAuthHandler, création AppleAuthHandler (DETTE #51), migration INSERT BDD hors handlers (Q5), gestion callback OAuth, particularité Apple `name` 1ère connexion, gestion alias `@privaterelay.appleid.com` Apple Hide My Email.

### 5. Table des 9 parcours bout-en-bout à tester

3 type_user × 3 méthodes auth = 9 parcours. Pour chacun : méthode auth de départ, champs saisis par étape, état BDD attendu colonne par colonne en sortie, redirection finale.

### 6. Sujets RGPD et juridiques à signaler

5 sujets identifiés à intégrer dans le doc consolidé QUESTIONS-PROFESSIONNELS.md (à créer en parallèle) : telephone obligatoire, date_naissance, sexe (finalité métier à clarifier avec avocat/DPO — champ conservé en l'état), Apple Hide My Email, conditions de stockage tokens OAuth.

### 7. Plan d'implémentation séquencé

9 tranches commitables identifiées au cadrage initial, à formaliser : dépendances entre tranches, critères de succès, plan de rollback, durée estimée par session.

---

*Document de cadrage en cours de rédaction. Sections 1-3 finalisées au 3 mai 2026 (sections 1-2 en conv Claude.ai 1 le 2 mai nuit, section 3 en conv Claude.ai 2 le 3 mai). Sections 4-7 à produire dans la suite de la conv Claude.ai 2.*
