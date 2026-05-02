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

## 3-7. Sections à produire en nouvelle conv Claude.ai

Sections restantes du livrable cible, à produire en partant des 2 audits sources (`docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md` et `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md`) déjà à disposition :

### 3. Design des écrans

Description écran par écran (E-1 à E-7) en partant du design hybride IR+CP recommandé par audit design § 7 :
- Squelette card + animation `irFadeIn` appliquée + `overflow: visible`
- Bouton principal 48px (IR)
- Sous-titre dynamique par étape (CP)
- Hover input border `#CBD5E1` (CP)
- Inscription via OAuth + séparateur "ou" (IR)
- Cropper photo (CP) tel quel
- Shake bouton sur erreur (IR)

7 patterns à arbitrer recensés audit design § 7. Étapes E-5 (calendrier) et E-7 (récap) à designer ex nihilo. Pop-up Q9 RhythmRequiredPopup à designer en cohérence avec pattern `.cp-crop-overlay`.

### 4. Gestion des 3 méthodes auth (email, Google, Apple)

Spécifications détaillées de chaque flow :
- Signature exacte des appels `supabase.auth.signUp` / `supabase.auth.signInWithOAuth`
- Handlers `GoogleAuthHandler` (refonte) et `AppleAuthHandler` (création, DETTE #51)
- Migration de l'INSERT BDD hors des handlers vers le parcours unifié (Q5 actée)
- Gestion du callback (URL retour, scopes OAuth, redirect_uri)
- Pré-remplissage prenom/nom depuis providers
- Particularité Apple `name` 1ère connexion uniquement

### 5. Table des 9 parcours bout-en-bout à tester

3 type_user alternant × 3 méthodes auth = 9 parcours. Pour chacun :
- Méthode auth de départ
- Champs saisis par étape
- État BDD attendu en sortie (colonnes par colonnes)
- Redirection finale attendue

### 6. Sujets RGPD et juridiques à signaler

À consolider pour consultation DPO/avocat :
- `telephone` obligatoire (finalité contact opérationnel — standard mais à documenter en politique de confidentialité)
- `date_naissance` (donnée personnelle, finalité validation âge ≥ 18 ans)
- `sexe` ⚠️ finalité métier à clarifier — si pas justifiée, retrait du champ (principe de minimisation)
- Apple Hide My Email (alias `@privaterelay.appleid.com`, traçabilité, perte de contact si alias révoqué)
- Conditions de stockage des tokens OAuth Supabase

### 7. Plan d'implémentation séquencé

Découpage en sessions Claude.ai dédiées + tranches commitables :
- Tranche 1 : extraction des 12 composants partagés identifiés audit design § 6 (`<AuthScreenContainer>`, `<WizardProgressBar>`, etc.)
- Tranche 2 : création `InscriptionAlternantPage.jsx` from-scratch avec étapes E-1 à E-4, E-6, E-7 (E-5 = placeholder)
- Tranche 3 : refonte `ChoixInscriptionPage` (3 OAuth + retrait CTA proprio, Q8)
- Tranche 4 : refonte `GoogleAuthHandler` + création `AppleAuthHandler` (DETTE #51)
- Tranche 5 : durcissement garde `/inscription/proprietaire` (Q8) + suppression `InscriptionPartagerPage` + lien UserDropdown corrigé (Q9)
- Tranche 6 : redirection 301 `/inscription/recherche` + redirection `/completer-profil` (Q3 + Q12)
- Tranche 7 : RPC `complete_inscription_alternant` + intégration submit E-7
- Tranche 8 : intégration `RhythmManualBuilder` en E-5 (session post-unification)
- Tranche 9 : tests bout-en-bout des 9 parcours

Dépendances entre tranches, étape de tests bout-en-bout en final, critères de succès, plan de rollback à formaliser.

---

*Document de cadrage produit le 2 mai 2026 nuit. Sections 1-2 finalisées en conv Claude.ai 1. Sections 3-7 à produire en conv Claude.ai 2 dédiée.*
