# État courant du projet Sterny

Document vivant. Mis à jour **à chaque changement de conversation Claude.ai saturée** (règle : avant de fermer une conversation, demander à Claude de proposer une mise à jour de ce fichier, puis commit). Permet à toute nouvelle session de savoir immédiatement où on en est sans perte de contexte.

**Dernière mise à jour** : 24 avril 2026 soir — après incident Resend (rotation clé n°2) et clôture phase code d'Action A2 (Edge Function parse-school-calendar en version 5 prod, test curl reporté à la session suivante).

---

## 0. Session du 24 avril soir — Action A2 code (parser rhythm_calendar) + incident Resend n°2

**Contexte** : session dédiée au chantier central rhythm_calendar, ouverte avec les 4 docs de référence chargés. Objectif initial : audit du parser + ajout support PDF + test sur 2 plannings réels. Le test curl n'a pas été fait dans la session (clôturée pour cause de fatigue après 3h de travail), mais toutes les modifications code ont été faites, vérifiées, déployées en prod v5.

**Ce qui a été fait** :

- ✅ **Audit complet de l'état du chantier rhythm_calendar** : backend prêt à 95% (Edge Function déployée depuis le 21 avril en version 4, table `rhythm_imports` avec RLS + FK + index, colonnes `users.rhythm_calendar` et `users.rhythm_import_id` en place), frontend non branché (0 appel aux tables côté `sterny-react/`). Surprise positive : la fonction `matchScore` dans `RecherchePage.jsx` est déjà alignée sur la vision cible (dates ISO + `disponibilites_pattern`), pas de refactor moteur nécessaire, uniquement changement de source des inputs.
- ✅ **Dimensionnement du chantier complet** : 10 pages frontend à refactoriser pour supprimer les colonnes dépréciées (`rythme_pattern`, `type_alternance`, `rythme_alternance`), ~40 occurrences dispersées, concentration sur `RecherchePage.jsx` et `CreerAnnoncePage.jsx`. Estimation 10-14 sessions pour boucler le chantier (Blocs A-E).
- ✅ **Action A2 — phase code** : 3 fichiers modifiés dans `supabase/functions/parse-school-calendar/` :
  - `index.ts` : `application/pdf` ajouté à `ALLOWED_MIME_TYPES`, `MIME_TO_EXT` étendu, `MAX_FILE_SIZE` passé de 10 à 20 MB uniforme
  - `providers/anthropic.ts` : branchement dynamique `type: "document"` pour PDF / `type: "image"` pour images selon `mimeType`, `max_tokens` passé de 32000 à 8000
  - `prompts/school-calendar-v1.ts` : règle explicite ajoutée "les alternants n'ont pas de vacances scolaires, statut par défaut = company"
- ✅ **Bucket Supabase Storage `rhythm-documents`** : File size limit passé à 20 MB, `application/pdf` déjà dans la liste MIME autorisée (vérification dashboard, capture sauvegardée). Bucket privé confirmé (non-public), cohérent RGPD.
- ✅ **Redéploiement Edge Function** : `supabase functions deploy parse-school-calendar --project-ref rkffpmuhyvwwgfbdqmqr` lancé avec succès, version 5 en prod (script 82.24 kB).
- ✅ **2 plannings réels de test en place** dans `test-plannings/` (dossier gitignoré car données personnelles) :
  - `Planning_Martin.JPG` (222 Ko) : IUT Saint-Malo, BUT 3 GEA 2026-2027, 4 groupes (G1 CG2P, G2 GC2F, G3 GEMA LOG, G4 GEMA MD), 45 semaines, format tableau semaine par semaine avec couleurs jaune/vert
  - `Planning_Mathis.pdf` (180 Ko) : format calendrier annuel 12 colonnes de mois, tous les jours en lignes, format dense type Hyperplanning
  - Les 2 formats sont radicalement différents → combo idéal pour stresser le parser
- ✅ **Rotation clé Resend n°2 en 24h** après incident : la clé `Onboarding` créée le 23 avril a été exposée par inadvertance dans le terminal (confusion au copier-coller dans Apple Notes entre tokens `sbp_` Supabase et clés `re_` Resend). Clé révoquée sur dashboard Resend, nouvelle clé créée avec même scope (Sending access), secret `RESEND_API_KEY` mis à jour côté Supabase via `supabase secrets set`, test end-to-end confirmé (email de confirmation d'alerte reçu depuis sterny.co).

**Décisions produit actées** :

1. **Les alternants n'ont pas de vacances scolaires** : recherche web confirme qu'ils sont salariés (5 semaines de congés payés posés avec accord employeur, pas de calendrier des vacances scolaires). Le modèle binaire `school` / `company` du `rhythm_calendar` est donc fidèle à la réalité et doit rester tel quel. Logué dans VISION-ARCHITECTURE section 3.
2. **Mécanique d'ajustement manuel par l'hôte** : lors de la création d'annonce, `disponibilites_pattern` est pré-calculé automatiquement depuis le `rhythm_calendar` croisé avec la ville du logement, puis l'hôte peut modifier manuellement la liste (retirer des semaines où il reste chez lui, ajouter celles où il rentre chez ses parents). Cohérent avec le principe général de VISION section 4 : "la donnée automatique est une suggestion, l'utilisateur tranche". Logué aussi dans VISION-ARCHITECTURE section 3.
3. **Upload accepté : PDF + images**. Xlsx, docx, liens iCal hors-scope au moins pour la v1.
4. **Taille max uniforme à 20 Mo** pour PDF comme images. Simplifie l'UX.

**Ce qui n'a PAS été fait dans cette session** :

- ❌ **Test curl sur Planning_Martin.JPG et Planning_Mathis.pdf** : reporté à la prochaine session (fatigue à minuit). Le test est l'étape la plus importante pour valider le prompt LLM sur des vrais plannings — il faut y arriver frais.
- ❌ **Analyse du rapport de parsing** : groupes détectés, cohérence des dates ISO du lundi, qualité de l'extraction des semaines, présence de statuts hors `school`/`company`. À faire en même temps que le test curl.

**Ajustements à retenir pour la prochaine session** :

1. **Token Supabase** : garder à portée de main, préfixe `sbp_`, ne pas confondre avec la clé Resend (préfixe `re_`). Le tableau des préfixes ajouté dans CONTEXTE-PROJET section 7 sert de rappel.
2. **USER_JWT pour test curl** : récupérable via console DevTools de sterny.co avec la commande `copy(JSON.parse(localStorage.getItem('sb-rkffpmuhyvwwgfbdqmqr-auth-token')).access_token)` qui copie directement le token dans le presse-papiers. Plus rapide que la sélection manuelle dans Local Storage.
3. **Classement sécurité des commandes** : nouvelle règle projet — avant toute demande de copier-coller de terminal, Claude doit classer explicitement le risque (🔒 sensible / ⚠️ possible / ✓ propre). Documenté dans CONTEXTE-PROJET section 6.

**Plan de démarrage de la prochaine session (Action A2 — phase test)** :

1. Export `SUPABASE_ACCESS_TOKEN` + `USER_JWT` dans le terminal
2. Relance Claude Code dans la racine du repo avec un prompt de test curl sur Planning_Martin.JPG
3. Lecture du rapport JSON : groupes détectés, dates des 5 premières semaines, cohérence des lundis, statuts uniquement `school`/`company`
4. Si parsing Martin OK : même test sur Planning_Mathis.pdf (format plus dense, stress test)
5. Si parsing Mathis OK : Action A2 close, commit de fin d'Action A2 avec message "test(parser): validated on real plannings Martin JPG + Mathis PDF"
6. Enchaînement sur Bloc B : composants UI (`FileUpload` + `RhythmCalendar` visuel) — ouverture d'une nouvelle conversation Claude.ai pour partir sur une base fraîche

**Commits de la session du 24 avril soir** (à venir une fois les commits de clôture poussés) :
- 1 commit atomique `chore(gitignore): ignorer dossier test-plannings (données personnelles)`
- 1 commit principal `feat(parser): add PDF support + vacation rule + tune max_tokens in parse-school-calendar` avec les 3 fichiers Edge Function + 3 fichiers docs

**Modifs non-commitées volontairement conservées locales** (inchangé depuis session précédente) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans DETTE-TECHNIQUE
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A, en attente de relecture à tête reposée

---

## 0. Session du 24 avril — Action 2 close (chantier email alertes)

**Objectif tenu** : remettre au propre le flow d'envoi des emails de confirmation d'alerte, après l'incident Resend du 23 avril (clé leakée et révoquée). La plateforme envoie à nouveau ses emails d'alerte, via un chemin unique, propre et mobile-ready.

**Ce qui a été fait** :

- ✅ **DROP du trigger `on_new_alerte` + fonction `handle_new_alerte`** en prod via Supabase SQL Editor (chemin cassé avec clé Resend révoquée en dur). Snapshot rollback créé dans `supabase/_rollback/handle_new_alerte_snapshot.sql` (local uniquement, gitignoré). Table `alertes` accepte à nouveau les INSERTs (ils rollback-aient probablement depuis le 23 avril soir à cause du trigger cassé).
- ✅ **Test de bout en bout de la clé Resend** via curl direct sur l'Edge Function `send-alert-email`. Confirmation que : la nouvelle clé créée hier est bien configurée dans le secret Supabase, le domaine `sterny.co` est bien vérifié dans Resend Domains, les 6 Edge Functions Resend (`send-alert-email`, `send-landing-email`, `send-proprietaire-invitation`, `send-recu-paiement`, `send-fin-bail-email`, `send-relance-impaye-email`) ont toutes accès à la clé.
- ✅ **Audit exhaustif des chemins d'insertion dans la table `alertes`** côté frontend. 4 chemins identifiés, 2 couverts correctement par un `supabaseClient.functions.invoke('send-alert-email')` (`PasswordGate.jsx`, `RecherchePage.jsx`), 2 non couverts (`CreerAlertePage.jsx`, `DashboardLocatairePage.jsx` branche CREATE).
- ✅ **Découverte** : le 2e trigger `send-alert-on-insert` sur `public.alertes` appelait bien l'Edge Function `send-alert-email`, mais avec un body `{}` vide en dur dans sa définition (`supabase_functions.http_request(url, 'POST', headers, '{}', '5000')`). Donc **aucun email d'alerte n'a jamais été envoyé via ce trigger depuis sa création**. La couverture email reposait uniquement sur les appels frontend existants, qui eux-mêmes ne couvraient que 2 des 4 chemins d'insertion. Résultat : alertes créées depuis `DashboardLocatairePage` ou `CreerAlertePage` = aucun email.
- ✅ **Suppression des pages orphelines** `CreerAlertePage.jsx` + `ModifierAlertePage.jsx` + leurs CSS + les 2 routes dans `App.jsx` (commit `4579927`). Aucun lien UI ne menait à ces pages (grep exhaustif sur `to=`, `href=`, `navigate()` incluant variantes single-quote et backtick : 0 match). Création/modification d'alerte centralisée dans `PasswordGate`, `RecherchePage` et la modale de `DashboardLocatairePage`.
- ✅ **Fix de l'invoke `send-alert-email`** dans `DashboardLocatairePage.jsx` branche CREATE (commit `ea8a3ba`). Pattern aligné sur `RecherchePage.jsx` : check d'erreur sur l'insert (`insertError` pour éviter le shadow du catch externe), puis invoke dans un try/catch interne avec `console.warn` si l'email échoue (l'alerte reste créée en BDD, l'email est traité comme non-bloquant). Build vérifié à chaque étape.
- ✅ **DROP du trigger `send-alert-on-insert`** en prod via Supabase SQL Editor. Snapshot rollback créé dans `supabase/_rollback/send_alert_on_insert_snapshot.sql`. Table `alertes` n'a plus AUCUN trigger actif.
- ✅ **Test end-to-end depuis l'UI** sur la page recherche : alerte créée, email de confirmation reçu, aucun warning en console, message UX correct.

**Décision produit actée** :

- **L'architecture des appels email passe de "trigger SQL" à "invoke frontend explicite"**, aligné avec l'arrivée de l'app mobile native (le même SDK Supabase existe en Swift, Kotlin, React Native, Flutter — l'invoke est trivialement dupliquable). Mise à jour de `VISION-ARCHITECTURE.md` section 8 pour refléter que l'app mobile est différée et non dépriorisée.

**Chantiers restants non traités aujourd'hui (logués en DETTE)** :

- DETTE #16 : design des 6 templates email Resend à refondre (non prioritaire, après ops techniques).
- DETTE #17 : 5 Edge Functions présentes en local mais non déployées en prod (dont `send-landing-email` qui est appelée par le frontend mais renvoie 404).
- DETTE #18 : audit des autres triggers SQL qui font des appels HTTP sortants (candidat : `trg_notif_candidature`, voir DETTE #14).

**Tâches non urgentes à planifier** :

- Intégration de **Sign in with Apple** (Apple Developer account déjà actif, reste flow OAuth frontend + config Supabase). Important pour la cible alternants (forte proportion d'utilisateurs iOS).
- Intégration de **Google OAuth en mode production** (actuellement en "testing"). Passage en production nécessite une vérification Google qui prend ~3 semaines et impose de retirer temporairement le logo Sterny du consent screen ou de le faire certifier. À planifier suffisamment à l'avance du lancement.
- Objectif commun : friction minimale à l'inscription, aligné avec le principe "5 minutes max pour entrer dans Sterny" de `VISION-ARCHITECTURE.md` section 4.

**Commits de la session du 24 avril (tous poussés sur `origin/main`)** :

- `4579927` chore(alerte): supprimer pages orphelines CreerAlertePage + ModifierAlertePage
- `ea8a3ba` fix(dashboard): invoquer send-alert-email après création d'alerte
- `659ba3d` docs: close Action 2 (chantier email alertes) — MAJ ETAT-COURANT, DETTE, VISION
- `3474de9` chore(gitignore): ignorer supabase/_rollback snapshots locaux

Pour vérifier l'état réel de la branche à tout moment : `git log --oneline -6` et `git log --oneline origin/main..HEAD`. Ne pas se fier à des descriptions d'état Git en markdown, qui deviennent obsolètes dès le commit suivant.

**Modifs non-commitées volontairement conservées locales** :

- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A du 23 avril, en attente de relecture à tête reposée

**Snapshots rollback locaux** (dossier `supabase/_rollback/`, gitignoré via pattern `_rollback/` dans `.gitignore` racine) :

- `handle_new_alerte_snapshot.sql` (filet pour le DROP du matin du 24 avril)
- `send_alert_on_insert_snapshot.sql` (filet pour le DROP de l'après-midi du 24 avril)

**Plan de démarrage de la prochaine session** :

Les 4 commits du 24 avril sont pushés, rien à faire côté Git. Deux pistes au choix selon l'énergie et le temps disponible :

1. Reprendre la feuille de route originelle : audit Zone 2 (frontend complet) + Zone 3 (plan de transition détaillé vers `rhythm_calendar`), puis bascule `rhythm_calendar`.
2. À défaut ou en parallèle : Catégorie B de l'audit Zone 1 (RLS UPDATE, delete-account incomplet, export-data incomplet, Storage sécurité pièces d'identité) avant les démos BPI / Initiative Rennes.

---

## 1. Session du 23 avril soirée et fin de soirée — Catégorie A + incident Resend + nettoyage historique Git

**Ce qui a été fait** :

- ✅ **Catégorie A de l'audit Zone 1 close**. 3 dumps du schéma Supabase distant générés et versionnés (commit `6b0a8f8`, ex-`6460ab0` avant réécriture d'historique). Vérifications sur les 2 colonnes suspectes : `annonces.proprietaire_id` confirmé absent (vraie dette, loguée DETTE #14), `paiements_loyer.stripe_session_id` confirmé présent (faux positif, dette de traçabilité loguée DETTE #15).
- ✅ **Dette DETTE #14 et #15** loguées (commit `00dba49`, ex-`ea6ccaf` avant réécriture) après revert (`f42cb2f`, ex-`1ce1789`) d'un commit fautif (`231e781`, ex-`01fc76e`) qui avait embarqué des bypass DEV de CreerAnnoncePage.jsx — l'historique public garde la trace des 3 commits pour pédagogie.
- ✅ **Incident Resend** : GitGuardian a détecté la clé Resend `Onboarding` (préfixe `re_dYZ...`) dans `supabase/remote_schema.sql` (commit `6b0a8f8`, ex-`6460ab0` avant réécriture). La clé était en dur dans la fonction Postgres `handle_new_alerte` ligne 58. Révoquée immédiatement via dashboard Resend. Nouvelle clé `Onboarding` créée avec même scope (Sending access), stockée dans la note Apple Notes verrouillée. **La clé révoquée évacuée de l'historique Git via Action 1 (filter-repo + force-push).**
- ✅ **Règles Git anti-erreur + check-list secrets pré-commit** ajoutées dans CONTEXTE-PROJET.md section 6 et dans CLAUDE.md racine (commit `210cd48`, ex-`b16918a` avant réécriture). Couvre : interdiction `commit -a/-am`, obligation `git diff --staged --stat` pré-commit, rappel que `git revert` et `git checkout <commit>` touchent le working tree + index, check-list secrets élargie (Supabase/Anthropic/Resend/Stripe/Mapbox/Google), règle de manipulation de secrets dans les conversations.
- ✅ **Action 1 — Nettoyage de l'historique Git CLOSE** (23 avril fin de soirée). Outil utilisé : `git filter-repo` 2.47.0 installé via Homebrew. 1 seul commit à réécrire (ex-`6460ab0`), fichier de remplacement créé hors du repo (`~/.git-replacements-sterny.txt`), réécriture de 7 commits (de ex-`6460ab0` à ex-`7df44d9`), les commits antérieurs gardent leurs SHA d'origine. Force-push avec `--force-with-lease` après fetch de vérification. 0 match de la clé complète (30+ caractères) dans l'historique post-réécriture. Backup local du repo conservé dans `/Users/comefourel/Dev/sterny-backup-before-filter-repo-20260423-2326` (620Mo) — à supprimer dans 24-48h si tout tourne normalement.

**Ce qui n'a PAS été fait (reporté à la prochaine session)** :

- ❌ **Refactor du trigger `handle_new_alerte`** vers une Edge Function dédiée (option A validée en session). Actuellement le trigger ne fonctionne plus (clé révoquée), donc aucun email de confirmation d'alerte ne part. À prioriser en début de prochaine session. Impliqué : création d'une Edge Function `send-alerte-confirmation` qui lit `RESEND_API_KEY` depuis les secrets Supabase, configuration de la nouvelle clé dans les secrets, modification du trigger pour appeler l'Edge Function ou suppression complète du trigger au profit d'un appel direct depuis le frontend / Edge Function d'inscription.
- ❌ **Domaine expéditeur à harmoniser** : la fonction actuelle envoie depuis `onboarding@resend.dev` (domaine de test Resend) au lieu d'un domaine Sterny vérifié. À traiter au moment du refactor. À noter : vérifier si `sterny.co` est déjà configuré dans Resend Domains, sinon le faire.

**Plan de démarrage de la prochaine session** :

1. **Action 2** : refactor trigger `handle_new_alerte` → Edge Function `send-alerte-confirmation` (30-45 min)
2. **Action 3** : configuration du domaine expéditeur `sterny.co` dans Resend si pas déjà fait
3. **Action 4** : reprise de la feuille de route initiale (audit Zone 2 + Zone 3, puis bascule `rhythm_calendar`)

---

## 1. Dernière session close — 23 avril 2026

**Objectif tenu** : infrastructure de contexte (4 docs de référence + CLAUDE.md racine) en place pour que toute nouvelle session Claude démarre briefée automatiquement, sans perte d'information.

**Infrastructure docs — CLOSE** :

- ✅ `CONTEXTE-PROJET.md` — committed (`d17dcbf`)
- ✅ `VISION-ARCHITECTURE.md` — committed
- ✅ `ETAT-COURANT.md` — créé (`0ff9827`) + 3 MAJ au fil de la journée (`248fe8c`, `46486c1`, `cf75e27`)
- ✅ `CLAUDE.md` à la racine — committed (`2e78251`), remplace l'ancien `sterny-react/CLAUDE.md`
- ✅ `CLAUDE.md` section 10 — pointe vers les fichiers design existants dans `sterny-react/.claude/skills/design/` (commit `cffaf86`)
- ✅ Upload des 4 docs dans le Project Claude.ai — fait

**Imprévus de la journée** :

- Fausse alerte sur une hypothèse de "mauvais dossier de travail" : diagnostic complet a confirmé que tout est au bon endroit (`/Users/comefourel/Dev/sterny/sterny-react/`, servi par Vite, tracké par Git). Les 5 copies fantômes du repo identifiées (détail en section 6).

**Décision actée** :

- Audit esthétique reporté en dernière priorité (section 4 point 8). Les fichiers design existent déjà dans `sterny-react/.claude/skills/design/` et suffisent provisoirement.

---

## 2. Dernière avancée majeure — Phase 1 du plan matching (22 avril)

> **Note pour la prochaine session** : l'infrastructure de contexte est close (voir section 1). La priorité immédiate est la **Catégorie A de l'audit Zone 1** (section 4 point 2) : dump du schéma Supabase + vérification de `annonces.proprietaire_id` et `paiements_loyer.stripe_session_id`.

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

**Catégorie A — CLOSE (23 avril soir) via dump du schéma distant** :

- ✅ Dump reproductible du schéma : résolu, 3 fichiers versionnés dans `supabase/` (commit `6460ab0`).
- ❌ CONFIRMÉ : `annonces.proprietaire_id` absent en prod, référencé par le trigger `trg_notif_candidature` qui plante à chaque INSERT dans `candidatures`. Détails dans DETTE-TECHNIQUE #14. Fix reporté après audit Zone 2.
- ✅ FAUX POSITIF : `paiements_loyer.stripe_session_id` existe bien en prod (+ 3 autres colonnes Stripe). Simple dette de traçabilité tracée DETTE #15.

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

2. **Catégorie A — CLOSE** (voir section 0 et section 3)

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
- 9 commits diurnes (infrastructure docs) : `d17dcbf`, `f0d28dc`, `0ff9827`, `ede386d`, `2e78251`, `248fe8c`, `46486c1`, `cf75e27`, `cffaf86`
- 5 commits du soir (Catégorie A + incident Resend + règles anti-erreur) après réécriture d'historique : `6b0a8f8` (dumps, ex-`6460ab0`), `231e781` (commit fautif, ex-`01fc76e`), `f42cb2f` (revert, ex-`1ce1789`), `00dba49` (DETTE propre, ex-`ea6ccaf`), `210cd48` (règles anti-erreur, ex-`b16918a`)
- 1 commit de fin de soirée (après réécriture) : `d2b5d8a` (clôture session soirée — ex-`7df44d9` avant réécriture)
- Modifs non-commitées (décisions assumées) :
  - `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
  - `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — volontairement non-committed en attente de relecture à tête reposée

**Tâches de ménage à faire un jour calme** (non prioritaires) :

- **Backup de filter-repo à supprimer** : `/Users/comefourel/Dev/sterny-backup-before-filter-repo-20260423-2326` (620Mo) créé le 23 avril avant le nettoyage d'historique Git. À supprimer dans 24-48h (soit à partir du 25 avril) si aucun problème n'est remonté après la réécriture.
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
