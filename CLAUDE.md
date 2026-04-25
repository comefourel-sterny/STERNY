# Sterny — CLAUDE.md

Fichier auto-lu par Claude Code en début de session. Règles opérationnelles courtes. Le détail vit dans les 5 docs de référence.

## 1. Docs de référence — lecture obligatoire

Les 5 documents suivants font autorité sur le projet. **Claude Code les lit au début de chaque session, dans cet ordre, sans exception** :

1. `docs/CONTEXTE-PROJET.md` — qui est Côme, stack, conventions
2. `docs/VISION-ARCHITECTURE.md` — où on va, principes fondateurs (rhythm_calendar, dates ISO)
3. `docs/ETAT-COURANT.md` — ce qu'on vient de faire, ce qui reste
4. `docs/DETTE-TECHNIQUE.md` — bugs connus, bypass DEV actifs
5. `docs/INVENTAIRE-PLATEFORME.md` — inventaire factuel de la plateforme : routes, pages, composants, Edge Functions, tables, design system appliqué

Si l'un manque ou semble périmé, le signaler à Côme avant d'agir.

Coût : ~15k tokens sur les 200k disponibles. Négligeable comparé au risque d'agir sans contexte (refactoriser une colonne dépréciée, nettoyer un bypass DEV volontaire, ignorer l'état courant).

## 2. Working directory

- Racine du repo : `/Users/comefourel/Dev/sterny/`
- Code React : `sterny-react/`
- Supabase : `supabase/` **à la racine** (PAS dans `sterny-react/`)

**Règle absolue** : toute commande `supabase link | db pull | db push | db dump | functions deploy` se lance depuis la racine `/Users/comefourel/Dev/sterny/`, jamais depuis `sterny-react/`.

## 3. Workflow 2 Claudes

- **Claude.ai (interface web)** : réflexion, arbitrages, rédaction des prompts. Ne modifie pas les fichiers.
- **Claude Code (toi, terminal)** : exécute les modifications, commits, pushes.

Claude.ai propose, Claude Code exécute. Si une demande semble contradictoire avec ce que disent les docs de référence, demander clarification avant d'agir.

## 4. Tokens et secrets

**Aucun token ne doit apparaître en clair** dans une conversation, un fichier, un commit, un log, un output terminal.

Pour les commandes qui nécessitent un token (Supabase CLI `sbp_...`, Anthropic `sk-ant-...`, mots de passe Postgres) : Côme les exporte dans un terminal normal avec `export VARIABLE="..."` avant de lancer la commande. La CLI récupère la variable d'environnement, rien n'est logué.

Si un token apparaît accidentellement dans un output (log collé, erreur), signaler immédiatement à Côme pour révocation depuis le dashboard correspondant.

## 5. Bypass DEV actifs — ne PAS nettoyer par zèle

Ces bypass sont volontaires, trackés dans `docs/DETTE-TECHNIQUE.md`, à retirer en **Phase 0bis uniquement**.

Fichier concerné : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx`

Bypass présents dans ce fichier :
- `validateStep` fait `return true` immédiat
- `skipStripeIdentity = true`
- Modale de confirmation bypassée (clic → `publierAnnonce` direct)
- Logs `[DEBUG]` et `[DEBUG RENDER]` à conserver jusqu'à Phase 0bis

Ne pas les supprimer "pour nettoyer" même si ça semble évident. Ils permettent à Côme de tester le flow de création d'annonce sans friction tant que la Phase 1 matching n'est pas close.

## 6. Commits

- Format **Conventional Commits** : `feat(scope):`, `fix(scope):`, `refactor:`, `docs:`, `chore:`
- Commits atomiques : un commit = une feature ou un fix, jamais de commits fourre-tout
- Message de commit préparé par Claude.ai en amont, collé tel quel — ne pas réécrire sans raison

## 7. Sujets réglementés — prudence extrême

Sterny touche simultanément plusieurs domaines régulés : RGPD, signatures électroniques (eIDAS), paiements (Stripe PSP, KYC), logement (loi ALUR, bail mobilité alternant), mineurs (certains alternants ont < 18 ans), assurance, structure d'entreprise.

**Règle** : sur tout sujet touchant l'un de ces domaines, ne jamais présumer, signaler explicitement les incertitudes, recommander la consultation d'un professionnel qualifié. Aucun avis professionnel n'a encore été sollicité à ce stade — la démo est en cours de finalisation précisément pour pouvoir le faire.

## 8. Rhythm_calendar — source de vérité unique

Les colonnes `users.type_alternance`, `users.rythme_alternance`, `annonces.type_alternance`, `annonces.rythme_pattern` sont **gelées en attente de suppression**.

Aucune nouvelle feature ne doit s'appuyer dessus pour du matching, un filtre, ou une logique métier. Le matching se base exclusivement sur `users.rhythm_calendar` (jsonb) et `annonces.disponibilites_pattern` (jsonb), avec dates ISO du lundi au format `"YYYY-MM-DD"`.

Si une demande contredit cette règle, refuser et proposer une alternative basée sur `rhythm_calendar`. Détails dans `docs/VISION-ARCHITECTURE.md` section 3.

## 9. Auto-vigilances — prévenir spontanément Côme

**Étape importante franchie** — fix validé, feature complétée, décision actée → proposer immédiatement :
- le message de commit à utiliser
- la MAJ concrète de `docs/ETAT-COURANT.md` (paragraphe prêt à insérer)

**Décision à loguer** — décision produit, stratégique ou technique prise au fil du travail → signaler quel doc doit la recevoir (`VISION-ARCHITECTURE.md` / `ETAT-COURANT.md` / `DETTE-TECHNIQUE.md`) et proposer le paragraphe à ajouter.

Aucune décision importante ne doit se perdre entre deux commits.

## 10. Frontend aesthetics

Le design system Sterny est déjà documenté dans le dossier `sterny-react/.claude/skills/design/` et via le slash-command `sterny-react/.claude/commands/global.md`.

**Claude Code doit consulter ces fichiers avant toute décision visuelle structurante** (choix de font, palette, animation, structure de card, etc.) :

1. `sterny-react/.claude/skills/design/SKILL.md` — vue d'ensemble du design system
2. `sterny-react/.claude/skills/design/design-rules.md` — règles visuelles (typo, couleurs, espacements)
3. `sterny-react/.claude/skills/design/component-patterns.md` — patterns de composants (cards, dropdowns, etc.)
4. `sterny-react/.claude/skills/design/generators.md` — générateurs de code visuels
5. `sterny-react/.claude/commands/global.md` — commandes composées pour mise au propre d'une page

Ces fichiers sont la source de vérité actuelle. Un audit de fraîcheur est prévu (cf. `docs/ETAT-COURANT.md` section 4 point 8) pour vérifier qu'ils reflètent bien les pages retravaillées récemment avant qu'ils soient considérés comme stables.

En attendant cet audit, en cas de doute entre ces fichiers et une page récemment retravaillée, Claude Code doit demander validation à Côme plutôt que présumer.

## Règles Git et secrets (auto-application)

Les règles ci-dessous sont auto-appliquées par Claude Code à chaque session. Elles viennent d'erreurs réelles commises en sessions précédentes. Si Claude Code détecte une violation potentielle, il s'arrête et signale avant d'exécuter la commande risquée.

**Règles Git anti-erreur** (journal alimenté au fil des sessions)

Ces règles ont été ajoutées après des erreurs réelles commises par Claude.ai ou Claude Code. Elles ne sont pas théoriques — chaque règle traite une erreur identifiée.

- **Jamais `git commit -a` ni `-am`** dans les prompts Claude Code. Toujours `git add <fichier-explicite>` puis `git commit -m`. Raison : le flag `-a` ramasse automatiquement tous les fichiers tracked modifiés, ce qui embarque accidentellement les modifs non-commitées volontairement (bypass DEV dans CreerAnnoncePage.jsx notamment).

- **Toujours `git diff --staged --stat` avant chaque `git commit`**, pour confirmer que le commit contient exactement les fichiers voulus. Si autre chose apparaît, Claude Code s'arrête et signale avant de committer.

- **`git revert` et `git checkout <commit> -- <fichier>` manipulent working tree ET index**, pas seulement l'historique. Avant de proposer l'une de ces commandes, simuler mentalement son effet sur les 3 zones (working tree, index, HEAD). Prévoir un `git reset HEAD <fichier>` ou un `git stash push -u` en amont ou en aval si nécessaire.

- **Fichiers volontairement non-commités** (bypass DEV, tests temporaires) : ne jamais les commiter sans instruction explicite, même s'ils apparaissent "modifiés" dans `git status`. La liste des bypass connus est dans `docs/DETTE-TECHNIQUE.md` section "Bypass DEV en place dans le code".

**Check-list secrets pré-commit**

Obligatoire sur tout fichier issu d'un dump BDD, d'un export, d'un snapshot de schéma, ou de logs copiés. Patterns à tester :

- `sbp_` (Supabase Personal Access Token)
- `sk-ant-` (Anthropic API)
- `re_[A-Za-z0-9]{6,}` (Resend API)
- `sk_live_`, `sk_test_`, `pk_live_`, `pk_test_`, `whsec_` (Stripe)
- `pk\.` (Mapbox tokens publics et privés)
- `AIza[0-9A-Za-z_-]{35}` (Google Cloud, dont Vision)
- `password`, `secret`, `token` (mots génériques, faux positifs fréquents)

Commande type à intégrer dans chaque prompt de commit :
`grep -nE "sbp_|sk-ant-|re_[A-Za-z0-9]{6,}|sk_live_|sk_test_|pk_live_|pk_test_|whsec_|pk\.|AIza[0-9A-Za-z_-]{35}|password|secret|token" <fichier>`

Si retour non nul, analyser chaque match avant de commit. Faux positifs fréquents : noms de colonnes SQL (`"secret" "text"`), placeholders. Vrais positifs : valeurs après `Bearer`, `Authorization:`, `API_KEY=`, dans des chaînes JSON ou SQL.

**Règle de manipulation des secrets dans les conversations**

Quand un fichier contient potentiellement un secret (clé API, token, mot de passe), construire les commandes d'inspection pour ne JAMAIS afficher la valeur complète par défaut.

- Mauvais : `grep "re_" fichier` affiche toute la ligne, donc toute la clé.
- Bon : `grep -oE "re_[A-Za-z0-9]{3}" fichier | head -1` extrait uniquement le préfixe.

Si une commande risque de renvoyer un secret, le préciser explicitement et demander de masquer la valeur avant de coller.
