# Questions à poser aux professionnels avant lancement Sterny

## Rôle et usage de ce document

Ce document est la source unique de référence pour préparer les rendez-vous avec les professionnels (avocat spécialisé droit des plateformes, DPO / conseil RGPD, notaire, assureur RC pro, banque / établissement de paiement, expert-comptable, développeurs partenaires) avant le lancement opérationnel de Sterny.

**Méthode** : alimenté en continu pendant les sessions de cadrage Claude.ai. Avant chaque RDV, Côme filtre par section, prépare les questions, prend les réponses dans la colonne `Réponse / décision` et met à jour le `Statut`.

**Format des entrées** : chaque question a un identifiant unique `[Q-XXX-NNN]` (XXX = type de pro : DPO, AVO, NOT, ASS, BAN, EXP, DEV) pour traçabilité depuis les autres docs (notamment `UNIFICATION-INSCRIPTION.md` section 6).

**Avertissement** : aucun lancement opérationnel de Sterny ne doit intervenir avant que les questions de priorité haute aient été examinées et arbitrées avec un professionnel compétent.

---

## 1. Avocat — droit général (contrats, immobilier, plateforme)

### 1.1 Sujets identifiés à clarifier

- Statut juridique de Sterny en tant que plateforme intermédiaire entre alternants
- Modèle contractuel du partage de logement (sous-bail ? mandat ? autre ?)
- Responsabilité de Sterny en cas de litige entre hôte et locataire
- Conditions générales d'utilisation (CGU) et conditions générales de vente (CGV)
- Clauses limitatives de responsabilité
- Répercussion d'une révision de loyer en cours de contrat (indexation annuelle IRL ou hausse) dans le modèle de partage tournant Sterny
- Modèle multi-locataires : un même logement occupé par plusieurs locataires sur des semaines distinctes qui se relaient (cf. Q-AVO-006 à 009)

### 1.2 Questions précises à poser

> **[Q-AVO-001]** Quelles sont les obligations légales de Sterny vis-à-vis de la vérification de l'âge des utilisateurs (≥ 18 ans déclaré frontend) ? Y a-t-il une obligation de vérification additionnelle (ex : pièce d'identité via Stripe Identity) ?
> **Contexte** : `users.date_naissance` collecté en E-6 du parcours d'inscription. Validation frontend uniquement.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.3.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-002]** Si un utilisateur perd des notifications importantes (réservation refusée, deadline contractuelle) à cause d'un alias Apple Hide My Email révoqué de son côté, quelle est la responsabilité de Sterny ? Y a-t-il des clauses CGU à inclure pour limiter cette responsabilité ?
> **Contexte** : Apple permet aux utilisateurs de masquer leur vrai email derrière un alias `*@privaterelay.appleid.com`. Sterny enregistre l'alias tel quel. Révocation possible côté utilisateur sans alerte à Sterny.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 4.4.3 et § 6.5.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-003]** En cas de fuite des tokens OAuth stockés en `localStorage` (attaque XSS, partage de navigateur), quelles sont les obligations de notification CNIL et utilisateur ? Que prévoir dans les CGU ?
> **Contexte** : SDK Supabase stocke par défaut la session active dans `localStorage` du navigateur.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.6.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-004]** Faut-il une CGU explicite acceptée à l'étape E-1 du parcours d'inscription (et pas seulement à E-7) pour couvrir la conservation des données partielles si l'utilisateur abandonne le parcours en cours de route ?
> **Contexte** : pattern de reprise — un utilisateur qui abandonne en E-3 laisse en BDD une ligne `users` partielle avec `profil_complet=false`.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.7.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-005]** Quand le loyer du logement augmente en cours de contrat (révision annuelle indexée — par exemple l'IRL, Indice de Référence des Loyers publié par l'INSEE qui encadre la révision annuelle d'un bail — ou hausse négociée), comment cette hausse se répercute-t-elle dans le modèle Sterny où deux alternants occupent le logement en alternance et ne paient que leurs semaines occupées ? Le contrat de partage doit-il se mettre à jour automatiquement (hausse répartie au prorata des semaines de chaque occupant), ou le locataire principal titulaire du bail la supporte-t-il seul ? Quelle clause de révision prévoir dans le contrat de sous-location / mise à disposition ?
> **Contexte** : déclencheur réel — loyer personnel du fondateur augmenté de ~3-4 €/mois en avril 2026. Sans gravité à titre individuel, mais révèle un cas non traité du modèle contractuel Sterny. Impact produit : l'échéancier de paiement (généré à la signature à partir de la date d'effet, cf. VISION §3) doit pouvoir être révisé en cours de contrat si la réponse est « mise à jour automatique ». À cadrer avant tout codage du flux contrat/paiement.
> **Référence** : VISION-ARCHITECTURE.md §3 (échéancier de paiement, date d'effet) ; recouper avec §3.1 Notaire (modèle du sous-bail).
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-006]** Quel est le régime juridique d'une sous-location où plusieurs alternants occupent successivement le même logement sur des semaines distinctes (modèle « occupants qui se relaient ») ? Conforme à la loi ALUR et au régime de la sous-location de résidence principale ? Quelles conditions (accord du propriétaire, plafond du loyer sous-loué, durée) ?
> **Contexte** : modèle multi-locataires Sterny (DETTE #93). Un logement a des semaines libres ; plusieurs locataires en prennent chacun une partie, jamais la même semaine.
> **Référence** : VISION-ARCHITECTURE.md section « Modèle multi-locataires » ; DETTE #93.
> **Statut** : à poser
> **Priorité** : **haute**
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-007]** Quand deux locataires se succèdent sur le même logement, comment se répartit la responsabilité (dégâts, état des lieux entre les deux, restitution de caution) ? Faut-il un état des lieux intermédiaire à chaque rotation ? Qui en est responsable ?
> **Contexte** : équivalent du « temps de préparation » Airbnb, mais avec enjeu juridique de responsabilité entre co-occupants.
> **Référence** : VISION-ARCHITECTURE.md section « Modèle multi-locataires » ; DETTE #93.
> **Statut** : à poser
> **Priorité** : **haute**
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-008]** Le contrat Sterny porte aujourd'hui une période continue (`contrats.date_debut`/`date_fin`), mais l'occupation réelle est faite de semaines éparpillées. Un contrat de sous-location portant sur des semaines non-continues est-il valide ? Quelle rédaction adopter (période-cadre + calendrier d'occupation annexé, ou autre) ?
> **Contexte** : le modèle stocke les semaines occupées dans un registre (DETTE #93), distinctes de la période-cadre du bail.
> **Référence** : VISION-ARCHITECTURE.md section « Modèle multi-locataires » ; DETTE #93.
> **Statut** : à poser
> **Priorité** : **haute**
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-AVO-009]** Deux locataires sur un même logement sur des semaines distinctes : faut-il deux contrats de sous-location séparés (un par locataire, en parallèle) ou un seul contrat multi-parties ? Le modèle technique suppose « 1 contrat = 1 locataire » (contrats parallèles sur une annonce). Est-ce le bon montage juridique ?
> **Contexte** : `contrats` lie 1 candidature = 1 locataire ; le multi-locataires crée plusieurs contrats sur une même annonce.
> **Référence** : VISION-ARCHITECTURE.md section « Modèle multi-locataires » ; DETTE #93.
> **Statut** : à poser
> **Priorité** : **haute**
> **Date RDV prévue** : —
> **Réponse / décision** : —

---

## 2. Avocat / DPO — RGPD et données personnelles

### 2.1 Champs collectés à finalité à clarifier

> **[Q-DPO-001]** Le téléphone (`users.telephone`) est rendu obligatoire à l'inscription pour le contact opérationnel en cas d'incident. La finalité est-elle suffisante au sens RGPD pour rendre le champ obligatoire ? Faut-il documenter cette finalité dans la politique de confidentialité ?
> **Contexte** : standard du marché Airbnb / Le Bon Coin / Stripe. Pas de validation SMS dans la 1ère version.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.2.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-DPO-002]** La finalité "validation âge ≥ 18 ans" est-elle suffisante pour la collecte de la date de naissance complète, ou serait-il proportionné de demander seulement l'année de naissance (principe de minimisation) ? Quelles conséquences si Sterny découvre a posteriori qu'un compte appartient à un mineur ?
> **Contexte** : `users.date_naissance` saisie en E-6, validée frontend âge ≥ 18 ans.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.3.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-DPO-003]** Le champ `users.sexe` est une donnée personnelle particulièrement sensible (catégorie spéciale RGPD article 9). Y a-t-il une finalité métier légitime à le collecter chez Sterny ? Hypothèses à examiner : matching genré (préférence hôte/locataire de même sexe), statistiques agrégées, aucune finalité claire. Si finalité retenue : quelle base légale et quelles mentions obligatoires ?
> **Contexte** : champ saisi en E-6, valeurs `'homme'` / `'femme'` / `'autre'`. Décision Sterny Q-S3.A : conservé en l'état tant que la finalité n'est pas validée. Si pas de finalité, retrait avant lancement.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.4.
> **Statut** : à poser
> **Priorité** : **haute**
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 2.2 Mécanismes techniques à valider (OAuth, alias Apple, tokens)

> **[Q-DPO-004]** Sterny doit-elle informer l'utilisateur, à l'inscription, que la révocation d'un alias Apple Hide My Email casse la communication avec la plateforme ? Mention dans la politique de confidentialité ? Dans les CGU ?
> **Contexte** : alias `*@privaterelay.appleid.com` révocable côté utilisateur sans alerte à Sterny.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 4.4.3 et § 6.5.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-DPO-005]** Sterny est-elle responsable des tokens OAuth stockés par Supabase Auth ? Sterny est-elle co-responsable de traitement avec Supabase au sens RGPD ? Le contrat de sous-traitance avec Supabase couvre-t-il bien les obligations RGPD ? Faut-il mentionner explicitement le stockage de tokens dans `localStorage` du navigateur dans la politique de cookies ?
> **Contexte** : aucun code Sterny ne manipule directement les tokens — gestion par SDK Supabase.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.6.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 2.3 Politique de confidentialité

> **[Q-DPO-006]** Quelle durée de conservation maximale pour une ligne `users` avec `profil_complet=false` qui n'a pas eu d'activité depuis X mois ? Faut-il un mécanisme de purge automatique ? Faut-il informer l'utilisateur à l'INSERT initial E-1 que ses données sont conservées même s'il abandonne le parcours ?
> **Contexte** : pattern de reprise — données personnelles partielles qui peuvent rester en BDD indéfiniment si l'utilisateur ne revient jamais.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.7.
> **Statut** : à poser
> **Priorité** : basse mais bloquante avant lancement
> **Date RDV prévue** : —
> **Réponse / décision** : —

> **[Q-DPO-007]** En cas de demande d'effacement RGPD (article 17), comment garantir la suppression complète des tokens côté Supabase ? Est-ce que la suppression d'un compte `auth.users` purge bien les sessions et tokens associés ?
> **Contexte** : à confirmer auprès du sous-traitant Supabase + tests de validation.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.6.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 2.4 Collecte email liste d'attente (landing)

> [Q-DPO-008] Base légale de la collecte d'emails via la landing (« Me prévenir au lancement ») : le consentement par saisie + clic suffit-il, ou faut-il une case à cocher / formulation dédiée ?
> [Q-DPO-009] Mention d'information minimale à afficher au point de collecte (responsable de traitement = entité Sterny, finalité, durée, droits, contact) ? Lien vers politique de confidentialité suffisant ou mention in-situ ?
> [Q-DPO-010] Durée de conservation d'un email de liste d'attente non converti ? Purge automatique ? Suppression à la création de compte (déduplication) ?
> [Q-DPO-011] Finalité strictement « prévenir du lancement », ou réutilisation marketing possible ? Consentement distinct par finalité ?
> [Q-DPO-012] Désinscription / retrait du consentement (lien dans l'email) + suppression complète y compris chez le sous-traitant Resend ?
> [Q-DPO-013] Régularisation du stock d'emails déjà collectés (possiblement sans mention conforme) : information a posteriori, base légale, ou suppression ? Faut-il suspendre/ajuster la collecte en attendant ?

---

## 3. Notaire — baux et formalités logement

### 3.1 Modèle juridique du sous-bail / partage de logement

Sujets à clarifier en RDV. Aucune question formelle encore rédigée — à compléter au fur et à mesure des sessions de cadrage produit qui toucheront au modèle contractuel.

### 3.2 Formalités contractuelles obligatoires

À compléter.

---

## 4. Assureur — RC pro et couvertures plateforme

### 4.1 Couverture Sterny en tant que plateforme intermédiaire

> **[Q-ASS-001]** Le risque de continuité de service lié à Apple Hide My Email (alias révoqué silencieusement, notifications critiques perdues) doit-il être couvert par la RC pro Sterny ? Est-il connu et accepté par l'assureur ?
> **Contexte** : Sterny n'est pas alertée si l'utilisateur révoque son alias Apple — perte silencieuse de communication.
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.5.
> **Statut** : à poser
> **Priorité** : moyenne
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 4.2 Conseil sur les couvertures recommandées aux utilisateurs

À compléter (assurance habitation des hôtes, couverture des locataires en alternance, etc.).

---

## 5. Banque / établissement de paiement (Stripe, PSD2)

### 5.1 Conformité Stripe Identity et SEPA

À compléter.

### 5.2 Statut juridique des flux financiers

À compléter.

---

## 6. Expert-comptable — statut entreprise et fiscalité

### 6.1 Forme juridique

À compléter.

### 6.2 TVA et obligations déclaratives

À compléter.

---

## 7. Développeur — relecture technique et architecture

### 7.1 Rôle de cette section

Permet à Côme de présenter rapidement (5-10 minutes) les choix structurants techniques de Sterny à un développeur rencontré (meetup, recommandation, freelance pressenti) pour recueillir un avis externe et identifier d'éventuelles faiblesses non vues. Sert aussi de base si le développeur participe ultérieurement à un audit ou contribue à la plateforme.

### 7.2 Stack technique et hébergement

> **[Q-DEV-001]** Sterny est construit sur React + Vite hébergé Vercel, backend Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno/TypeScript), paiement Stripe SEPA, Mapbox, parser IA via Anthropic API. Cette stack te paraît-elle cohérente pour une plateforme de logement à enjeu modéré (centaines à milliers d'utilisateurs simultanés cible 1ère année) ?
> **Sous-questions** :
> - Vois-tu un risque de vendor lock-in problématique ?
> - Le choix Edge Functions Deno (vs Cloud Functions classiques) te paraît-il pertinent pour les charges actuelles ?
> - Les coûts cumulés de cette stack te semblent-ils raisonnables au regard du scope ?
> **Référence** : `CONTEXTE-PROJET.md` §4.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.3 Architecture d'authentification

> **[Q-DEV-002]** Le parcours d'inscription Sterny converge vers un wizard 7 étapes unifié `/inscription/alternant` quelle que soit la méthode d'auth (email, Google, Apple). Un seul handler générique `OAuthHandler` gère le routage post-callback OAuth. Tous les INSERT en BDD sont faits par les pages elles-mêmes, jamais par le handler. Cette refonte te paraît-elle saine ou tu vois un risque ?
> **Sous-questions** :
> - Y a-t-il une race condition possible entre callback OAuth et écriture initiale BDD ?
> - Le pattern de reprise (utilisateur revient finir son inscription plus tard) est-il bien géré ?
> - Le cas particulier proprio (route `/inscription/proprietaire` exclue du handler) est-il pertinent ou y a-t-il une approche plus propre ?
> **Référence** : `UNIFICATION-INSCRIPTION.md` sections 4 et 5.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.4 Modèle de données et matching

> **[Q-DEV-003]** Le matching Sterny repose sur un champ `users.rhythm_calendar` jsonb (tableau de semaines `[{week_start, status}, ...]`) qui décrit le rythme réel de l'alternant extrait de son emploi du temps scolaire. La table `users` a 51 colonnes. Le modèle te paraît-il extensible ou tu vois des limites à court terme ?
> **Sous-questions** :
> - Le choix jsonb plutôt qu'une table relationnelle dédiée `rhythm_weeks` te paraît-il bon ?
> - Y a-t-il un risque sur les performances de matching à grand volume (10k+ utilisateurs) ?
> - La table 1.3 des 8 cas (`statut_ville_*`, `type_user`) te paraît-elle robuste ou y a-t-il une représentation plus propre ?
> **Référence** : `VISION-ARCHITECTURE.md` §1, §3 et `UNIFICATION-INSCRIPTION.md` section 1.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.5 Parser IA d'emploi du temps

> **[Q-DEV-004]** L'argument de vente principal de Sterny dépend du parser de l'emploi du temps (extraire le calendrier réel semaine par semaine depuis un PDF/image). Le parser actuel (LLM vision) est non fiable. Une recherche structurée en 5 axes est en cours (vectorial PDF extraction via pdf.js, OCR cloud, Florence-2, Surya/Marker, etc.). Tu connais des techniques alternatives qu'on n'aurait pas explorées ?
> **Sous-questions** :
> - Faudrait-il considérer une étape OCR + post-processing manuel guidé plutôt que tout-IA ?
> - Y a-t-il des bibliothèques Deno-compatibles que tu connais et qu'on aurait ratées ?
> - Le coût d'un fallback "saisie manuelle assistée" te paraît-il acceptable produit ?
> **Référence** : `PARSER-AXE-1-ETAT-DE-L-ART.md`, DETTE #37.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.6 Sécurité et RGPD côté tech

> **[Q-DEV-005]** La sécurité Sterny repose sur Row Level Security (RLS) Supabase, Auth schema séparé de `public.users`, tokens OAuth gérés par SDK Supabase (`localStorage`). Y a-t-il des trous évidents que tu vois dans cette configuration ?
> **Sous-questions** :
> - As-tu une expérience RLS Supabase à grande échelle ? Quels pièges ?
> - Le stockage `localStorage` des tokens te paraît-il acceptable ou faut-il basculer sur cookies httpOnly ?
> - Le mécanisme de purge des données personnelles partielles (utilisateurs `profil_complet=false`) est-il un sujet que tu as déjà traité ?
> **Référence** : `UNIFICATION-INSCRIPTION.md` § 6.6 et § 6.7.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.7 Performance, scaling, et coûts

> **[Q-DEV-006]** Sterny anticipe : coûts API Anthropic (parser IA), cache SHA-256 des plannings parsés, rate limiting par utilisateur, plan Supabase actuel. À quel volume d'utilisateurs penses-tu qu'on rencontrera des limites concrètes (latence, coûts, infra) ?
> **Sous-questions** :
> - Quelles métriques surveiller en priorité depuis le jour 1 ?
> - Quand basculer du plan Supabase actuel à un tier supérieur ?
> - Le cache SHA-256 par fichier d'emploi du temps te paraît-il une bonne stratégie de réduction des coûts API ?
> **Référence** : `VISION-ARCHITECTURE.md` §7 (risques 2 et 3).
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

### 7.8 Dette technique consciente

> **[Q-DEV-007]** Sterny suit ses dettes techniques dans `DETTE-TECHNIQUE.md` (bypass DEV, refontes en attente, cas non couverts). Selon toi, quelles dettes prioriser avant lancement vs après ?
> **Sous-questions** :
> - DETTE #46 (multi-années), DETTE #47 (refonte barre recherche), DETTE #48 (matching partiel) : quel ordre te paraît juste ?
> - Y a-t-il un type de dette que tu vois souvent négligé chez les projets early-stage et qu'on aurait raté ?
> **Référence** : `DETTE-TECHNIQUE.md`.
> **Statut** : à poser
> **Date RDV prévue** : —
> **Réponse / décision** : —

---

## 8. Sujets transversaux à arbitrer en équipe pluridisciplinaire

Réservé aux sujets qui nécessitent une décision conjointe entre plusieurs catégories de professionnels (ex : matching partiel + garantie de couverture qui touche produit + juridique + assureur). À alimenter au fur et à mesure des sessions de cadrage.

---

## 9. Suivi

| Identifiant | Sujet | Section | Priorité | Statut | Date RDV |
|---|---|---|---|---|---|
| Q-AVO-001 | Vérification âge utilisateurs | 1 | moyenne | à poser | — |
| Q-AVO-002 | Responsabilité Apple Hide My Email | 1 | moyenne | à poser | — |
| Q-AVO-003 | Fuite tokens OAuth + obligations CNIL | 1 | moyenne | à poser | — |
| Q-AVO-004 | CGU à E-1 vs E-7 (données partielles) | 1 | basse | à poser | — |
| Q-AVO-005 | Révision loyer en cours de contrat | 1 | moyenne | à poser | — |
| Q-AVO-006 | Régime sous-location multi-occupants (ALUR) | 1 | **haute** | à poser | — |
| Q-AVO-007 | Responsabilité entre co-occupants successifs | 1 | **haute** | à poser | — |
| Q-AVO-008 | Bail sur semaines non-continues | 1 | **haute** | à poser | — |
| Q-AVO-009 | Un contrat par locataire vs multi-parties | 1 | **haute** | à poser | — |
| Q-DPO-001 | Téléphone obligatoire — finalité | 2 | moyenne | à poser | — |
| Q-DPO-002 | Date de naissance — minimisation | 2 | moyenne | à poser | — |
| Q-DPO-003 | Champ sexe — finalité métier | 2 | **haute** | à poser | — |
| Q-DPO-004 | Apple Hide My Email — info utilisateur | 2 | moyenne | à poser | — |
| Q-DPO-005 | Tokens OAuth — co-responsabilité Supabase | 2 | moyenne | à poser | — |
| Q-DPO-006 | Données partielles — durée conservation | 2 | basse mais bloquante | à poser | — |
| Q-DPO-007 | Effacement RGPD article 17 — purge tokens | 2 | moyenne | à poser | — |
| Q-ASS-001 | Risque continuité Apple Hide My Email | 4 | moyenne | à poser | — |
| Q-DEV-001 | Stack technique cohérence | 7 | — | à poser | — |
| Q-DEV-002 | Architecture authentification | 7 | — | à poser | — |
| Q-DEV-003 | Modèle de données et matching | 7 | — | à poser | — |
| Q-DEV-004 | Parser IA emploi du temps | 7 | — | à poser | — |
| Q-DEV-005 | Sécurité et RGPD côté tech | 7 | — | à poser | — |
| Q-DEV-006 | Performance, scaling, coûts | 7 | — | à poser | — |
| Q-DEV-007 | Dette technique priorisation | 7 | — | à poser | — |

---

*Document créé le 3 mai 2026 en clôture de la conv Claude.ai 2 sur le chantier UNIFICATION-INSCRIPTION. Alimenté en continu par les sessions de cadrage Claude.ai. Sections 3, 5, 6 et 8 à étoffer au fur et à mesure des sessions ultérieures.*
