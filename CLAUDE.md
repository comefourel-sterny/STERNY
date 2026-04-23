# Sterny — CLAUDE.md

Fichier auto-lu par Claude Code en début de session. Règles opérationnelles courtes. Le détail vit dans les 4 docs de référence.

## 1. Docs de référence — lecture obligatoire

Les 4 documents suivants font autorité sur le projet. **Claude Code les lit au début de chaque session, dans cet ordre, sans exception** :

1. `docs/CONTEXTE-PROJET.md` — qui est Côme, stack, conventions
2. `docs/VISION-ARCHITECTURE.md` — où on va, principes fondateurs (rhythm_calendar, dates ISO)
3. `docs/ETAT-COURANT.md` — ce qu'on vient de faire, ce qui reste
4. `docs/DETTE-TECHNIQUE.md` — bugs connus, bypass DEV actifs

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

*Section à écrire après audit du code actuel (voir ETAT-COURANT.md pour le suivi).*

*Tant que cette section n'est pas complétée, Claude Code doit demander validation à Côme avant toute décision visuelle structurante (choix de font, palette, animation, structure de card, etc.).*
