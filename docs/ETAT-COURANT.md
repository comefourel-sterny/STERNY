# État courant du projet Sterny

Document vivant. Mis à jour **à chaque changement de conversation Claude.ai saturée** (règle : avant de fermer une conversation, demander à Claude de proposer une mise à jour de ce fichier, puis commit). Permet à toute nouvelle session de savoir immédiatement où on en est sans perte de contexte.

**Dernière mise à jour** : 23 avril 2026 — session matin/après-midi/soir.

---

## 1. Session en cours

**Objectif du jour** : doter le projet de 4 documents de référence (`docs/*.md` + `CLAUDE.md`) pour que les nouvelles conversations Claude démarrent briefées automatiquement, sans perte d'information ni de temps.

**Avancement** :

- ✅ `DETTE-TECHNIQUE.md` — créé hier soir, committed
- ✅ `AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — créé hier soir, **non committed** (décision volontaire)
- ✅ `CONTEXTE-PROJET.md` — créé ce matin, committed (`d17dcbf`)
- ✅ `ETAT-COURANT.md` — créé ce matin, committed
- ✅ `VISION-ARCHITECTURE.md` — créé ce matin, committed
- ✅ `CLAUDE.md` à la racine — créé cet après-midi, committed (`2e78251`), remplace l'ancien `sterny-react/CLAUDE.md` (frontend aesthetics only)
- ✅ Upload des 4 docs dans le Project Claude.ai — fait
- ⏳ **Audit esthétique** — section 10 de `CLAUDE.md` laissée en placeholder, à remplir après scan du code actuel (voir section 4 ci-dessous)

---

## 2. Dernière avancée majeure — Phase 1 du plan matching (22 avril)

Entamé hier soir à partir du document `sterny-handoff-phase1-v2.docx`.

**Réalisé** :

- **Phase 1a — Fix B1+B2+M3** : colonnes `type_alternance` et `rythme_pattern` désormais écrites dans INSERT/UPDATE de `annonces`. Commit `b5970c4`.
- **Phase 1b — Fix M2** : dates passées exclues du `matchScore` dans `RecherchePage.jsx`. Commit `dae0f26`.
- **Phase 1c — Reset BDD** : 15 annonces fakes + candidatures/favoris liés supprimés via SQL direct (Supabase SQL Editor). Base propre avec uniquement la nouvelle annonce "Mon logement" de Rennes, créée via le flow corrigé. Pas de commit (SQL direct).
- **Bypass DEV pour tester** : commit `6106f8b` (Stripe Identity). Autres bypass non-commités (modale confirmation, `validateStep`, logs `[DEBUG]`). Tous trackés dans `DETTE-TECHNIQUE.md`.

**Mis en pause** :

- Phases 1d, 1e, 1f, 1g du plan original **non faites**. Suspendues après la découverte de l'audit Zone 1 qui révèle des enjeux stratégiques plus larges (voir section 3 et 4).

---

## 3. Audit Zone 1 — problèmes découverts (22 avril soir)

L'audit backend complet (`docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md`, 644 lignes) a révélé **10 problèmes critiques backend**. Classés par niveau d'urgence :

**Catégorie A — À vérifier rapidement (risque de casse silencieuse)** :

- `annonces.proprietaire_id` lu par un trigger mais absent des migrations → notifications "candidature reçue" potentiellement cassées pour les propriétaires
- `paiements_loyer.stripe_session_id` écrit par le webhook Stripe mais absent des migrations → paiements potentiellement pas enregistrés en BDD
- Pas de dump reproductible du schéma Supabase (fichiers `remote_schema.sql` à 0 octet)

**Catégorie B — À traiter avant les démos** :

- RLS UPDATE sans `WITH CHECK` sur ~10 tables → faille sécurité (un utilisateur peut modifier ses lignes ET voler celles d'un autre)
- `delete-account` incomplet (oublie ~10 tables) → non-conformité RGPD Art. 17
- `export-data` incomplet (manque ~15 tables, lit une table fantôme) → non-conformité RGPD Art. 20
- Pièces d'identité en lecture publique dans Storage → sécurité par obscurité non conforme RGPD strict

**Catégorie C — Ménage à faire plus tard** :

- 2 tables fantômes (`documents`, `matchs`) référencées dans les Edge Functions mais jamais créées
- Doublons de policies RLS
- Code mort (`send-landing-email` probablement dormant, etc.)

---

## 4. Ce qui vient ensuite (ordre de priorité)

**Priorisation corrigée** : on écrit la vision du système cible **avant** de traiter les bugs backend. Raison : la vision clarifie ce qu'on garde, ce qu'on jette, ce qu'on modifie. Elle évite de réparer du code qu'on va supprimer. Les bugs "qui saignent silencieusement" sont indépendants de la bascule et peuvent attendre quelques jours de plus.

1. **Finir l'infrastructure de contexte** (aujourd'hui)
   - `ETAT-COURANT.md` (en cours)
   - `VISION-ARCHITECTURE.md` (le plus important des 4)
   - `CLAUDE.md` à la racine du repo
   - Upload dans Project Claude.ai + Custom Instructions

2. **Vérifications Catégorie A** (30 min, après les docs)
   - Dumper le schéma Supabase réel via `supabase db dump --linked`
   - Confirmer si `annonces.proprietaire_id` et `paiements_loyer.stripe_session_id` existent vraiment ou pas
   - Ces 2 vérifs tranchent : on saigne ou pas ?

3. **Audit Zone 2 et Zone 3** (en tâche de fond, Claude Code)
   - Zone 2 : audit frontend complet (flow utilisateur, code React)
   - Zone 3 : plan de transition détaillé vers `rhythm_calendar`

4. **Traitement Catégorie A confirmée**
   - Si les bugs sont réels, on les fixe avant de toucher à la bascule

5. **Bascule rhythm_calendar** (feuille de route issue de la Zone 3)
   - Reprise des Phases 1d à 1g du plan original avec la vision intégrée
   - Puis Phase 4 (upload-first à l'inscription)

6. **Catégorie B — conformité et sécurité** (avant démos BPI / Initiative Rennes)
   - RLS UPDATE + RGPD + Storage sécurité

7. **Catégorie C — ménage** (plus tard)
   - Tables fantômes, doublons RLS, code dormant

8. **Audit esthétique** (reporté — priorité technique d'abord)
   - Reporté après la Phase 1 matching, l'audit Zone 1 Catégorie A, et la Catégorie B conformité
   - Note importante : le dossier `sterny-react/.claude/skills/design/` contient déjà 4 fichiers design (SKILL.md, design-rules.md, component-patterns.md, generators.md) + un slash-command `commands/global.md`. Relire ces fichiers avant de lancer un audit from scratch — ils couvrent probablement déjà une bonne partie du design system
   - Objectif final : rédiger la section 10 de `CLAUDE.md` (actuellement en placeholder) en s'appuyant sur ces fichiers existants + vérification sur les pages retravaillées récemment

---

## 5. Décisions produit récentes et actées

- **Rythmes irréguliers** : les vrais plannings d'alternance sont irréguliers (exemple IUT Saint-Malo 2026/2027 : 4 groupes, 45 semaines chacun, pas de pattern régulier). `rythme_pattern '4-2'` est une fiction marketing, pas une base de matching fiable.
- **`rhythm_calendar` = source de vérité unique** : le calendrier semaine par semaine extrait du vrai document de l'alternant devient la seule base du matching. `type_alternance` et `rythme_pattern` deviennent descriptifs puis seront supprimés.
- **Upload-first à l'inscription** : le nouvel utilisateur uploade son planning scolaire en premier, pas de formulaire fastidieux. 5 minutes max pour entrer dans Sterny. Argument de vente principal.
- **Dépréciation progressive, pas suppression immédiate** : les colonnes obsolètes restent en place pendant la transition (gel fonctionnel), puis suppression propre via une migration dédiée en fin de parcours.
- **Migration de profil montante déjà en place** : `locataire` → `les_deux` et `hote` → `les_deux` via dashboard.
- **Migration de profil descendante à implémenter** : `les_deux` → `locataire` ou `hote`. Non faite. À ajouter au suivi.
- **Rapport d'audit Zone 1 non-committed pour l'instant** : décision à trancher. Probablement commit après relecture à tête reposée.

---

## 6. Rappels à ne pas oublier

**Règles de travail** :

- Workflow 2 Claudes : Claude.ai propose, Claude Code exécute. Pas mélanger les rôles.
- Avant tout commit important : vérification `cat` ou `sed` dans terminal normal, copier-coller à Claude.ai pour validation, puis commit.
- Tokens jamais en clair dans une conversation. `export VARIABLE="..."` dans terminal normal uniquement.
- Sujets réglementés (juridique, paiement, RGPD, logement, mineurs, assurance, entreprise) : consulter un professionnel qualifié avant de trancher.

**Bypass DEV actifs dans le code** (à retirer avant prod, trackés dans `DETTE-TECHNIQUE.md`) :

- `validateStep` désactivé (`return true`)
- `skipStripeIdentity = true`
- Modale de confirmation bypassée (clic → `publierAnnonce` direct)
- Logs `[DEBUG]` et `[DEBUG RENDER]` dans `CreerAnnoncePage.jsx`

**État Git** :

- Branche : `main`, à jour avec `origin/main`
- Modifs non-commitées : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV), `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (volontairement non-committed pour l'instant)

**Tâches de ménage à faire un jour calme** (non prioritaires) :

- **Copies fantômes du repo** : 5 copies existent sur le disque en plus du vrai repo Git, identifiées le 23 avril via `find /Users/comefourel -type f -name "package.json" ... grep -l "sterny"`. À traiter un jour calme : vérifier que chaque copie ne contient rien d'unique que le Git actuel n'aurait pas, puis archiver ou supprimer. Les copies sont :
  - `/Users/comefourel/Dev/sterny-old/`
  - `/Users/comefourel/Dev/sterny-come-local-13avril-23h/`
  - `/Users/comefourel/Dev/sterny-backup-avant-git/`
  - `/Users/comefourel/Desktop-backup-sterny-20260413/version-bureau-icloud/`
  - `/Users/comefourel/Library/Mobile Documents/com~apple~CloudDocs/Desktop/STERNY/sterny-react/` (iCloud)
- **Désactiver iCloud Desktop sync** : macOS synchronise le Desktop sur iCloud par défaut. Cette synchro peut créer des copies silencieuses de projets si un dossier y transite. Désactiver via Préférences Système → Apple ID → iCloud → iCloud Drive → Options → décocher "Dossiers Bureau et Documents".
- **Vérifier le workspace VS Code** : si VS Code est rouvert un jour pour débugger ou présenter du code, vérifier que le workspace pointe bien vers `/Users/comefourel/Dev/sterny/sterny-react/` et non vers une des 5 copies fantômes. Visible dans la barre de titre de VS Code ou via `File → Open Recent`. Toutes les modifications de code passent par Claude Code dans le terminal, donc VS Code n'est utilisé que pour lecture/démo — mais autant s'assurer qu'on lit la bonne version.

---

## 7. Règle de mise à jour de ce document

Avant de fermer une conversation Claude.ai saturée :

1. Demander à Claude : *"propose-moi une mise à jour de `ETAT-COURANT.md` avec ce qu'on vient de faire dans cette session"*
2. Claude fournit le diff proposé
3. Je valide ou corrige
4. Claude Code met à jour le fichier
5. Commit + push avec message `docs: update ETAT-COURANT after session [sujet]`

Cette règle garantit qu'aucune session ne se ferme sans laisser de trace.

---

*Si une étape majeure est franchie ou si le plan change significativement, mettre à jour ce document et daterla modification en tête.*
