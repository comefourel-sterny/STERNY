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

> **Amendement post-spec — 7 mai 2026 (conv Claude.ai 14)**
>
> Le champ `sexe` accepte **4 valeurs** (`'homme'` / `'femme'` / `'autre'` / `'non-precise'`) au lieu des 3 valeurs initialement prévues. Aligne sur le pattern legacy `ModifierProfilPage` et `CompleterProfilPage` qui utilisent déjà ces 4 valeurs en production.
>
> Justification : la valeur `non-precise` permet à l'utilisateur de ne pas déclarer son sexe (donnée RGPD sensible) sans être forcé à un opt-in `autre` qui a une sémantique différente — affirmation d'identité non-binaire vs refus de répondre. Cohérent avec Q-DPO-003 (priorité haute) qui acte la conservation du champ tant que la finalité métier n'est pas validée par professionnel.

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

> **Amendement post-spec — 6 mai 2026 (conv Claude.ai 13)**
>
> Le paragraphe "Sauvegarde progressive" ci-dessus et l'intégralité de la sous-section §2.5 sont **annulés**. Décision actée : pas d'INSERT initial `users` à E-1, pas d'UPDATE partiels intermédiaires. Le state du wizard vit uniquement en mémoire React + miroir `sessionStorage` côté client. La RPC `complete_inscription_alternant` à E-7 reste la seule écriture BDD du parcours.
>
> Justification : (1) cohérence avec l'implémentation livrée des sous-commits E-1 à E-4 (conv 5 à 12), qui n'a jamais matérialisé la sauvegarde progressive prévue ; (2) atomicité conservée, une seule transaction BDD à raisonner ; (3) coût ~2-3h en T2 5/5 contre ~1-2 jours pour aligner rétroactivement E-1 à E-4 sur la spec d'origine.
>
> Limitation acceptée : `sessionStorage` est effaçable (vidage navigateur, navigation privée). Pas de continuité cross-device. Acceptable pour Sterny vu la durée d'inscription (~5 min).
>
> Conséquence pour T2 5/5 : conception du pattern de reprise via `sessionStorage` uniquement (pas de SELECT `users` au callback Auth puisqu'aucune ligne n'existe avant E-7). Si `sessionStorage` vide ou expiré → redémarrage à E-1, sans perte critique.

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

Avant que l'utilisateur arrive à E-1, il a choisi son type de profil puis sa méthode d'authentification sur la page `/inscription` (`ChoixInscriptionPage` refondue, amendement conv 17 du 7 mai 2026) :

**Layout en 2 niveaux** :

- **Niveau 1 — Choix du type de profil** : 2 cartes radio toujours visibles : "Je suis étudiant en alternance" et "Je suis propriétaire" (CTA proprio conservé, cf. précision VISION §6 du 3 mai et amendement conv 17 du 7 mai).
- **Niveau 2 — Choix méthode auth (conditionnel)** :
    - Si carte "alternant" sélectionnée → 3 boutons OAuth apparaissent en dessous : "Continuer avec Google" / "Continuer avec Apple" / "Continuer avec mon email" + lien "Déjà un compte ? Se connecter".
    - Si carte "propriétaire" sélectionnée → 1 bouton "Continuer" simple en dessous, qui route vers `/inscription/proprietaire`. Pas de boutons OAuth proprio sur `/inscription` — les boutons OAuth proprio (Google + Apple + email/password) vivent sur `/inscription/proprietaire` elle-même (cohérent avec le fait que le token `?r=` n'est jamais présent à l'arrivée sur `/inscription` mais uniquement sur `/inscription/proprietaire?r=token` via le lien email).

**Décisions actées** :
- Choix `type_user` final déplacé en E-2 du wizard (alternant : locataire / hote / les_deux). La carte proprio sur ChoixInscriptionPage est un aiguillage de parcours, pas une saisie BDD `type_user`.
- Garde durcie sur `/inscription/proprietaire` (Q8) : sans `?r=token` valide, message d'aide affiché sur la page elle-même, pas de redirect 301.

#### Flow méthode email (alternant)

1. Sélection carte alternant → clic "Continuer avec mon email" → arrivée sur E-1 du wizard `/inscription/alternant`, formulaire prenom + nom + telephone + email + mdp.
2. Submit E-1 → `supabase.auth.signUp({email, password})` → session créée → enchaînement E-2.

#### Flow méthode Google (alternant)

1. Sélection carte alternant → clic "Continuer avec Google" → `supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: '/inscription/alternant'}})`.
2. Callback Google → retour sur `/inscription/alternant`.
3. `OAuthHandler` (refondu T4, cf. § 4.5.2) détecte la session, **ne crée plus de ligne `users`** (Q5 actée), redirige vers E-1 si `users` n'existe pas pour ce `auth.users.id`, ou vers `/dashboard` si `profil_complet=true`.
4. E-1 affichée avec prenom + nom pré-remplis depuis `user.user_metadata.full_name` (Google), telephone à saisir, pas d'email/mdp.
5. Submit E-1 → INSERT `users` avec les 3 champs + `id` de la session Auth.

#### Flow méthode Apple (alternant)

1. Sélection carte alternant → clic "Continuer avec Apple" → `supabase.auth.signInWithOAuth({provider: 'apple', options: {redirectTo: '/inscription/alternant', scopes: 'email name'}})`.
2. Callback Apple → retour sur `/inscription/alternant`.
3. `OAuthHandler` (générique, gère Apple comme Google sans logique provider-spécifique, cf. § 4.5.2) détecte la session, ne crée pas de ligne `users`, redirige vers E-1 si `users` absent.
4. ⚠️ Particularité Apple : `name` (objet `{firstName, lastName}`) n'est fourni qu'à la 1ère connexion. E-1 lit `user.user_metadata.name` au montage. Si absent (connexion 2+ d'un utilisateur Apple qui n'a jamais terminé son inscription), inputs prenom/nom vides, saisie manuelle.
5. Submit E-1 → INSERT `users` avec les 3 champs + `id` de la session Auth. Détection `email_is_apple_relay` si email matche `*@privaterelay.appleid.com` (state React local pour usage UI ultérieur, pas écrit en BDD à ce stade — cf. § 4.4.3).

#### Flow méthode proprio (Google / Apple / email)

Tous les flows proprio (Google, Apple, email/password) sont initiés depuis `/inscription/proprietaire` directement, pas depuis `/inscription`. Détail dans § 4.10. La page `/inscription/proprietaire` n'est accessible qu'avec un `?r=token` valide ou via le clic Continuer depuis ChoixInscriptionPage carte proprio (qui amène à la page sans token et déclenche l'affichage du message d'aide). Cette dichotomie est intentionnelle : le token n'est jamais présent à l'URL `/inscription`, donc proposer des boutons OAuth proprio sur `/inscription` créerait une fausse promesse (l'inscription serait toujours bloquée juste après).

### 2.5 Persistance progressive et reprise

> **⚠️ Section annulée par amendement post-spec — 6 mai 2026 (conv Claude.ai 13)**. Voir §1.5 encart d'amendement pour la décision en vigueur (report intégral à E-7 + sessionStorage côté client). Le contenu ci-dessous est conservé pour traçabilité historique mais ne reflète plus le comportement à implémenter.

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

> **⚠️ AMENDEMENT 7 mai 2026 (conv 17)** : refonte du layout en 2 niveaux. Les 2 cartes radio (alternant/proprio) sont conservées de la version actuelle, contrairement à la spec initiale qui supprimait la carte proprio. Les 3 boutons OAuth (Google/Apple/Email) deviennent **conditionnels** à la sélection de la carte alternant. La carte proprio reste un aiguillage simple vers `/inscription/proprietaire` (qui porte ses propres boutons OAuth). Justification : préserver une porte d'entrée visible pour le proprio invité revenant sans son lien d'invitation, cf. VISION §6 précision 3 mai 2026 et amendement conv 17 du 7 mai 2026. Le bloc layout ci-dessous reflète cette décision.

**Périmètre** : page d'entrée publique, choix du type de profil puis (conditionnel pour alternant) choix de la méthode d'authentification. Pas de wizard — page simple d'arrivée.

**Layout** : `<AuthScreenContainer>` standard, card 460px.

**Contenu** :

[Card]
├── <WizardTitle> "INSCRIPTION"
├── <WizardStepSubtitle> "Crée ton compte"
├── <IntentCardRadio> Carte "Je suis étudiant en alternance"
├── <IntentCardRadio> Carte "Je suis propriétaire"
│
├── (zone conditionnelle 1 — affichée si carte "alternant" sélectionnée) :
│     ├── <GoogleSignInButton>      "Continuer avec Google"
│     ├── <AppleSignInButton>       "Continuer avec Apple"
│     ├── <OrSeparator>             "ou"
│     ├── <PrimaryButton variant="email">  "Continuer avec mon email"
│     └── <BackLink>                "Déjà un compte ? Se connecter"
│
└── (zone conditionnelle 2 — affichée si carte "propriétaire" sélectionnée) :
      ├── <PrimaryButton>           "Continuer"
      └── <BackLink>                "Déjà un compte ? Se connecter"

**Interactions** :

- Clic carte alternant → affiche zone 1, masque zone 2
- Clic carte proprio → affiche zone 2, masque zone 1
- (zone 1) Clic Google → `supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: '/inscription/alternant'}})`
- (zone 1) Clic Apple → `supabase.auth.signInWithOAuth({provider: 'apple', options: {redirectTo: '/inscription/alternant', scopes: 'email name'}})`
- (zone 1) Clic email → navigation route `/inscription/alternant` directe, E-1 affiche le formulaire 5 champs (prenom, nom, telephone, email, mdp)
- (zone 2) Clic Continuer → navigation route `/inscription/proprietaire` (la page filtre via la garde token, cf. § 4.10 et § 7.3.5)
- Clic "Se connecter" → `/connexion`

**Conservations vs version actuelle** :

- 2 cartes radio (alternant + proprio) conservées
- Sémantique d'aiguillage (proprio → /inscription/proprietaire, alternant → wizard) conservée

**Modifications vs version actuelle** :

- Carte alternant route vers `/inscription/alternant` (wizard unifié) au lieu de `/inscription/recherche` (legacy IR), via OAuth Google/Apple/Email
- Ajout des 3 boutons OAuth conditionnels à la sélection carte alternant
- Plus aucun écrit `sessionStorage.signup_type` côté ChoixInscriptionPage (Q5 actée — INSERT users déplacé en E-1 du wizard)

**Pas de `<WizardProgressBar>`** : pas une étape du wizard, pas de progression à afficher.

### 3.5 Écran E-1 — Identité

> **⚠️ AMENDEMENT 5 mai 2026 (conv 10)** : la décision sur `<WizardProgressBar>` mentionnée dans les 3 sous-sections suivantes (§ 3.5, § 3.6, § 3.7) est précisée. Détails complets dans ETAT-COURANT.md section "2026-05-05 (suite) — Conv Claude.ai 10".
>
> - **`showLabel={false}` (défaut composant)** sur les 3 écrans implémentés. Seule la barre orange 2px sous le titre "INSCRIPTION" est visible, sans texte "Étape N — Nom" au-dessus. Rendu minimaliste cohérent avec le design Sterny.
> - **Props simplifiées** : les 3 instances utilisent uniquement `<WizardProgressBar progress={N/7} />`. Les props `stepLabel` et `stepNumber` mentionnées dans les pseudo-JSX ci-dessous (§ 3.5, § 3.6, § 3.7) sont retirées (ignorées par le composant si `showLabel=false`). Code mort sinon.
> - **Convention pour les futurs écrans** : E-4, E-5, E-6, E-7 seront câblés selon le même pattern minimaliste — `<WizardProgressBar progress={N/7} />` sans `stepLabel`/`stepNumber`. Si retour visuel ultérieur amène à activer le label, l'opération est réversible en quelques secondes.
> - **Variable CSS `--accent`** : confirmée définie au scope `:root` dans `sterny-react/src/index.css` ligne 29 (`--accent: #E8622A;`). Le fill orange Sterny s'applique automatiquement.
>
> Les pseudo-JSX ci-dessous (3 sections) sont conservés pour traçabilité historique mais doivent être lus à la lumière de cet amendement.

**Périmètre** : 1ère étape du wizard. Création/complétion de la session Auth + capture identité.

**Branchement par méthode auth** (cf. audit `AUDIT-INSCRIPTION-2026-05-02.md` § 3 signatures Supabase Auth) :

#### 3.5.1 Méthode email (5 champs)

> **⚠️ AMENDEMENT 4 mai 2026 (conv 5)** : la spec ci-dessous décrivait initialement 5 champs en E-1 (prenom, nom, telephone, email, password). Suite à l'audit IR/CP en clôture de conv 5 et à 5 décisions design actées, le pattern E-1 méthode email est REVU :
>
> - **4 champs en E-1** : Prénom, Nom, Téléphone, Email (le mot de passe sort de E-1)
> - **Mot de passe placé en E-7** (dernière étape, juste avant le submit final)
> - **Aucun signUp Supabase à E-1** — l'utilisateur n'a pas de session Auth pendant le wizard. Tout est stocké en mémoire React jusqu'à E-7.
> - **À E-7** : signUp + INSERT initial users + UPDATE complet avec toutes les données du state + envoi mail confirmation + redirection écran "Vérifie ta boîte mail"
> - **Layout strict IR** : labels 11px uppercase weight 700 letter-spacing 1px + placeholders dans inputs + pas d'astérisque
> - **Pas de sous-titre "Tes informations de contact"** (aligné IR/CP)
> - **OAuth Google reste sur écran 0** (ChoixInscriptionPage refondu en T3)
> - **Convention placeholder = école 2 (instruction tutoyée, sans verbe)** (actée 4 mai 2026, conv 6). Exemples canoniques : "Ton prénom", "Ton nom", "Ton adresse email", "Ton numéro de téléphone", "Ta ville". Pas de verbe "saisis" / "entre" / "indique" — directement le complément avec "Ton" / "Ta" + nom du champ. Cette convention naît avec le wizard et ne s'applique pas rétroactivement à `InscriptionRecherchePage.jsx` ni `CompleterProfilPage.jsx` (cf. DETTE #61). Le commit d91b5d6 a appliqué la convention dans la sandbox `<TextInput>`.
> - **Convention de préservation de saisie utilisateur** (actée 4 mai 2026, conv 6). À toute étape du wizard, la valeur saisie par l'utilisateur dans un champ ne doit jamais être effacée par l'apparition d'une erreur de validation. La saisie est conservée dans le state React, l'erreur s'affiche en complément (bordure rouge sur le champ + bannière `<AuthErrorBanner>` qui remplace `<BottomAuthLinks>` pendant 3000 ms).
>
> Le pseudo-JSX et la table d'erreur ci-dessous sont conservés pour traçabilité historique mais doivent être lus à la lumière de cet amendement. Détails complets dans ETAT-COURANT.md section "2026-05-04".

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

> **⚠️ AMENDEMENT 5 mai 2026 (conv 9)** : la spec ci-dessous est révisée sur 5 points suite à l'implémentation E-3 du sous-commit 4/5. Détails complets dans ETAT-COURANT.md section "2026-05-05 (soir) — Clôture conv 9".
>
> 1. **Pas d'UPDATE BDD à E-3** — la ligne "Au clic Continuer : UPDATE `users.ecole + annee_etudes + filiere` + navigation E-4" est obsolète. Conformément à l'amendement § 3.5.1 (conv 5), tout reste en mémoire React jusqu'à E-7 où le signUp + INSERT + UPDATE complet ont lieu. Au clic Continuer en E-3 : `validateE3(state)` puis `goToNextStep` uniquement.
> 2. **AutocompleteInput pour le champ année d'études** (au lieu de CustomSelect) — la liste fermée empêchait les cursus non listés (DCG, BBA, Mastère Spécialisé, etc.) et l'option "Autre" était un cul-de-sac BDD. AutocompleteInput permet la saisie libre si la suggestion ne match pas.
> 3. **Liste ANNEES_ETUDES enrichie 11 → 38 cursus** : CAP 1/2, Bac Pro Seconde/Première/Terminale, BTS 1/2, BUT 1/2/3, DUT 1/2, Bachelor 1/2/3, BBA 1-4, DCG 1-3, Licence 1-3 + Pro, Cycle ingénieur 1-3, Master 1/2, DSCG 1/2, MBA, Mastère Spécialisé, Doctorat, Titre Professionnel, Année de césure. Sources : Onisep, AnAF, alternance-professionnelle.fr.
> 4. **Pas de WizardStepSubtitle** — la mention "Ton cursus actuel" prévue est retirée pour cohérence avec E-1/E-2.
> 5. **Convention AutocompleteInput partagée** : labels alignés sur le pattern TextInput E-1 (uppercase 11px / 700 / letter-spacing 1px) et dropdown limité à 4 suggestions au focus (au lieu de 8). Décision visuelle prise lors du sous-commit 4/5, applicable à tout usage futur du composant. Modification CSS du composant partagé, impacte aussi la sandbox section 7.

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

> **Amendement post-spec — 7 mai 2026 (conv Claude.ai 14)**
>
> Le champ `date_naissance` est saisi via un **input texte au format `JJ/MM/AAAA`** avec helpers de parsing extraits dans `sterny-react/src/utils/dateHelpers.js`, au lieu de l'input natif `<input type="date">` initialement prévu. Aligne sur le pattern legacy `ModifierProfilPage` et `CompleterProfilPage`.
>
> Raisons : (1) UX de l'input natif `<input type="date">` inégale sur mobile selon navigateur, (2) helpers de parse JJ/MM/AAAA ↔ ISO existants et éprouvés en prod, (3) cohérence avec ce que l'utilisateur reverra sur `ModifierProfilPage` post-inscription. Conversion ISO différée à la RPC E-7.
>
> **Pas de check d'âge ≥ 18 ans frontend** en attendant arbitrage professionnel Q-AVO-001 + Q-DPO-002 (cf. CONTEXTE-PROJET §3 sur les mineurs alternants).

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

## 4. Gestion des 3 méthodes auth (email, Google, Apple)

### 4.1 Vue d'ensemble des 3 flows

Les 3 méthodes convergent vers le même état BDD final (cf. section 1) en passant par les 7 mêmes étapes du wizard E-1 → E-7. La seule différence est l'amorçage : qui crée la session Supabase Auth, et avec quels champs pré-remplis.

| Aspect | Email | Google | Apple |
|---|---|---|---|
| Crée la session Auth | submit E-1 | callback OAuth provider | callback OAuth provider |
| Champs E-1 | 5 (prenom, nom, telephone, email, mdp) | 3 (prenom, nom, telephone) | 3 (prenom, nom, telephone) |
| Pré-remplissage prenom/nom | aucun | `user.user_metadata.full_name` | `user.user_metadata.name` (1ère connexion uniquement) |
| Email | saisi par l'utilisateur | renvoyé par Google | renvoyé par Apple (potentiellement aliasé `@privaterelay.appleid.com`) |
| INSERT initial `users` | E-1 submit | E-1 submit | E-1 submit |
| Particularité | aucune | aucune | `name` non re-fourni aux connexions suivantes, alias Hide My Email possible |

Principe acté Q5 : **aucun handler OAuth n'écrit dans la table `users`**. L'INSERT initial est fait depuis le wizard E-1 au clic "Continuer", avec l'`id` de la session Auth déjà créée par le provider. Cas particulier du parcours propriétaire : cf. § 4.5.3 et § 4.10 ci-dessous.

### 4.2 Méthode email — `supabase.auth.signUp`

#### 4.2.1 Appel exact

À déclencher au clic "Continuer" en E-1 méthode email, après validation frontend des 5 champs :

```javascript
const { data, error } = await supabaseClient.auth.signUp({
  email: emailInput.trim(),
  password: passwordInput,
  options: {
    emailRedirectTo: `${window.location.origin}/inscription/alternant`,
    data: {
      // Métadonnées non-sensibles, lisibles via user.user_metadata
      prenom: prenomInput.trim(),
      nom: nomInput.trim()
    }
  }
});
```

#### 4.2.2 Comportement Supabase

`supabase.auth.signUp` crée immédiatement une ligne dans `auth.users` (table système Supabase, distincte de `public.users`). Selon la configuration du projet Supabase :

- Si "Confirm email" est activé (configuration recommandée production) : Supabase envoie un mail de confirmation, la session n'est pas active tant que l'utilisateur ne clique pas le lien. Au clic → redirection sur `emailRedirectTo` avec la session active.
- Si "Confirm email" est désactivé (configuration dev/test possible) : la session est immédiatement active, pas de mail envoyé.

**À arbitrer en tranche d'implémentation** : configuration "Confirm email" sur le projet Supabase production. Recommandé activé (sécurité standard, évite les comptes avec emails frauduleux). Implication UX : l'utilisateur quitte le wizard pour aller dans sa boîte mail puis revient — il faut un écran intermédiaire "Vérifie ta boîte mail" entre E-1 submit et E-2.

À noter dans `DETTE-TECHNIQUE.md` ou en section 7 du doc cadrage comme sous-tâche.

#### 4.2.3 INSERT initial `users` côté wizard

Une fois la session Auth ouverte (immédiatement si email confirm OFF, après clic mail si ON), le wizard exécute son INSERT initial en E-1 :

```javascript
await supabaseClient.from('users').insert({
  id: session.user.id,             // = auth.users.id généré par signUp
  email: session.user.email,
  prenom: prenomInput.trim(),
  nom: nomInput.trim(),
  telephone: telephoneInput.trim(),
  profil_complet: false
  // tous les autres champs structurants restent NULL et seront remplis 
  // aux UPDATE successifs des étapes E-2 → E-6, puis profil_complet 
  // flippé à true par la RPC complete_inscription_alternant en E-7
});
```

#### 4.2.4 Gestion d'erreur

| Erreur Supabase | Code | Réaction wizard |
|---|---|---|
| Email déjà utilisé | `User already registered` | Affichage `<ErrorMessage>` "Cet email est déjà utilisé. Tu as déjà un compte ?" + lien `<a href="/connexion">Se connecter</a>` + shake bouton |
| Mot de passe trop court | `Password should be at least 6 characters` | Affichage `<ErrorMessage>` sous le champ mdp + shake bouton |
| Email invalide | `Invalid email` | Idem, sous le champ email |
| Erreur réseau / Supabase down | timeout | `<ErrorMessage>` "Une erreur est survenue, réessaie dans un instant" + shake bouton, données préservées en state React |

### 4.3 Méthode Google — `supabase.auth.signInWithOAuth`

#### 4.3.1 Appel exact

Déclenché au clic du bouton `<GoogleSignInButton>` sur l'écran 0 (`/inscription`) :

```javascript
const { error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/inscription/alternant`,
    scopes: 'email profile',
    queryParams: {
      access_type: 'online',
      prompt: 'select_account'
    }
  }
});
```

Note sur les `queryParams` :
- `access_type: 'online'` : on n'a pas besoin de refresh tokens long-terme côté Google (Sterny ne consomme aucune API Google après l'auth, juste l'identité). Réduit la surface RGPD.
- `prompt: 'select_account'` : force l'affichage du sélecteur de compte Google même si une seule session est active. UX plus claire pour l'utilisateur.

#### 4.3.2 Callback côté Supabase

Au retour de Google, Supabase :
1. Crée ou retrouve la ligne dans `auth.users` (clé : email Google).
2. Renseigne `auth.users.user_metadata` avec les champs renvoyés par Google (`full_name`, `email`, `picture`, `email_verified`, etc.).
3. Redirige le navigateur vers `redirectTo` avec un fragment d'URL `#access_token=...`.
4. Le client Supabase JS détecte ce fragment, l'échange contre une session active, déclenche les listeners `onAuthStateChange`.

#### 4.3.3 Lecture des champs Google côté wizard E-1

Au montage de E-1 (méthode Google) :

```javascript
const { data: { session } } = await supabaseClient.auth.getSession();
const googleMetadata = session?.user?.user_metadata ?? {};

// full_name fourni par Google sous forme "Prénom Nom"
const fullName = googleMetadata.full_name ?? '';
const [prenomGoogle, ...rest] = fullName.split(' ');
const nomGoogle = rest.join(' ');

// Pré-remplissage des inputs (modifiables par l'utilisateur)
setPrenom(prenomGoogle);
setNom(nomGoogle);
```

Le découpage `full_name` → `prenom + nom` est imprécis (Google ne sépare pas explicitement). On considère que le 1er token est le prénom et le reste le nom. L'utilisateur peut corriger dans les inputs pré-remplis avant de cliquer "Continuer".

### 4.4 Méthode Apple — `supabase.auth.signInWithOAuth`

#### 4.4.1 Appel exact

```javascript
const { error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: `${window.location.origin}/inscription/alternant`,
    scopes: 'email name'
  }
});
```

Le scope `name` doit être demandé explicitement — sinon Apple ne fournit pas le nom du tout. Sterny le demande à chaque appel pour assurer le pré-remplissage E-1 lors de la 1ère connexion.

#### 4.4.2 Particularité Apple — `name` à la 1ère connexion uniquement

Apple ne renvoie le `name` que lors de la **première** auth d'un utilisateur sur l'app (ou plus précisément : lors du premier consentement de partage d'identité). Aux connexions suivantes du même utilisateur, `user_metadata.name` est absent.

**Implication pour Sterny** :
- 1ère connexion utilisateur Apple → `name` présent → pré-remplissage E-1 possible.
- Connexion 2+ d'un utilisateur Apple **qui n'aurait pas terminé son inscription la 1ère fois** → `name` absent → E-1 affiche les champs `<TextInput label="Prénom">` et `<TextInput label="Nom">` **vides** — l'utilisateur doit les saisir manuellement.
- Pour un utilisateur Apple qui a terminé son inscription : ses données `prenom`/`nom` sont sauvegardées dans `public.users` à l'INSERT E-1 de la 1ère session. Aux connexions suivantes, on les relit depuis `public.users`, pas depuis `user_metadata.name`.

```javascript
// Au montage de E-1 méthode Apple
const { data: { session } } = await supabaseClient.auth.getSession();
const appleMetadata = session?.user?.user_metadata ?? {};

// Apple renvoie un objet { firstName, lastName } à la 1ère connexion
const appleName = appleMetadata.name;
const prenomApple = appleName?.firstName ?? '';
const nomApple = appleName?.lastName ?? '';

// Pré-remplissage si présent, sinon inputs vides
setPrenom(prenomApple);
setNom(nomApple);
```

#### 4.4.3 Particularité Apple Hide My Email

Apple permet à l'utilisateur de masquer son vrai email derrière un alias de la forme `<chaîne aléatoire>@privaterelay.appleid.com`. Cet alias forwarde les emails reçus vers le vrai email Apple ID, qui reste invisible de Sterny.

**Implications** :

- Sterny enregistre l'alias tel quel dans `public.users.email`. Aucune tentative de récupérer le vrai email (impossible et contraire à l'intention RGPD du mécanisme Apple).
- Détection au callback E-1 :

```javascript
const isAppleRelay = session.user.email?.endsWith('@privaterelay.appleid.com');
// Stocké en state React local pour usage UI ultérieur (ex : message 
// "Tu utilises un email aliasé Apple" dans Modifier mon profil)
// Pas écrit en BDD à ce stade — colonne dédiée à arbitrer plus tard si 
// besoin (sujet RGPD section 6).
```

- Si un jour l'utilisateur révoque l'alias depuis ses paramètres Apple ID, les emails envoyés par Sterny (notifications matching, demandes de réservation) sont silencieusement perdus. Sterny n'est pas alertée. Sujet à logger en `QUESTIONS-PROFESSIONNELS.md` section avocat/DPO et section assureur (continuité de service).

### 4.5 GoogleAuthHandler refondu en OAuthHandler générique

#### 4.5.1 État actuel (audit § 7)

`sterny-react/src/components/GoogleAuthHandler.jsx` (128 lignes) joue 2 rôles couplés :

1. **Routage** : si user authentifié arrive sur `/`, `/connexion`, `/completer-profil`, ou toute route `/inscription/*`, il décide de la redirection finale en fonction de `users.profil_complet` et `users.type_user`.
2. **INSERT initial** : si `users` n'existe pas pour l'`auth.users.id` actuel, il INSERT directement avec `id, email, prenom, nom, type_user, parrain_id` lus depuis `sessionStorage.signup_type` + `sessionStorage.referral_token`.

Le 2ᵉ rôle est ce qui doit disparaître (Q5 actée).

#### 4.5.2 OAuthHandler refondu — rôle unique : routeur

Renommage `GoogleAuthHandler.jsx` → `OAuthHandler.jsx`. Le handler ne lit plus le provider — il s'applique à toute session Auth ouverte, peu importe la méthode (Google, Apple, ou demain n'importe quel autre provider).

**Routes traitées** : `'/'`, `'/connexion'`, `'/completer-profil'`, et toute route `/inscription/*` **sauf `/inscription/proprietaire`** (cf. § 4.5.3 ci-dessous).

```
Au montage / changement de route / changement d'auth state :
  1. Si pas de session Auth → return (laisser passer)
  2. Si route est /inscription/proprietaire ou /inscription/proprietaire/* → return (cf. § 4.5.3)
  3. Si route hors AUTH_CALLBACK_ROUTES (cf. ci-dessus) → return (laisser passer)
  4. SELECT id, type_user, profil_complet FROM users WHERE id = session.user.id
  5. Cas A — ligne users absente :
     redirection /inscription/alternant (le wizard fera l'INSERT en E-1)
  6. Cas B — ligne users existe, profil_complet = false :
     redirection /inscription/alternant (le wizard détecte les champs déjà 
     saisis et reprend à la première étape avec un champ obligatoire vide, 
     cf. section 2.5 pattern de reprise)
  7. Cas C — ligne users existe, profil_complet = true :
     redirection /dashboard (plus de cas type_user='proprietaire' à gérer 
     ici — ce flow est sur sa route dédiée /dashboard/proprietaire 
     accessible séparément)
```

**Suppressions** vs version actuelle :
- Lecture sessionStorage `signup_type`, `referrer_id`, `referral_token`, `code_parrainage`
- INSERT users
- Cleanup sessionStorage post-INSERT
- Redirection conditionnelle selon `type_user === 'proprietaire'`

**Ajouts** :
- Cas explicite "ligne users absente → wizard prend la main pour INSERT"
- Cas explicite d'exclusion route `/inscription/proprietaire`
- Pattern de reprise pour `profil_complet=false`

Volume estimé après refonte : ~70 lignes vs 128 actuellement.

#### 4.5.3 Cas particulier : route `/inscription/proprietaire` exclue

`OAuthHandler` doit explicitement **ne pas intercepter** les routes `/inscription/proprietaire` et `/inscription/proprietaire/*` (sous-chemins éventuels avec query params type `?r=token`).

Pourquoi : le parcours propriétaire conserve son flow d'inscription propre (hors scope unification, cf. intro de ce doc et VISION §6). Si `OAuthHandler` interceptait au callback Google d'un proprio, il regarderait `users.profil_complet`, ne trouverait pas de ligne (proprio nouveau) et redirigerait vers `/inscription/alternant` — ce qui détournerait le proprio vers le mauvais parcours.

Implémentation côté code : la liste de routes traitées du handler ajoute une exclusion explicite, type :

```javascript
const isOAuthCallbackRoute = (pathname) => {
  if (pathname.startsWith('/inscription/proprietaire')) return false; // exclusion
  if (pathname === '/' || pathname === '/connexion' || pathname === '/completer-profil') return true;
  if (pathname.startsWith('/inscription/')) return true;
  return false;
};
```

C'est la responsabilité de `InscriptionProprietairePage` de gérer son propre callback OAuth. Cf. § 4.10 ci-dessous pour la spécification détaillée.

### 4.6 AppleAuthHandler à créer (DETTE #51) — caduque

DETTE #51 demandait la création d'un `AppleAuthHandler.jsx` séparé du `GoogleAuthHandler.jsx`. Ce besoin est **caduc** avec la refonte § 4.5.2 : un seul `OAuthHandler` générique gère Google, Apple, et toute future méthode OAuth. Le composant ne lit pas le provider — il lit juste `session.user.id` et la table `users`.

**Pré-remplissage spécifique au provider en E-1** : le handler ne fait pas de pré-remplissage. C'est `InscriptionAlternantPage` étape E-1 qui, au montage, lit `session.user.app_metadata.provider` (`'google'` / `'apple'` / `'email'`) pour décider quelle logique de pré-remplissage appliquer (cf. § 4.3.3 et § 4.4.2).

DETTE #51 est donc fermée par cette refonte (pas d'AppleAuthHandler dédié à créer). La trace dans `DETTE-TECHNIQUE.md` doit être mise à jour pour acter cette résolution lors du commit groupé de clôture conv 2.

### 4.7 Migration INSERT users hors handlers (Q5)

Tableau récapitulatif avant/après :

| Aspect | Avant | Après |
|---|---|---|
| Qui INSERT `users` (alternant) | `GoogleAuthHandler` (callback OAuth) ou `InscriptionRecherchePage`/`CompleterProfilPage` (parcours email) | `InscriptionAlternantPage` E-1 (au clic "Continuer", toutes méthodes auth confondues) |
| Qui INSERT `users` (proprio) | `GoogleAuthHandler` (callback OAuth proprio) ou `InscriptionProprietairePage` (parcours email) | `InscriptionProprietairePage` au callback OAuth proprio + au submit email (cf. § 4.10) |
| Quand (alternant) | au callback OAuth ou au submit final email | toujours au submit E-1 |
| Avec quels champs (alternant) | minimal (id, email, prenom, nom, type_user, parrain_id) côté OAuth ; complet côté email | minimal (id, email, prenom, nom, telephone, profil_complet=false) — uniforme toutes méthodes |
| `type_user` à l'INSERT (alternant) | depuis sessionStorage | NULL à l'INSERT, écrit à l'UPDATE E-2 |
| `type_user` à l'INSERT (proprio) | `'proprietaire'` depuis sessionStorage | `'proprietaire'` en dur côté `InscriptionProprietairePage` |
| `parrain_id` (alternant) | écrit à l'INSERT depuis sessionStorage | NULL en sortie d'inscription alternant (Q-S1.D actée) |

**Impact côté code** :

- Suppression de tous les `signInWithOAuth` qui écrivent `signup_type` en sessionStorage (alternant ET proprio).
- Suppression du fallback `typeUser = sessionStorage.getItem('signup_type') || 'locataire'` dans le handler.
- Les sources de `signInWithOAuth` après refonte : écran 0 `/inscription` (parcours alternant), `ConnexionPage` (utilisateurs existants), `InscriptionProprietairePage` (parcours proprio, conservé).

### 4.8 Pattern de reprise et routage en fonction de l'état BDD

Cohérent avec section 2.5. Vue synthétique pour le parcours alternant :

| État BDD `users` | Décision `OAuthHandler` | Décision wizard `InscriptionAlternantPage` |
|---|---|---|
| Ligne absente | redirige vers `/inscription/alternant` | E-1 démarre, INSERT initial au submit |
| Ligne existe, `profil_complet=false`, `prenom/nom/telephone` saisis seulement | redirige vers `/inscription/alternant` | charge `users` au montage, détecte que E-1 est OK, démarre à E-2 |
| Ligne existe, `profil_complet=false`, jusqu'à `ville_*` saisis | redirige vers `/inscription/alternant` | démarre à E-5 (1ère étape avec un champ obligatoire encore vide) |
| Ligne existe, `profil_complet=true` | redirige vers `/dashboard` | jamais atteint (handler intercepte avant) |

Algorithme de reprise au montage du wizard :

```
SELECT * FROM users WHERE id = session.user.id;
Pour chaque étape E-1 → E-7 dans l'ordre :
  Vérifier si tous les champs obligatoires de l'étape sont renseignés
  Si non → définir currentStep = cette étape, render
  Si oui → continuer à la suivante
Si toutes les étapes obligatoires sont OK → currentStep = E-7 récap
```

L'utilisateur peut toujours revenir en arrière via le `<BackLink>`. Les valeurs déjà saisies sont préservées dans le state React et en BDD.

### 4.9 Tableau récapitulatif des appels Supabase Auth dans la plateforme

Synthèse des appels `supabase.auth.*` après refonte du chantier unification :

| Fichier | Méthode appelée | Rôle |
|---|---|---|
| `ChoixInscriptionPage.jsx` (écran 0 refondu) | `signInWithOAuth({provider:'google'})` + `redirectTo:'/inscription/alternant'` | Démarrage flow Google depuis inscription alternant |
| `ChoixInscriptionPage.jsx` (écran 0 refondu) | `signInWithOAuth({provider:'apple'})` + `redirectTo:'/inscription/alternant'` | Démarrage flow Apple depuis inscription alternant |
| `InscriptionAlternantPage.jsx` E-1 méthode email | `auth.signUp({email, password, options})` | Création compte email alternant |
| `InscriptionProprietairePage.jsx` (existant, à adapter cf. § 4.10) | `signInWithOAuth({provider:'google'})` + `redirectTo:'/inscription/proprietaire?r=<token>'` | Démarrage flow Google depuis inscription proprio (token préservé) |
| `InscriptionProprietairePage.jsx` (existant, à adapter cf. § 4.10) | `signInWithOAuth({provider:'apple'})` + `redirectTo:'/inscription/proprietaire?r=<token>'` | Démarrage flow Apple depuis inscription proprio (token préservé) |
| `InscriptionProprietairePage.jsx` (existant) | `auth.signUp({email, password, options})` | Création compte email proprio |
| `ConnexionPage.jsx` (existant, à minimement adapter) | `signInWithOAuth({provider:'google'})` + `redirectTo:'/dashboard'` | Connexion utilisateur Google existant |
| `ConnexionPage.jsx` (existant, à minimement adapter) | `signInWithOAuth({provider:'apple'})` + `redirectTo:'/dashboard'` | Connexion utilisateur Apple existant |
| `ConnexionPage.jsx` (existant) | `auth.signInWithPassword({email, password})` | Connexion utilisateur email existant |
| `OAuthHandler.jsx` (ex-GoogleAuthHandler) | `auth.getSession()` (lecture) | Routage post-callback (sauf `/inscription/proprietaire`) |
| Toute la plateforme | `auth.onAuthStateChange()` (listener) | Détection sessions |

**Les pages suivantes n'appellent plus `signInWithOAuth`** (vs version actuelle) :
- `InscriptionRecherchePage` — supprimée (Q3 redirection 301)
- `InscriptionPartagerPage` — supprimée (Q9)

### 4.10 Dépendance critique — adaptation du parcours propriétaire post-Q5

#### 4.10.1 Constat

La décision Q5 (suppression de l'INSERT `users` dans le handler OAuth) **casse le parcours proprio Google actuel**, qui dépendait de cet INSERT pour fonctionner. L'audit fonctionnel `AUDIT-INSCRIPTION-2026-05-02.md` § 4 et § 7 confirme la chaîne : aujourd'hui `InscriptionProprietairePage.jsx:72` appelle `signInWithOAuth` avec `sessionStorage.signup_type='proprietaire'` puis le handler `GoogleAuthHandler` INSERT `users` avec `type_user='proprietaire'` au callback. Sans le handler qui fait l'INSERT, le proprio Google se retrouve avec une session Auth active mais aucune ligne `public.users` correspondante, et l'application est dans un état indéfini.

Cette dépendance n'est pas optionnelle : la refonte alternant et l'adaptation proprio doivent être commitées **dans le même chantier** ou **dans des commits qui se suivent**, pas dans l'ordre inverse (sinon on casse la prod proprio le temps que la suite arrive).

#### 4.10.2 Adaptation requise dans `InscriptionProprietairePage.jsx`

Spec de l'adaptation, cohérente avec le principe Q5 (chaque page fait son propre INSERT, pas le handler) :

```
Au montage de InscriptionProprietairePage (route /inscription/proprietaire?r=<token>) :
  1. Vérifier la présence et la validité du token ?r=<token> 
     (logique existante à conserver, durcie Q8 — token obligatoire, 
     sinon redirection /inscription)
  2. Décoder le token → récupérer les données de parrainage 
     (parrain_id locataire, ville pré-remplie, etc., logique existante)
  3. Vérifier l'état de la session Auth :
     a. Pas de session active → afficher l'écran "comment t'inscrire" 
        (3 boutons Google / Apple / email, logique existante adaptée)
     b. Session Auth active (l'utilisateur revient d'un callback OAuth) :
        - SELECT users WHERE id = session.user.id
        - Si ligne users absente → INSERT minimal avec type_user='proprietaire',
          email = session.user.email, prenom + nom depuis user_metadata, 
          parrain_id depuis le token, profil_complet=false. 
          Puis afficher l'étape suivante du wizard proprio.
        - Si ligne users existe (utilisateur revient finir son inscription 
          plus tard) → reprise à l'étape proprio avec un champ obligatoire 
          encore vide.
```

**Différences vs parcours alternant** :
- Le proprio fait son INSERT au callback OAuth (au montage de la page après retour de Google/Apple), pas après une étape "Identité" explicite. L'utilisateur ne saisit pas son prenom/nom/telephone dans une 1ère étape distincte — le parcours proprio est plus court.
- `type_user='proprietaire'` est écrit en dur, pas issu d'un choix utilisateur (le proprio n'a pas le choix de son type — il arrive par invitation, son type est déterminé).
- `parrain_id` est écrit à l'INSERT depuis le token décodé.

#### 4.10.3 Suppression du sessionStorage

Le mécanisme `sessionStorage.signup_type='proprietaire'` lu par l'ancien `GoogleAuthHandler` n'a plus d'utilité après refonte (`OAuthHandler` ne lit plus rien de sessionStorage, et `InscriptionProprietairePage` connaît son `type_user` en dur). À supprimer dans le même commit.

#### 4.10.4 DETTE technique tracée

Cette adaptation est tracée comme **DETTE #55 — Adaptation parcours proprio post-suppression INSERT OAuthHandler** dans `DETTE-TECHNIQUE.md`, à créer en commit groupé de clôture conv 2.

#### 4.10.5 Séquencement dans le plan d'implémentation

À traiter dans la **même tranche** que la refonte `OAuthHandler` (tranche 4 du plan d'implémentation, cf. section 7) ou **immédiatement après dans la même session Claude Code**. Pas dans une session ultérieure séparée — la fenêtre entre les 2 commits doit être minimale en prod pour éviter une période de cassure du proprio Google.

---

## 5. Table des 9 parcours bout-en-bout à tester

### 5.1 Périmètre

9 parcours alternant à tester en bout-en-bout : 3 `type_user` (`locataire`, `hote`, `les_deux`) × 3 méthodes auth (email, Google, Apple). Pour chacun : amorçage, séquence des 7 étapes, état BDD attendu colonne par colonne en sortie, redirection finale.

**Hors scope de cette table** : 3 parcours propriétaire (email + Google + Apple) à tester séparément après implémentation de DETTE #55 (adaptation `InscriptionProprietairePage` post-Q5). Une table de tests proprio sera produite dans le cadre de cette DETTE, pas dans ce doc.

**Méthodologie** : la section décrit d'abord l'état BDD commun aux 9 parcours, puis les variations selon les 2 dimensions (méthode auth, type_user), et termine sur une table croisée 3×3 récapitulative et les tests transverses.

### 5.2 État BDD initial avant inscription

Avant que l'utilisateur ne clique "Continuer avec X" sur l'écran 0 :

- `auth.users` : aucune ligne pour cet utilisateur (pas encore de session Supabase).
- `public.users` : aucune ligne (pas encore d'INSERT).
- Aucune entrée sessionStorage liée à l'inscription (cf. § 4.7 — sessionStorage `signup_type` retiré).

### 5.3 État BDD attendu commun aux 9 parcours en sortie

Colonnes écrites identiquement par les 9 parcours, à la fin du wizard E-7 (après RPC `complete_inscription_alternant`) :

| Colonne `public.users` | Type | Valeur attendue |
|---|---|---|
| `id` | uuid | `auth.users.id` (FK CASCADE) |
| `email` | text | non NULL, format email valide |
| `prenom` | text | non NULL après trim |
| `nom` | text | non NULL après trim |
| `telephone` | text | non NULL, format permissif validé |
| `ecole` | text | valeur saisie en E-3 (liste hardcodée DETTE #30) |
| `annee_etudes` | text | valeur saisie en E-3 |
| `filiere` | text | valeur saisie en E-3 |
| `rhythm_calendar` | jsonb | tableau non vide `[{week_start, status}, ...]` |
| `rhythm_start_date` | date | premier lundi du calendrier |
| `rhythm_end_date` | date | dernier lundi du calendrier |
| `rhythm_source` | text | `'manual'` |
| `rhythm_import_id` | uuid | NULL (saisie manuelle, Q-S2.A) |
| `date_naissance` | text | format `YYYY-MM-DD`, âge ≥ 18 ans |
| `sexe` | text | `'homme'` / `'femme'` / `'autre'` |
| `photo_profil_url` | text | URL Supabase Storage si renseignée, sinon NULL |
| `bio` | text | texte si renseigné, sinon NULL |
| `profil_complet` | boolean | **`true`** (flippé par RPC E-7) |
| `identite_verifiee` | text | `'non_verifiee'` (default BDD) |
| `is_admin` | boolean | `false` (default BDD) |
| `preferences_email` | jsonb | objet par défaut (5 clés) |
| `invitation_token` | text | UUID v4 généré (permet parrainage proprio futur, cf. section 1.2.8) |
| `parrain_id` | uuid | NULL (Q-S1.D — pas de parrainage entre alternants) |
| `code_parrainage` | text | NULL (idem Q-S1.D) |
| `type_alternance` | text | NULL (déprécié VISION §3, cf. section 1.4.2) |
| `rythme_alternance` | text | NULL (déprécié VISION §3) |
| `ville` (legacy) | text | NULL (gel d'écriture, cf. section 1.4.1) |
| `a_logement` | boolean | NULL (gel d'écriture, Q11) |
| `created_at` | timestamptz | `now()` du moment de l'INSERT initial E-1 |

Les colonnes "flux métier post-inscription" (documents `doc_*`, garant) restent NULL (cf. section 1.4.3).

### 5.4 Variations par méthode auth (E-1 + colonnes auth)

#### 5.4.1 Méthode email

`auth.users.app_metadata.provider = 'email'`. Champs saisis en E-1 (5) : prenom, nom, telephone, email, mdp. Pas de pré-remplissage. INSERT `public.users` au submit E-1 avec `email = emailInput`, `prenom/nom/telephone = inputs trim()`. Si "Confirm email" activé en prod, écran intermédiaire entre E-1 submit et E-2 (cf. § 4.2.2).

#### 5.4.2 Méthode Google

`auth.users.app_metadata.provider = 'google'`. Champs saisis en E-1 (3) : prenom, nom, telephone. Pré-remplissage prenom + nom depuis `user_metadata.full_name` (split sur espace). Email = `user.email` Google (jamais aliasé). INSERT `public.users` au submit E-1 avec `email = session.user.email`, prenom + nom = inputs (modifiables avant submit), telephone = input.

#### 5.4.3 Méthode Apple

`auth.users.app_metadata.provider = 'apple'`. Champs saisis en E-1 (3) : prenom, nom, telephone. Pré-remplissage prenom + nom depuis `user_metadata.name.firstName/lastName` **si présent à la 1ère connexion** (cf. § 4.4.2), sinon vides. Email = `user.email` Apple, **potentiellement aliasé** `*@privaterelay.appleid.com`. INSERT `public.users` identique à Google. Flag local React `isAppleRelay` levé si email aliasé (pas écrit en BDD à ce stade).

### 5.5 Variations par `type_user` (E-2 + E-4)

E-2 écrit `users.type_user`. E-4 écrit `ville_ecole`, `statut_ville_ecole`, `ville_entreprise`, `statut_ville_entreprise` selon les 8 cas de la table 1.3 (section 1).

Pour les tests bout-en-bout, on retient un cas représentatif par `type_user` (les autres cas étant testables en variation supplémentaire au sein de chaque parcours principal) :

#### 5.5.1 `type_user = 'locataire'`

Cas représentatif : cherche dans la ville d'école.

| Colonne | Valeur attendue |
|---|---|
| `type_user` | `'locataire'` |
| `ville_ecole` | non NULL (saisie utilisateur) |
| `statut_ville_ecole` | `'recherche'` |
| `ville_entreprise` | non NULL (saisie utilisateur) |
| `statut_ville_entreprise` | NULL |

Variation à tester en complément : "cherche dans la ville d'entreprise" → `statut_ville_ecole = NULL`, `statut_ville_entreprise = 'recherche'`.

#### 5.5.2 `type_user = 'hote'`

Cas représentatif : propose dans la ville d'école.

| Colonne | Valeur attendue |
|---|---|
| `type_user` | `'hote'` |
| `ville_ecole` | non NULL |
| `statut_ville_ecole` | `'hote'` |
| `ville_entreprise` | non NULL |
| `statut_ville_entreprise` | NULL |

Variation à tester : "propose dans la ville d'entreprise" → statuts inversés.

#### 5.5.3 `type_user = 'les_deux'`

Cas représentatif : propose école + cherche entreprise.

| Colonne | Valeur attendue |
|---|---|
| `type_user` | `'les_deux'` |
| `ville_ecole` | non NULL |
| `statut_ville_ecole` | `'hote'` |
| `ville_entreprise` | non NULL |
| `statut_ville_entreprise` | `'recherche'` |

Variations à tester : 3 autres cas de la table 1.3 (cherche école + propose entreprise, cherche les 2, propose les 2).

### 5.6 Table croisée 3×3 des 9 parcours

| # | Parcours | Méthode auth | type_user | Champs E-1 saisis | E-2 | E-4 colonnes critiques |
|---|---|---|---|---|---|---|
| P1 | Email × Locataire | email | `'locataire'` | 5 (prenom, nom, tel, email, mdp) | radio "Je cherche" | `statut_ville_ecole='recherche'`, `statut_ville_entreprise=NULL` |
| P2 | Email × Hôte | email | `'hote'` | 5 | radio "Je propose" | `statut_ville_ecole='hote'`, `statut_ville_entreprise=NULL` |
| P3 | Email × Les deux | email | `'les_deux'` | 5 | radio "Les deux" | `statut_ville_ecole='hote'`, `statut_ville_entreprise='recherche'` |
| P4 | Google × Locataire | google | `'locataire'` | 3 (prenom*, nom*, tel) | radio "Je cherche" | identique P1 |
| P5 | Google × Hôte | google | `'hote'` | 3 | radio "Je propose" | identique P2 |
| P6 | Google × Les deux | google | `'les_deux'` | 3 | radio "Les deux" | identique P3 |
| P7 | Apple × Locataire | apple | `'locataire'` | 3 (prenom**, nom**, tel) | radio "Je cherche" | identique P1 |
| P8 | Apple × Hôte | apple | `'hote'` | 3 | radio "Je propose" | identique P2 |
| P9 | Apple × Les deux | apple | `'les_deux'` | 3 | radio "Les deux" | identique P3 |

\* prenom/nom Google : pré-remplis depuis `user_metadata.full_name`, modifiables.
\** prenom/nom Apple : pré-remplis depuis `user_metadata.name` à la 1ère connexion uniquement, sinon vides.

### 5.7 Redirection finale commune aux 9 parcours

Au clic "Finaliser mon inscription" en E-7 :

1. RPC `complete_inscription_alternant` exécutée (cf. section 1.5).
2. `users.profil_complet` flippé à `true` dans la transaction.
3. Redirection `navigate('/dashboard')`.
4. `OAuthHandler` ne ré-intercepte pas (route `/dashboard` hors `AUTH_CALLBACK_ROUTES`).
5. Le dashboard alternant s'affiche, l'utilisateur voit son rythme et ses options de matching.

**Pas de cas `'/dashboard/proprietaire'`** — exclu par construction (les 9 parcours sont tous alternant).

### 5.8 Tests transverses à valider en complément

En plus des 9 parcours nominaux, 7 cas transverses à tester :

| # | Cas | Procédure | Résultat attendu |
|---|---|---|---|
| T1 | Email déjà utilisé | P1 démarrage avec un email déjà inscrit | `<ErrorMessage>` en E-1 + lien "Se connecter", pas d'INSERT |
| T2 | Mot de passe trop court | P1 avec mdp 5 caractères | `<ErrorMessage>` sous mdp, pas de submit |
| T3 | Abandon en E-3 et reprise plus tard | Démarrage P1 jusqu'à E-3 saisie, fermer onglet, revenir 1h plus tard | Reprise à E-4 (E-3 OK), valeurs préservées en BDD |
| T4 | Modification arrière depuis E-7 | P3 jusqu'à E-7, clic crayon "Études" | Retour à E-3 en mode édition, valeurs pré-remplies, retour E-7 après modif |
| T5 | Refus du calendrier en E-5 | P1 jusqu'à E-5, clic "Continuer" sans calendrier | Pop-up `RhythmRequiredPopup` (cf. § 3.12), pas de progression vers E-6 |
| T6 | Apple Hide My Email | P7 avec compte Apple en mode "Cacher mon adresse" | `users.email = '*@privaterelay.appleid.com'`, flag UI local levé, pas d'erreur |
| T7 | Apple 2ᵉ connexion sans `name` | P7 démarré une 1ère fois sans terminer, retour 2ᵉ fois via Apple | E-1 avec inputs prenom/nom **vides**, l'utilisateur saisit manuellement |

### 5.9 Critères de succès / d'échec par parcours

Un parcours P_n est considéré **réussi** si et seulement si, après "Finaliser mon inscription" :

1. `public.users` contient une ligne avec `id = auth.users.id` actuel.
2. Toutes les colonnes structurantes attendues (cf. § 5.3 + variation § 5.5) sont renseignées avec les valeurs attendues.
3. `profil_complet = true`.
4. Les colonnes legacy/dépréciées (`type_alternance`, `rythme_alternance`, `ville`, `a_logement`) sont **NULL**.
5. La page `/dashboard` s'affiche correctement avec les données du nouvel utilisateur.

Un parcours est **échoué** si l'une des 5 conditions est violée. En particulier :

- Une colonne legacy à valeur non NULL est un échec (signe que du code legacy a été oublié dans le pipeline d'écriture).
- Un `profil_complet = false` après le submit final est un échec (signe que la RPC `complete_inscription_alternant` n'a pas été appelée ou a échoué silencieusement).
- Une absence d'`id` dans `public.users` est un échec (INSERT initial E-1 raté).

### 5.10 Outillage de test recommandé

Pour exécuter ces 9 + 7 = 16 tests :

- **Manuel** : tableur avec 16 lignes, 1 colonne par champ critique, 1 colonne "résultat observé" + "OK/KO". Suffisant pour la 1ère version du parcours unifié.
- **Automatisable plus tard** : Playwright ou Cypress en E2E + assertions Supabase via service role key. Hors scope de cette section (sujet potentiel de session ultérieure).

Pour le 1er passage de tests bout-en-bout (à faire en sortie de tranche 9 du plan d'implémentation, cf. section 7), un test manuel avec un compte test par méthode auth + capture d'écran de la table `users` après chaque parcours est suffisant.

---

## 6. Sujets RGPD et juridiques à signaler

### 6.1 Périmètre et positionnement

Cette section est un **index** des sujets RGPD et juridiques touchés par le chantier d'unification de l'inscription. Elle ne tranche aucune question juridique — c'est le rôle des professionnels (avocat spécialisé en droit des plateformes, DPO, conseil RGPD).

**Source unique de référence pour les RDV professionnels** : `docs/recherche/QUESTIONS-PROFESSIONNELS.md` (doc consolidé à créer en commit groupé de clôture conv 2). Chaque sujet ci-dessous est repris dans ce doc avec un identifiant `[Q-DPO-NNN]` ou `[Q-AVO-NNN]` pour traçabilité.

**Avertissement explicite** : tant que ces sujets ne sont pas validés par un professionnel, le code peut être implémenté en l'état (la plateforme n'est pas lancée, aucun utilisateur réel n'est concerné), mais **aucun lancement opérationnel ne peut intervenir** avant que les 5 sujets ci-dessous aient été passés en revue avec un avocat / DPO et que les arbitrages aient été tracés dans `QUESTIONS-PROFESSIONNELS.md`.

### 6.2 Sujet 1 — Téléphone obligatoire à l'inscription

**Champ concerné** : `users.telephone`, rendu obligatoire frontend en E-1 (Q-S1.A actée).

**Contexte** : aujourd'hui le téléphone est demandé pour le contact opérationnel en cas d'incident matching, de question contractuelle, ou pour une éventuelle vérification d'identité. C'est aussi un standard du marché (Airbnb, Le Bon Coin, Stripe Identity).

**Question à valider avec un professionnel** :

- La finalité "contact opérationnel en cas d'incident" est-elle suffisante au sens RGPD pour rendre le champ obligatoire ?
- Faut-il documenter cette finalité dans la politique de confidentialité publiée sur le site ?
- Y a-t-il un risque à ne pas envoyer de SMS de validation à l'inscription (Sterny ne le fait pas dans la 1ère version) ? Cohérence vs Stripe Identity qui valide le numéro plus tard dans le parcours utilisateur.

**Référence** : `[Q-DPO-001]` dans `QUESTIONS-PROFESSIONNELS.md`.

### 6.3 Sujet 2 — Date de naissance et validation âge ≥ 18 ans

**Champ concerné** : `users.date_naissance`, saisi en E-6, validé frontend `âge ≥ 18 ans`.

**Contexte** : la date de naissance est une donnée personnelle au sens RGPD. Sa finalité explicite chez Sterny : valider que l'utilisateur est majeur (la plateforme n'accepte pas de mineurs comme utilisateurs principaux — cf. politique produit).

**Questions à valider avec un professionnel** :

- La finalité "validation âge ≥ 18 ans" est-elle suffisante pour la collecte de la date de naissance complète, ou serait-il proportionné de demander seulement l'année de naissance (principe de minimisation) ?
- Faut-il une mention spécifique dans la politique de confidentialité ?
- Que faire si un mineur tente de s'inscrire malgré la validation frontend (ex : il saisit une fausse date) ? Y a-t-il une obligation de vérification additionnelle (ex : Stripe Identity à un moment du parcours) ?
- Conséquences si Sterny découvre a posteriori qu'un compte appartient à un mineur (suppression immédiate, notification CNIL, etc.) ?

**Référence** : `[Q-DPO-002]` et `[Q-AVO-001]`.

### 6.4 Sujet 3 — Champ `sexe` et finalité métier

**Champ concerné** : `users.sexe`, saisi en E-6, valeurs `'homme'` / `'femme'` / `'autre'`. Décision actée Q-S3.A : conservé en l'état tant que la finalité n'est pas validée par un professionnel (la plateforme n'étant pas lancée, le risque de collecte est nul tant qu'aucun utilisateur réel ne s'inscrit).

**Contexte** : ce champ est une **donnée personnelle particulièrement sensible** au sens RGPD (catégorie spéciale article 9). Sa collecte requiert une finalité métier explicite et proportionnée.

**Questions à valider avec un professionnel — priorité haute** :

- Y a-t-il une finalité métier légitime à collecter ce champ chez Sterny ? Hypothèses à examiner :
  - **Matching genré** (un locataire pourrait préférer un hôte du même sexe pour partager le logement) — hypothèse à arbitrer côté produit avant de la défendre RGPD.
  - **Statistiques agrégées** (équilibre démographique de la plateforme) — finalité plus faible, peut être satisfaite par déclaration volontaire optionnelle.
  - **Aucune finalité claire** — dans ce cas le champ doit être retiré avant lancement (principe de minimisation, le risque de conservation sans finalité documentée est élevé).
- Si la finalité retenue est "matching genré", quelle base légale ? Consentement explicite renforcé ?
- Quelles mentions obligatoires dans la politique de confidentialité ?
- Faut-il rendre le champ optionnel à terme, même si conservé pour la 1ère version ?

**Action obligatoire avant lancement** : si l'avocat / DPO ne valide pas une finalité, le champ est **retiré** du modèle E-6 et de la table `users`. Reflet en table 1.3 et toutes les sections du doc UNIFICATION + tables 5.3 et 5.5.

**Référence** : `[Q-DPO-003]` (priorité haute).

### 6.5 Sujet 4 — Apple Hide My Email et continuité de service

**Mécanisme concerné** : alias `*@privaterelay.appleid.com` que l'utilisateur Apple peut utiliser à l'inscription (cf. § 4.4.3).

**Contexte** : l'utilisateur peut choisir de cacher son vrai email. Sterny enregistre l'alias tel quel. Ses paramètres Apple ID lui permettent à tout moment de **révoquer l'alias** sans en informer Sterny — auquel cas tous les emails envoyés par la plateforme (notifications matching, demandes de réservation, factures) sont silencieusement perdus.

**Questions à valider avec un professionnel** :

- **Côté DPO / RGPD** : Sterny doit-elle informer l'utilisateur, à l'inscription, que la révocation de l'alias casse la communication avec la plateforme ? Mention dans la politique de confidentialité ? CGU ?
- **Côté avocat** : si un utilisateur perd des notifications importantes (réservation refusée, deadline contractuelle) à cause d'un alias révoqué de son côté, quelle est la responsabilité de Sterny ? Y a-t-il des clauses CGU à inclure pour limiter cette responsabilité ?
- **Côté assureur (responsabilité civile pro)** : ce risque de continuité de service doit-il être couvert ? Est-il connu et accepté par l'assureur ?

**Action recommandée pour la 1ère version** : afficher un message visible côté UI (à concevoir dans une session ultérieure) lorsque l'utilisateur utilise un alias Apple, expliquant le risque. Pas de blocage de l'inscription.

**Référence** : `[Q-DPO-004]`, `[Q-AVO-002]`, `[Q-ASS-001]`.

### 6.6 Sujet 5 — Stockage des tokens OAuth Supabase

**Mécanisme concerné** : Supabase Auth gère côté serveur le stockage des refresh tokens OAuth (Google, Apple). Côté client, le SDK `supabase-js` stocke la session active dans `localStorage` du navigateur par défaut.

**Contexte** : aucun code Sterny ne manipule directement les tokens OAuth — ils sont gérés par le SDK Supabase. Mais leur existence côté navigateur (localStorage) et côté serveur (Supabase Auth schema) crée des sujets RGPD à expliciter.

**Questions à valider avec un professionnel** :

- **Côté DPO** : Sterny est-elle responsable des tokens stockés par Supabase Auth ? Sterny est-elle co-responsable de traitement avec Supabase au sens RGPD ? Le contrat de sous-traitance avec Supabase couvre-t-il bien les obligations RGPD ?
- **Côté DPO** : faut-il mentionner explicitement le stockage de tokens dans `localStorage` du navigateur dans la politique de cookies / confidentialité ?
- **Côté avocat** : que se passe-t-il en cas de fuite des tokens (`localStorage` accessible si l'utilisateur partage son navigateur, attaque XSS) ? Quelles obligations de notification CNIL et utilisateur ?
- **Côté avocat** : en cas de demande d'effacement RGPD (article 17), comment garantir la suppression complète des tokens côté Supabase ? Est-ce que la suppression d'un compte `auth.users` purge bien les sessions associées ?

**Référence** : `[Q-DPO-005]`, `[Q-AVO-003]`.

### 6.7 Sujet bonus — Pattern de reprise d'inscription et données partielles

**Mécanisme concerné** : pattern de reprise (cf. section 2.5 et § 4.8). Un utilisateur qui abandonne en E-3 laisse en BDD une ligne `users` partielle avec `profil_complet = false` qui peut rester là indéfiniment si l'utilisateur ne revient jamais.

**Contexte** : ce sont des **données personnelles partielles non utilisées** (prenom, nom, telephone, email, type_user). Stocker des données dont la finalité est incomplète crée un risque RGPD (durée de conservation, principe de finalité).

**Questions à valider avec un professionnel** :

- **Côté DPO** : quelle durée de conservation maximale pour une ligne `users.profil_complet = false` qui n'a pas eu d'activité depuis X mois ? Faut-il un mécanisme de purge automatique ?
- **Côté DPO** : faut-il informer l'utilisateur à l'INSERT initial E-1 que ses données sont conservées même s'il abandonne le parcours ?
- **Côté avocat** : faut-il une CGU explicite acceptée à E-1 (et pas seulement à E-7) pour couvrir cette conservation partielle ?

**Action technique recommandée** : prévoir une Edge Function ou un cron Supabase qui purge les lignes `users` avec `profil_complet=false` et `created_at < now() - interval '90 days'` (durée à arbitrer avec DPO). À séquencer en post-lancement.

**Référence** : `[Q-DPO-006]`.

### 6.8 Récapitulatif et action de clôture

| # | Sujet | Champ / mécanisme | Priorité | Réf. doc QUESTIONS-PROFESSIONNELS |
|---|---|---|---|---|
| 1 | Téléphone obligatoire | `users.telephone` | moyenne | `[Q-DPO-001]` |
| 2 | Date de naissance + validation 18 ans | `users.date_naissance` | moyenne | `[Q-DPO-002]`, `[Q-AVO-001]` |
| 3 | Champ `sexe` | `users.sexe` | **haute** | `[Q-DPO-003]` |
| 4 | Apple Hide My Email | `users.email` aliasé | moyenne | `[Q-DPO-004]`, `[Q-AVO-002]`, `[Q-ASS-001]` |
| 5 | Stockage tokens OAuth | `localStorage` + Supabase Auth | moyenne | `[Q-DPO-005]`, `[Q-AVO-003]` |
| 6 (bonus) | Données partielles d'inscription abandonnée | `users.profil_complet=false` orphelins | basse mais bloquante avant lancement | `[Q-DPO-006]` |

**Action de clôture conv 2** : ces 6 sujets seront pré-remplis dans le doc consolidé `docs/recherche/QUESTIONS-PROFESSIONNELS.md` créé en commit groupé de clôture, avec les identifiants ci-dessus.

**Action de clôture du chantier UNIFICATION-INSCRIPTION** : aucun lancement opérationnel n'est envisageable avant que les 6 sujets aient été examinés et arbitrés par un avocat / DPO / assureur, avec les décisions tracées dans `QUESTIONS-PROFESSIONNELS.md`. À séquencer en parallèle de la fin de l'implémentation technique.

---

## 7. Plan d'implémentation séquencé

### 7.1 Périmètre et conventions

Le chantier d'unification de l'inscription est découpé en **9 tranches commitables** + des sous-tâches transverses non séquencées. Chaque tranche correspond à un objectif testable de bout en bout, et est pensée pour faire l'objet d'un commit atomique (ou de 2 commits qui se suivent dans la même session pour les tranches double comme T4).

**Conventions** :

- 1 tranche = 1 session Claude Code dédiée (sauf T4 qui contient 2 commits dépendants — refonte handler + adaptation proprio — à traiter dans la même session).
- Estimation de durée : "courte" (< 1h30 Claude Code), "moyenne" (1h30 à 3h), "longue" (3h à 6h).
- Validation gate Côme entre chaque tranche : diff revu visuellement, push manuel, test fonctionnel rapide en local avant d'enchaîner.
- Aucun déploiement Vercel n'intervient en cours de tranche — la branche `main` peut rester en avance sur prod tant que toutes les tranches inter-dépendantes ne sont pas commitées (cf. § 7.3.4 plan de rollback).

**Dettes connexes à séquencer en parallèle ou en post-implémentation** : DETTE #30 (listes hardcodées E-3), DETTE #44 (mobile UX globale), DETTE #54 (refonte responsive RhythmManualBuilder, prérequis bloquant T8), DETTE #55 (adaptation parcours proprio, intégrée à T4).

### 7.2 Vue d'ensemble des 9 tranches et dépendances

| Tranche | Objectif | Durée | Dépend de | Notes |
|---|---|---|---|---|
| T1 | Extraction des 17 composants partagés en `components/auth-wizard/` | moyenne 2-3h | (aucune) | tokenisation `--accent-hover`, `--error`, `--success` (DETTE #31, #53) |
| T2 | Création `InscriptionAlternantPage.jsx` from-scratch (E-1 → E-4, E-6, E-7), E-5 placeholder | longue 4-5h | T1 | configuration "Confirm email" Supabase à acter en début de tranche |
| T3 | Refonte `ChoixInscriptionPage` (3 OAuth + retrait CTA proprio) | courte 1h | T1, T2 | T2 doit exister pour pouvoir y rediriger |
| T4 | Refonte `GoogleAuthHandler.jsx` → `OAuthHandler.jsx` générique + adaptation `InscriptionProprietairePage` (DETTE #55) | moyenne 2-3h | T2 | 2 commits dans la même session, indissociables (cf. § 4.10.5) |
| T5 | Suppression `InscriptionPartagerPage` + correction lien `UserDropdown` (Q9) + durcissement garde `/inscription/proprietaire` (Q8) | courte 1h | (aucune) | peut être commit en parallèle de T1-T4 |
| T6 | Redirections 301 : `/inscription/recherche` → `/inscription/alternant` (Q3) + `/completer-profil` redirige selon `profil_complet` (Q12) | courte 30min-1h | T2, T3, T4 | sinon redirige vers du code pas prêt |
| T7 | RPC PostgreSQL `complete_inscription_alternant` + intégration submit E-7 | moyenne 2-3h | T2 | RPC SQL en migration Supabase + appel frontend |
| T8 | Refonte responsive `RhythmManualBuilder` (DETTE #54) + intégration en E-5 du wizard | longue 4-6h | T2, T7, **DETTE #54 résolue** | session dédiée pour la refonte responsive avant intégration |
| T9 | Tests bout-en-bout des 9 parcours + 7 tests transverses (cf. section 5) | moyenne 2-3h | toutes les autres | tableur de tracking + captures d'écran tables `users` |

**Diagramme de dépendances simplifié** :

```
T1 ──┬─→ T2 ──┬─→ T3 ──┐
     │        ├─→ T4 ──┼─→ T6 ──→ T9
     │        ├─→ T7 ──┘         ↑
     │        └─→ T8 ────────────┤
     │                            │
T5 (indépendant) ─────────────────┘
```

**Ordre d'exécution recommandé** : T1, T5 (en parallèle si désiré), T2, T3, T4, T7, T6, T8, T9.

**Estimation totale** : entre 19h et 28h de Claude Code, réparties sur 8 à 12 sessions étalées sur 2-3 semaines selon disponibilité de Côme et avancement de DETTE #54 en parallèle.

### 7.3 Détail tranche par tranche

#### 7.3.1 T1 — Extraction des 17 composants partagés

**Statut** : ✅ LIVRÉE le 3 mai 2026 (commit a70d69b sur main). 43 fichiers, +2284 / -2 lignes. Validation visuelle par sandbox /dev/auth-wizard-sandbox effectuée par Côme avant push.

**Objectif** : créer le dossier `sterny-react/src/components/auth-wizard/` avec les 17 composants/hooks identifiés sections 3.3 + 3.13. Tokeniser les variables CSS manquantes en `:root`.

**Fichiers créés** : 17 fichiers `.jsx` + leurs CSS scopés.
- 12 composants partagés : `AuthScreenContainer`, `WizardProgressBar`, `WizardTitle`, `WizardStepSubtitle`, `TextInput`, `TextArea`, `CustomSelect`, `AutocompleteInput`, `PrimaryButton`, `GoogleSignInButton`, `AppleSignInButton`, `OrSeparator`, `BackLink`, `PhotoCropperModal`, `useShakeButton` (hook).
- 5 spécifiques wizard : `IntentCardRadio`, `RecapBlock`, `RhythmCalendarPreview`, `RhythmRequiredPopup`, `InfoBox`.

**Fichiers modifiés** : `sterny-react/src/index.css` — ajout de `--accent-hover: #D4571F`, `--error: #dc2626`, `--success: #059669` dans `:root`.

**Critères de succès** :
- Les 17 composants compilent sans erreur (build Vite OK).
- Chaque composant a un test visuel manuel dans une page sandbox éphémère ou un Storybook minimal.
- Les variables CSS sont accessibles via `var(--accent-hover)` etc. dans tout fichier CSS.

**Plan de rollback** : `git revert <hash>` du commit T1. Aucun composant n'est encore utilisé ailleurs dans la base à ce stade, donc le revert est sans impact.

**Durée estimée** : moyenne 2-3h.

**Commit message proposé** :
```
feat(auth-wizard): extract 17 shared components for inscription unification

- 12 shared components in components/auth-wizard/ (AuthScreenContainer,
  WizardProgressBar, TextInput, CustomSelect, AutocompleteInput, etc.)
- 5 wizard-specific components (IntentCardRadio, RecapBlock, RhythmCalendarPreview,
  RhythmRequiredPopup, InfoBox)
- 1 hook (useShakeButton)
- Tokenize --accent-hover, --error, --success in index.css :root
- Resolves part of DETTE #31 and DETTE #53
- Pre-requisite for T2 (InscriptionAlternantPage from-scratch)
```

#### 7.3.2 T2 — Création `InscriptionAlternantPage.jsx` from-scratch

> **⚠️ AMENDEMENT 4 mai 2026 (conv 5)** : le découpage des sous-commits T2 acté en conv 4 (sous-commits 2/5 = E-1 méthode email + écran Vérifie ta boîte mail + INSERT initial users post-confirmation) est CADUC suite à la décision D1 (mdp en E-7). Nouveau découpage à arbitrer en démarrage conv 6. Estimation durée T2 inchangée (longue, 4-5h Claude Code) mais répartition différente. Détails dans ETAT-COURANT.md section "2026-05-04".

**Objectif** : créer la nouvelle page `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` avec la structure 7 étapes E-1 à E-7. E-5 reste placeholder (intégration RhythmManualBuilder en T8).

**Fichiers créés** : `InscriptionAlternantPage.jsx`, `InscriptionAlternantPage.css`.

**Fichiers modifiés** : `App.jsx` — ajout de la route `<Route path="/inscription/alternant" element={<InscriptionAlternantPage />} />`.

**Étapes implémentées** :
- E-1 : branchement par méthode auth (cf. § 3.5 et § 4.2/4.3/4.4), INSERT initial `users`, gestion erreur + shake bouton.
- E-2 : `IntentCardRadio` × 3, écriture `type_user`, navigation E-3.
- E-3 : `AutocompleteInput` école, `CustomSelect` année, `AutocompleteInput` filière. Listes hardcodées en l'état (DETTE #30 non couverte par cette tranche).
- E-4 : UI conditionnelle selon `type_user`, écriture des 4 colonnes ville_*.
- E-5 : `<div class="placeholder">Étape calendrier — à intégrer en T8</div>` + bouton "Continuer" temporairement no-op.
- E-6 : champs date_naissance + sexe + photo cropper + bio + InfoBox.
- E-7 : layout récap avec `RecapBlock`, mais pas encore d'appel RPC (T7 le branchera). Bouton "Finaliser" temporairement appelle un UPDATE manuel `profil_complet=true`.

**Sous-tâche en début de tranche** : configuration "Confirm email" sur le projet Supabase production (cf. § 4.2.2). Décision Côme : activé (recommandé) ou désactivé. Si activé, ajouter un écran intermédiaire "Vérifie ta boîte mail" entre E-1 submit et E-2.

**Logique de reprise au montage** : SELECT `users` WHERE `id = session.user.id`, parcours étape par étape pour détecter la 1ère étape avec un champ obligatoire vide, set `currentStep` en conséquence (cf. § 4.8).

**Critères de succès** :
- La page se monte sans erreur sur la route `/inscription/alternant`.
- Les 7 étapes sont navigables (← Précédent / Continuer →).
- Pour méthode email : signUp Supabase OK, INSERT initial users en E-1.
- Pour méthode Google/Apple : redirection externe + retour, pré-remplissage prenom/nom OK en E-1.
- L'écriture progressive en BDD à chaque clic "Continuer" fonctionne (vérifiable via Supabase Studio table `users`).
- L'écran E-5 placeholder ne bloque pas le flow (clic Continuer passe à E-6).
- Le submit E-7 (provisoire UPDATE direct) flippe `profil_complet=true` et redirige `/dashboard`.

**Plan de rollback** : `git revert <hash>`. La page `InscriptionAlternantPage` disparaît, la route 404, mais aucun parcours existant n'est cassé tant que T6 (redirections 301) n'est pas appliqué.

**Durée estimée** : longue 4-5h.

**Commit message proposé** :
```
feat(auth-wizard): create InscriptionAlternantPage with 7 steps from-scratch

- New page sterny-react/src/pages/auth/InscriptionAlternantPage.jsx
- Steps E-1 → E-4, E-6, E-7 fully implemented (E-5 placeholder, T8 will integrate)
- Auth method branching in E-1 (email signUp, Google/Apple OAuth pre-fill)
- Progressive BDD writes at each "Continuer" click (resume pattern)
- Conditional UI in E-4 based on type_user (locataire / hote / les_deux)
- Photo cropper integrated in E-6 via PhotoCropperModal
- E-7 recap with editable RecapBlocks, provisional submit (T7 will branch RPC)
- Route /inscription/alternant added in App.jsx
- Supabase "Confirm email" config decision logged separately
```

#### 7.3.3 T3 — Refonte `ChoixInscriptionPage`

**Objectif** : refondre `sterny-react/src/pages/auth/ChoixInscriptionPage.jsx` pour qu'elle ne contienne plus que les 3 boutons OAuth + le lien "Se connecter", conformément à § 3.4.

**Fichiers modifiés** : `ChoixInscriptionPage.jsx`, `ChoixInscriptionPage.css`.

**Suppressions** :
- Cartes choix `type_user` (déplacé en E-2 du wizard).
- Bouton "Je suis propriétaire" (Q8 actée).
- Toute écriture `sessionStorage.signup_type` ou `referral_token` côté handlers OAuth — les `signInWithOAuth` n'écrivent plus rien en sessionStorage.

**Ajouts** :
- 3 boutons via `<GoogleSignInButton>`, `<AppleSignInButton>`, `<PrimaryButton variant="email">` (composants T1).
- Séparateur "ou" via `<OrSeparator>`.

**Critères de succès** :
- Page `/inscription` n'affiche plus que ces 4 éléments + lien "Se connecter".
- Clic Google/Apple lance `signInWithOAuth` avec `redirectTo: '/inscription/alternant'`.
- Clic email navigue vers `/inscription/alternant` directement (E-1 méthode email s'affiche).
- Aucun sessionStorage écrit.

**Plan de rollback** : `git revert <hash>`. La page revient à son état pré-refonte. Pas de casse fonctionnelle si T2 et T4 sont en place (la page existe juste en 2 versions transitoires).

**Durée estimée** : courte 1h.

**Commit message proposé** :
```
refactor(auth): refactor ChoixInscriptionPage to 2-level layout (intent + auth method)

- Keep "Je suis propriétaire" + "Je suis étudiant en alternance" radio cards
- Add 3 OAuth buttons (Google/Apple/Email) conditional on alternant card selection
- Proprio card routes to /inscription/proprietaire (handles its own OAuth+email)
- type_user choice removed for alternant (moved to E-2 of new wizard)
- All sessionStorage writes removed (Q5 - INSERT moved to wizard E-1)
- Use shared components from auth-wizard/ (T1)
- redirectTo points to /inscription/alternant for alternant OAuth flows
```

#### 7.3.4 T4 — Refonte `OAuthHandler` + adaptation `InscriptionProprietairePage` + branchement Apple

> **⚠️ AMENDEMENT 7 mai 2026 (conv 17)** : Apple est branché en T4 (pas différé). Le bouton Apple est ajouté à `InscriptionProprietairePage` (parcours proprio) en commit 2/2 et à `ChoixInscriptionPage` en T3 (parcours alternant). Le branchement Apple inclut la configuration du provider Apple côté Supabase + push des credentials Apple Developer. Justification : (1) `OAuthHandler` est générique par construction et gère Apple sans surcoût, (2) le composant `AppleSignInButton.jsx` est déjà extrait depuis T1 (commit a70d69b), (3) différer Apple créerait une dette transitoire à brancher en 2 endroits ultérieurement.

**Objectif (commit 1/2)** : renommer `GoogleAuthHandler.jsx` → `OAuthHandler.jsx`, supprimer la logique INSERT, ajouter l'exclusion route `/inscription/proprietaire`. Le handler étant générique, aucune modif spécifique Apple n'est nécessaire dans ce commit côté composant — la configuration Apple côté Supabase Dashboard est faite en parallèle (action manuelle Côme).

**Objectif (commit 2/2)** : adapter `InscriptionProprietairePage.jsx` pour qu'elle fasse son propre INSERT au callback OAuth (DETTE #55). **Ajouter le bouton Apple OAuth** sur cette page (en plus du bouton Google qui existe déjà et de la méthode email/password qui existe déjà).

**Pourquoi 2 commits dans la même session** : commit 1 sans commit 2 casse le proprio Google + Apple en prod. Les deux doivent être poussés ensemble (window minimale, cf. § 4.10.5).

**Fichiers modifiés (commit 1)** :
- `sterny-react/src/components/GoogleAuthHandler.jsx` → renommé `OAuthHandler.jsx`. Volume passe de ~128 lignes à ~70 lignes.
- `App.jsx` : import et usage `OAuthHandler` au lieu de `GoogleAuthHandler`.
- Suppression de toute lecture `sessionStorage.signup_type`, `referrer_id`, `referral_token`, `code_parrainage`.

**Action manuelle Côme (entre commit 1 et commit 2 ou en parallèle)** :
- Supabase Dashboard → Auth → Providers → activer Apple → coller les credentials Apple Developer (Service ID, Team ID, Key ID, secret).
- Vérifier que les redirect URLs Apple incluent `https://sterny.co/auth/v1/callback` (production) et `http://localhost:5173/auth/v1/callback` si tests locaux.

**Fichiers modifiés (commit 2)** :
- `sterny-react/src/pages/auth/InscriptionProprietairePage.jsx` : (a) ajout de la logique INSERT au callback OAuth (cf. § 4.10.2), (b) suppression du `sessionStorage.signup_type='proprietaire'` côté `signInWithOAuth`, (c) ajout du bouton Apple OAuth `<AppleSignInButton>` à côté du bouton Google existant, avec `signInWithOAuth({provider: 'apple', options: {redirectTo: '/inscription/proprietaire?r=<token>', scopes: 'email name'}})`.

**Critères de succès** :
- Test parcours alternant Google : callback redirige vers `/inscription/alternant`, wizard E-1 saisit telephone, INSERT initial OK, parcours complet jusqu'à `/dashboard`.
- Test parcours alternant Apple : callback redirige vers `/inscription/alternant`, E-1 prenom/nom pré-remplis (1ère connexion) ou inputs vides (cas absent), parcours complet.
- Test parcours proprio Google avec lien `?r=<token>` valide : callback redirige vers `/inscription/proprietaire?r=<token>`, INSERT au callback avec `type_user='proprietaire'` + `parrain_id` du token, wizard proprio existant fonctionne jusqu'à fin.
- Test parcours proprio Apple avec lien `?r=<token>` valide : idem que Google avec provider apple.
- DETTE #51 (AppleAuthHandler dédié) marquée résolue par cette refonte (handler générique, pas de composant séparé Apple à créer).

**Plan de rollback** : `git revert` des 2 commits ensemble. Si revert d'un seul, casse soit alternant soit proprio. Note : si rollback nécessaire et que la config Apple Supabase est déjà active, désactiver le provider Apple dans Supabase Dashboard pour éviter qu'un utilisateur clique sur un bouton Apple qui ne fonctionne plus côté code.

**Durée estimée** : moyenne 2-3h pour les 2 commits cumulés + 30 min config Supabase Apple.

**Commit messages proposés** :

Commit 1/2 :
refactor(auth): rename GoogleAuthHandler to OAuthHandler, remove INSERT logic (Q5)
- Renamed src/components/GoogleAuthHandler.jsx → OAuthHandler.jsx
- Generic handler for Google + Apple + future OAuth providers
- Routing logic only: SELECT users + redirect based on profil_complet
- Removed sessionStorage reads (signup_type, referrer_id, referral_token)
- Removed direct INSERT users (Q5 - moved to wizard E-1)
- Excluded route /inscription/proprietaire (handled separately, cf. § 4.10)
- DETTE #51 (AppleAuthHandler dedicated) becomes obsolete
- Apple provider activation done manually via Supabase Dashboard
- Volume: 128 lines → ~70 lines

Commit 2/2 :
refactor(auth): InscriptionProprietairePage handles own OAuth callback INSERT + add Apple (DETTE #55)
- Page detects active session at mount, performs SELECT users
- INSERT users with type_user='proprietaire' + parrain_id from token
- Removes sessionStorage.signup_type='proprietaire' write
- Adds Apple OAuth button alongside existing Google button
- Required by Q5 - INSERT moved out of OAuthHandler
- Pairs with previous commit (refactor OAuthHandler) - must be deployed together

#### 7.3.5 T5 — Nettoyage routes (Q8 + Q9)

> **⚠️ AMENDEMENT 7 mai 2026 (conv 17)** : la garde sur `/inscription/proprietaire` sans token n'effectue plus de redirection 301 vers `/inscription`. Elle affiche un message d'aide explicite **sur la page elle-même**, sans redirect silencieux. Justification : préserver le contexte d'arrivée du proprio invité (URL mémorisée, lien partagé, etc.) et lui donner directement l'instruction "vérifie ton email" sur la page où il s'attendait à pouvoir s'inscrire. Cohérent avec amendement VISION §6 du même jour et reformulation de la précision 3 mai 2026.

**Objectif** : supprimer `InscriptionPartagerPage` (Q9), corriger le lien `UserDropdown` qui pointait dessus, durcir la garde sur `/inscription/proprietaire` (Q8) avec message d'aide affiché sur la page.

**Fichiers supprimés** : `sterny-react/src/pages/auth/InscriptionPartagerPage.jsx` + son CSS.

**Fichiers modifiés** :
- `App.jsx` : suppression de la route `/inscription/partager`.
- `UserDropdown.jsx` : remplacement du lien "Partager mon logement" par un nouveau CTA cohérent (à arbitrer côté Côme — peut-être "Devenir hôte" pointant vers une page d'explication post-MVP).
- `InscriptionProprietairePage.jsx` : durcissement de la garde token — si `?r=<token>` absent ou non résolu en BDD, **affichage d'un message d'aide sur la page elle-même** (pas de redirection 301), wording placeholder : "Le parcours propriétaire requiert le lien d'invitation que ton locataire t'a envoyé. Tu l'as perdu ? Demande-lui de te le renvoyer." Le wording exact est à arbitrer en T5 (tutoiement cohérent avec le reste du parcours alternant unifié).

**Critères de succès** :
- Tentative d'accès à `/inscription/partager` → 404.
- Clic "Partager mon logement" dans UserDropdown → redirection vers nouveau CTA.
- Tentative d'accès à `/inscription/proprietaire` sans token → message d'aide affiché sur la page (pas de redirect), CTA secondaire vers `/inscription` ou `/connexion` selon arbitrage UX T5.

**Plan de rollback** : `git revert <hash>`. Restaure les routes et la page.

**Durée estimée** : courte 1h.

**Commit message proposé** :
refactor(routes): remove InscriptionPartagerPage (Q9), harden /inscription/proprietaire (Q8)
- Delete sterny-react/src/pages/auth/InscriptionPartagerPage.jsx + CSS
- Remove /inscription/partager route from App.jsx
- Update UserDropdown link to point to new "Devenir hôte" CTA
- InscriptionProprietairePage: display explicit help message if no valid token (no redirect)

#### 7.3.6 T6 — Redirections 301

**Objectif** : redirection `/inscription/recherche` → `/inscription/alternant` (Q3 actée, durée 30 jours), redirection `/completer-profil` selon `users.profil_complet` (Q12).

**Fichiers modifiés** :
- `App.jsx` : ajout des `<Navigate>` ou logique de redirect.
- Optionnel : `vercel.json` avec rules de redirect 301 pour `/inscription/recherche` (préférable au React Router pour SEO).

**Comportement** :
- `/inscription/recherche` → 301 `/inscription/alternant` (toute requête).
- `/completer-profil` : si pas de session → `/connexion`. Si session + `profil_complet=true` → `/dashboard`. Si session + `profil_complet=false` → `/inscription/alternant` (le wizard prend la main avec pattern de reprise).

**Critères de succès** :
- Test direct URL `/inscription/recherche` → redirige vers `/inscription/alternant`.
- Test `/completer-profil` selon état session : redirections cohérentes.

**Plan de rollback** : `git revert <hash>`. Les anciennes URLs redeviennent accessibles — pas de casse mais incohérence avec T2 (la nouvelle page est sans entrée).

**Durée estimée** : courte 30min-1h.

**Commit message proposé** :
```
feat(routes): add 301 redirects /inscription/recherche → /alternant (Q3) and /completer-profil routing (Q12)

- /inscription/recherche redirects 301 to /inscription/alternant (Q3, 30 days)
- /completer-profil routes based on users.profil_complet:
  - no session → /connexion
  - profil_complet=true → /dashboard
  - profil_complet=false → /inscription/alternant (wizard resume)
- Pre-requisites: T2 + T3 + T4 must be in place
```

#### 7.3.7 T7 — RPC `complete_inscription_alternant` + intégration submit E-7

**Objectif** : créer la fonction PostgreSQL `complete_inscription_alternant(p_payload jsonb)` côté Supabase (cf. section 1.5), et la brancher au clic "Finaliser mon inscription" en E-7.

**Fichiers créés** : nouvelle migration Supabase dans `supabase/migrations/<timestamp>_create_complete_inscription_alternant_rpc.sql`.

**Fichiers modifiés** : `InscriptionAlternantPage.jsx` E-7 — remplacer l'UPDATE direct provisoire par un appel `supabaseClient.rpc('complete_inscription_alternant', { p_payload: {...} })`.

**Logique de la RPC** :
1. Valide la cohérence finale : toutes les colonnes structurantes sont présentes (`type_user`, `ville_ecole`, `ville_entreprise`, au moins un `statut_ville_*` non NULL, `rhythm_calendar` non vide, `date_naissance`, `prenom`, `nom`, `telephone`).
2. Si validation OK : UPDATE final + flippe `profil_complet=true` dans la même transaction.
3. Retourne succès ou code d'erreur explicite (RAISE EXCEPTION mappable côté frontend).

**Critères de succès** :
- Migration Supabase appliquée sans erreur (`supabase db push`).
- Test E-7 : clic "Finaliser" → RPC appelée → `profil_complet=true` en BDD → redirection `/dashboard`.
- Test E-7 avec données incomplètes (corruption manuelle BDD pour test) : RPC retourne erreur → frontend affiche `<ErrorMessage>`.

**Plan de rollback** : revert du commit + migration de revert pour DROP la fonction RPC. Le wizard E-7 redevient l'UPDATE direct provisoire.

**Durée estimée** : moyenne 2-3h.

**Commit message proposé** :
```
feat(rpc): add complete_inscription_alternant atomic RPC for E-7 submit

- New Supabase migration creating complete_inscription_alternant(p_payload jsonb)
- Validates all structuring columns present, then UPDATE + flip profil_complet=true
- Atomic transaction (all-or-nothing)
- Frontend E-7: replace provisional UPDATE with RPC call
- Mappable RAISE EXCEPTION codes for frontend error handling
```

#### 7.3.8 T8 — Refonte responsive `RhythmManualBuilder` + intégration en E-5

**Objectif** : refondre `RhythmManualBuilder.jsx` pour qu'il s'adapte à la card 460px du wizard (DETTE #54), puis l'intégrer en E-5 du wizard.

**Sous-tranche A — Refonte responsive RhythmManualBuilder (DETTE #54)** :
- Repenser le layout pour tenir dans 460px max-width (vs design pleine largeur actuel avec 12 colonnes mensuelles).
- Options de layout à explorer côté Côme : layout vertical avec sélecteur mois en haut, layout compact mois × semaines redimensionné, layout calendaire condensé. Décision spécifique à arbitrer en début de tranche.
- Validation visuelle desktop + mobile.

**Sous-tranche B — Intégration en E-5** :
- Remplacer le placeholder E-5 dans `InscriptionAlternantPage.jsx` par `<RhythmManualBuilder>` refondu.
- Brancher la logique de validation : pop-up `RhythmRequiredPopup` si pas de calendrier au clic "Continuer".
- Brancher l'écriture des 5 colonnes `rhythm_*` à l'UPDATE qui suit le clic "Continuer".

**Fichiers modifiés** :
- `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx` + CSS associé.
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` : E-5 placeholder remplacé.

**Critères de succès** :
- `RhythmManualBuilder` s'affiche correctement dans la card 460px desktop + mobile.
- Saisie d'un calendrier en E-5 → écriture BDD au clic Continuer → navigation E-6.
- Refus de calendrier → pop-up `RhythmRequiredPopup` affichée → blocage E-5.
- DETTE #54 marquée résolue.

**Plan de rollback** : revert le commit. E-5 redevient placeholder, le wizard ne peut plus aller jusqu'à E-7 (validation RPC échoue car `rhythm_calendar` vide). Régression fonctionnelle.

**Durée estimée** : longue 4-6h. À scinder en 2 sessions Claude Code si nécessaire (refonte responsive d'abord, intégration ensuite).

**Commit message proposé** :
```
feat(wizard): integrate refactored RhythmManualBuilder in E-5 (DETTE #54 resolved)

- Refactor RhythmManualBuilder for responsive 460px card layout
- Integrate in InscriptionAlternantPage E-5 (replacing placeholder)
- Branch RhythmRequiredPopup on missing calendar at "Continuer" click
- Write rhythm_calendar, rhythm_start_date, rhythm_end_date, rhythm_source, rhythm_import_id
- DETTE #54 resolved
```

#### 7.3.9 T9 — Tests bout-en-bout des 9 parcours + 7 tests transverses

**Objectif** : exécuter les 16 tests décrits en section 5 (9 parcours nominaux + 7 tests transverses) en mode manuel, tracker les résultats dans un tableur.

**Fichiers créés** : `docs/tests/UNIFICATION-INSCRIPTION-E2E-2026-MM-DD.md` — tableur markdown avec 16 lignes, colonnes (parcours, méthode auth, type_user, étape critique, résultat observé, OK/KO, capture d'écran liée).

**Procédure** :
- 1 compte test par méthode auth (3 comptes Google de test, 3 comptes Apple de test, ou 9 emails uniques pour la méthode email).
- Pour chaque parcours : exécution complète, capture d'écran de la table `users` après soumission (via Supabase Studio), validation des 5 critères de succès § 5.9.
- Pour chaque test transverse : reproduction, capture d'écran du résultat.

**Critères de succès** :
- 9/9 parcours nominaux passent les 5 critères.
- 7/7 tests transverses produisent le résultat attendu.
- Aucune colonne legacy à valeur non NULL après inscription.
- Tableur committé et lié dans `ETAT-COURANT.md`.

**Plan de rollback** : aucun (tests, pas de modification du code de prod).

**Durée estimée** : moyenne 2-3h pour les 16 tests + capture + tracking.

**Commit message proposé** :
```
test(unification-inscription): E2E manual validation of 9 parcours + 7 transverse tests

- All 9 nominal parcours validated (3 type_user × 3 auth methods)
- All 7 transverse tests validated (email already used, mdp short, abandon/resume,
  back-edit from E-7, calendar refused, Apple Hide My Email, Apple 2nd connection)
- Tracker docs/tests/UNIFICATION-INSCRIPTION-E2E-<date>.md committed with screenshots
- All 5 success criteria § 5.9 met for each parcours
- Chantier UNIFICATION-INSCRIPTION marked complete
```

### 7.4 Plan de rollback global

Si le chantier doit être annulé en cours, deux scénarios :

**Scénario 1 — Rollback partiel (revert d'une tranche isolée)** :
- T1, T5, T6, T9 : rollback simple, pas de dépendance forte.
- T2, T3, T7, T8 : rollback simple si la tranche est la dernière committée. Sinon, peut casser les tranches qui en dépendent.
- T4 : ne jamais reverter un seul des 2 commits T4 sans l'autre.

**Scénario 2 — Rollback global du chantier** :
- `git revert` des 9 commits dans l'ordre inverse (T9 → T8 → T7 → T6 → T5 → T4 → T3 → T2 → T1).
- Restauration de l'ancien `GoogleAuthHandler.jsx` et de l'ancien `InscriptionRecherchePage.jsx` à partir du dernier commit pré-T1.
- Aucun impact côté BDD : les colonnes structurantes étaient déjà présentes avant le chantier (cf. section 1.4).

**Critère de décision rollback global** : si plus de 3 tranches consécutives échouent en validation, ou si un arbitrage produit majeur invalide une décision actée du doc UNIFICATION (ex : Q8, Q12, Q-S2.A remises en question en cours de chantier), arrêter, reverter, refaire un cadrage en conv Claude.ai dédiée.

### 7.5 Sous-tâches transverses non séquencées

Les éléments suivants ne sont pas des tranches du chantier UNIFICATION mais doivent être traités en parallèle ou en post-implémentation :

| Sous-tâche | Priorité | Quand | Référence |
|---|---|---|---|
| Configuration "Confirm email" Supabase prod | haute | en début de T2 | § 4.2.2 |
| DETTE #30 listes hardcodées (écoles, années, filières E-3) | moyenne | session dédiée post-T9 | section 3.7 |
| DETTE #44 mobile UX globale | moyenne | session dédiée post-MVP | INVENTAIRE-PLATEFORME §9.1 |
| Politique de confidentialité + CGU | haute, bloquante avant lancement | post-validation pro section 6 | section 6 + QUESTIONS-PROFESSIONNELS.md |
| Édition profil post-inscription (`ModifierProfilPage` à concevoir) | moyenne | session dédiée post-T9 | mention § 1.2.7 + § 3.10 |
| Suppression définitive `/completer-profil` (route legacy) | basse | post-stabilisation | § 2.6 + Q12 |

### 7.6 Estimation totale et stratégie de séquencement

**Estimation cumulée** : 19h (basse, si tout va bien) à 28h (haute, avec retours d'arbitrage et reprises mineures) de Claude Code, hors validation et tests Côme.

**Stratégie de séquencement recommandée** :
- **Sprint 1** (5-7 jours) : T1 + T2 + T3. Aboutit à un parcours alternant fonctionnel sur `/inscription/alternant` mais isolé du reste de la plateforme.
- **Sprint 2** (3-5 jours) : T4 + T5 + T6. Aboutit à l'intégration complète dans la plateforme : OAuthHandler générique, anciennes routes redirigées, parcours proprio adapté.
- **Sprint 3** (3-5 jours) : T7 + T8. Aboutit à la finalisation du wizard avec submit RPC + calendrier intégré. Prérequis : DETTE #54 résolue en début de T8.
- **Sprint 4** (1-2 jours) : T9 tests E2E + corrections résiduelles + clôture.

**Parallélisme possible** : T5 peut être commit à n'importe quel moment du Sprint 1 ou 2 (pas de dépendance). Les sous-tâches transverses (DETTE #30, ModifierProfilPage) peuvent être démarrées en parallèle des sprints en sessions Claude Code distinctes.

**Validation de fin de chantier** : à la fin de T9, le doc `UNIFICATION-INSCRIPTION.md` est marqué `## Statut : implémenté` dans son intro, et les sujets RGPD section 6 deviennent la priorité opérationnelle (consultation avocat / DPO / assureur avant lancement).

---

*Document de cadrage finalisé. 7 sections produites entre le 2 mai 2026 nuit (sections 1-2 en conv Claude.ai 1) et le 3 mai 2026 (sections 3-7 en conv Claude.ai 2). Document prêt pour démarrage de l'implémentation séquencée selon le plan de la section 7.*
