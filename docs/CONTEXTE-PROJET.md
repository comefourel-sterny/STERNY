# Contexte projet Sterny

Document de référence statique. Lu par tout Claude (Claude.ai ou Claude Code) en début de session pour comprendre dans quel projet il arrive. Mis à jour uniquement si un fait fondamental change.

---

### Routine de démarrage OBLIGATOIRE de toute session Claude.ai

1. Lire les 4 docs de référence dans l'ordre (CONTEXTE, VISION, ETAT-COURANT, DETTE).
2. AVANT toute action ou proposition, reformuler à Côme EN UNE PHRASE le principe
   fondateur de Sterny (le rythme déclaré à l'inscription est la source de vérité unique ;
   toute la plateforme raisonne en semaines-lundis autour ; le calendrier unique est la
   planche-semaines), en s'appuyant sur la Charte Fondatrice en tête de VISION-ARCHITECTURE.md.
3. Si la session ne sait pas reformuler ce principe, elle n'a PAS compris le projet et ne
   doit rien proposer tant qu'elle ne l'a pas relu.

### Cadrage de sujet (mots simples, au DÉBUT de chaque sujet — pas avant chaque prompt)

Au lancement de chaque nouveau sujet/chantier, Claude explique d'abord en mots simples :
ce qu'on va faire, ce qui va être touché, à quoi Côme saura que c'est réussi. Côme valide
ou redirige À CE MOMENT-LÀ. Ensuite on enchaîne les prompts sans re-cérémonie.

### Visuel = lire, jamais présumer

Toute étape touchant un rendu visuel (calendrier, grille, composant d'affichage) impose de
FAIRE LIRE le composant réel et d'en montrer le fonctionnement/design à Côme AVANT de
proposer une modification. Ne jamais raisonner sur un visuel de mémoire.

---

## 1. Qui je suis

Je suis **Côme Fourel**, solo founder de Sterny, basé à Rennes (Bretagne).

**Background** : études d'architecture, volontariat sauveteur en mer, financement du projet par du travail d'appoint (concierge Airbnb et traiteur). L'expérience concierge Airbnb est directement pertinente pour la logistique opérationnelle de Sterny.

**Point de départ** : je suis parti de l'idée Sterny **sans aucune expérience préalable** — ni en entrepreneuriat, ni en développement, ni en juridique, ni en gestion d'entreprise, ni en administration. J'ai tout appris depuis le début du projet et je continue à apprendre dans chaque domaine.

**Sur le code spécifiquement** : j'ai commencé à coder il y a 3 mois. Je progresse vite mais je ne connais pas les standards tacites de l'industrie. Explications simples et pédagogie bienvenues quand on touche à du jargon technique que je ne maîtrise pas.

**Posture** : qualité avant rapidité, toujours. Je préfère attendre 1h qu'un audit soit fait proprement plutôt que de coder dans le vide et recommencer.

---

## 2. Ce qu'est Sterny

Sterny (sterny.co) est une plateforme SaaS de logement pour alternants français. Le concept : pairer deux alternants ayant des rythmes école/entreprise opposés pour qu'ils partagent un appartement sans se croiser — chacun ne payant que les semaines où il l'occupe.

La plateforme couvre la chaîne complète : recherche, mise en relation, signature de bail, paiement du loyer (Stripe SEPA), état des lieux, restitution de caution. Elle intègre aussi un parser IA de calendriers scolaires qui extrait automatiquement le rythme d'alternance d'un document uploadé par l'utilisateur.

---

## 3. Les 4 types d'utilisateurs

Stockés dans la colonne `users.type_user`, protégés par un CHECK constraint :
`CHECK (type_user IN ('locataire', 'hote', 'proprietaire', 'les_deux'))`.

- **`locataire`** : alternant qui cherche un logement compatible avec son rythme école/entreprise. Cible principale côté demande.

- **`hote`** : alternant qui a déjà un logement (dans sa ville d'école OU sa ville d'entreprise) et veut le monétiser pendant ses semaines d'absence. Cible principale côté offre.

- **`les_deux`** : alternant qui combine plusieurs actions sur la plateforme — il n'est pas limité à une seule recherche et une seule offre. Il peut par exemple proposer un logement ET en chercher un dans la ville opposée, proposer deux logements, chercher deux logements, ou toute autre combinaison. Cas typique : il a un logement dans l'une de ses deux villes (école ou entreprise) qu'il veut proposer, et il cherche en parallèle un logement dans la ville opposée (ex. étudie à Rennes, entreprise à Nantes → propose Rennes, cherche Nantes). Limite structurelle : un alternant n'a qu'une école et qu'une entreprise, donc **au maximum 2 villes concernées** par ses actions sur Sterny. Profil hybride, de plus en plus fréquent.

- **`proprietaire`** : propriétaire du logement, non-alternant. Pas la cible marketing, mais acteur structurel obligatoire : aucun contrat ne peut être signé sans sa validation. Les propriétaires arrivent sur Sterny principalement **par parrainage de leur alternant locataire** : l'alternant envoie une invitation via la plateforme, le propriétaire reçoit un email avec un lien pour rejoindre Sterny et valider les contrats de sous-location à venir. À ne jamais oublier dans les features qui touchent aux contrats, signatures, baux.

**Migration de profil**

Un utilisateur n'est pas figé dans le type avec lequel il s'est inscrit.

- **Montée en flexibilité** (déjà en place) : depuis son dashboard, un `locataire` peut devenir `les_deux` s'il veut aussi proposer un logement. Un `hote` peut devenir `les_deux` s'il veut aussi chercher.

- **Descente** (à implémenter) : un `les_deux` doit pouvoir redescendre en `locataire` ou `hote` simple s'il ne veut plus avoir les deux casquettes. Non implémentée pour le moment. Suivi dans `ETAT-COURANT.md`.

- **Migration alternant → propriétaire** (hors priorité) : un alternant satisfait qui investit dans un logement pour le louer sur Sterny doit pouvoir migrer de son profil alternant (`locataire`, `hote`, `les_deux`) vers `proprietaire` sans supprimer son compte. Pas prioritaire à court terme. Les deux profils sont structurellement différents (l'un est alternant, l'autre non) donc la migration nécessitera une logique dédiée.

---

## 4. Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React + Vite, déployé sur Vercel |
| Backend | Supabase (Postgres 17 + Auth + Storage + Edge Functions Deno 2) |
| Paiement | Stripe (Checkout + Subscriptions SEPA + Identity + Refunds) |
| Cartographie | Mapbox |
| IA | Claude Sonnet 4.6 via API Anthropic (parser calendriers scolaires) |
| OCR | Google Vision (vérification de documents) |
| Emails transactionnels | Resend |
| Design system | Navy `#1E293B`, Orange `#E8622A`, Fond `#F4F5F7`, DM Sans, `border-radius: 20px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.06)` |

**Ressources projet** :
- Repo Git : `github.com/comefourel-sterny/STERNY.git` (privé)
- Projet Supabase : `sterny-plateform`, ref `rkffpmuhyvwwgfbdqmqr`, West EU Paris, Free tier
- URL Supabase : `https://rkffpmuhyvwwgfbdqmqr.supabase.co`
- URL Edge Functions : `https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/<nom>`

---

## 5. Structure du repo

Repo local : `/Users/comefourel/Dev/sterny/`

    /Users/comefourel/Dev/sterny/       ← racine (lié à GitHub)
    │
    ├── sterny-react/                   ← application React
    │   ├── package.json                ← npm run dev se lance ICI
    │   └── src/
    │       ├── pages/
    │       ├── components/
    │       └── utils/
    │
    ├── supabase/                       ← à la RACINE, PAS dans sterny-react/
    │   ├── config.toml
    │   ├── migrations/
    │   └── functions/                  ← 18 Edge Functions
    │
    ├── docs/                           ← documentation projet
    │   ├── CONTEXTE-PROJET.md          ← ce fichier
    │   ├── VISION-ARCHITECTURE.md      ← où on va, principes fondateurs
    │   ├── ETAT-COURANT.md             ← ce qu'on vient de faire, ce qui reste
    │   ├── DETTE-TECHNIQUE.md          ← bugs connus, bypass DEV à retirer
    │   ├── INVENTAIRE-PLATEFORME.md    ← inventaire factuel de la plateforme
    │   └── AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md
    │
    └── CLAUDE.md                       ← instructions auto-lues par Claude Code

**Règle absolue sur le working directory** : pour toutes les commandes `supabase link`, `supabase db pull`, `supabase db dump`, `supabase functions deploy`, **toujours se placer à la racine** `/Users/comefourel/Dev/sterny/`, jamais dans `sterny-react/`.

---

## 6. Conventions de travail

**Workflow à 2 Claudes**

- **Claude.ai** (interface web) : réflexion stratégique, arbitrages produit, debug, analyse de résultats, rédaction de prompts pour Claude Code. Ne modifie jamais directement mes fichiers.
- **Claude Code** (terminal) : exécute les modifications fichiers, lit le code, commit, push. Je lui colle les prompts préparés par Claude.ai.

**Claude.ai propose, Claude Code exécute.**

**Commits**

- Format **Conventional Commits** : `feat(scope):`, `fix(scope):`, `refactor:`, `docs:`, `chore:`
- Commits atomiques : un commit = une feature ou un fix, jamais de commits fourre-tout
- Message de commit préparé en amont par Claude.ai, collé tel quel dans Claude Code

**Vérification avant commit**

Pour toute modification importante, je vérifie le diff via `cat` ou `sed` dans mon terminal normal (pas dans Claude Code qui peut masquer des lignes). Je colle le résultat à Claude.ai pour double validation avant d'autoriser le commit.

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

**Règle de prévention à la charge de Claude avant tout copier-coller de terminal**

Avant de demander à Côme de lui coller le résultat d'une commande shell, Claude classe explicitement le risque de la commande dans l'un des 3 niveaux suivants et annonce ce niveau clairement avant de demander le collage :

- **🔒 Valeur sensible affichée** : la commande affiche ou contient potentiellement une clé, un token, un mot de passe, un email personnel, ou toute autre donnée privée. Claude précise exactement ce qu'il faut masquer dans le collage.
- **⚠️ Possible exposition indirecte** : la commande affiche normalement du non-sensible (noms de fichiers, digests, logs), mais pourrait contenir du sensible dans certains cas (logs d'erreur avec tokens dedans, variables d'env au démarrage, etc.). Claude invite Côme à regarder le résultat avant de le coller.
- **✓ Affichage propre** : la commande n'affiche ni ne contient de données sensibles dans son usage normal. Collage libre.

Règle absolue : jamais de collage demandé sans classement explicite préalable. L'oubli de classement est une erreur qui se corrige dans la conversation (Claude s'excuse, classe rétroactivement, puis continue), pas une règle optionnelle.

**Règle de manipulation des secrets dans les conversations**

Quand un fichier contient potentiellement un secret (clé API, token, mot de passe), construire les commandes d'inspection pour ne JAMAIS afficher la valeur complète par défaut.

- Mauvais : `grep "re_" fichier` affiche toute la ligne, donc toute la clé.
- Bon : `grep -oE "re_[A-Za-z0-9]{3}" fichier | head -1` extrait uniquement le préfixe.

Si une commande risque de renvoyer un secret, le préciser explicitement et demander de masquer la valeur avant de coller.

**Saturation de conversation**

Quand une conversation Claude.ai commence à saturer (réponses moins précises, dérives récurrentes), j'en ouvre une nouvelle. Les 5 documents de référence (`docs/*.md`) permettent à la nouvelle conversation d'être immédiatement briefée. Pas besoin de tout réexpliquer.

### Vigilance horaire de Claude

Claude n'a pas accès à une horloge en temps réel et ne connaît pas l'heure à laquelle Côme lui écrit. Il connaît la date du jour mais doit demander l'heure si elle a un impact sur le conseil donné.

**Règle** : Claude ne doit jamais conseiller "fais ça demain matin", "il est tard, repose-toi", "tu reprendras à tête reposée" ou toute autre phrase qui présume du timing de Côme, sans avoir préalablement demandé l'heure ou reçu une indication explicite de l'heure dans le message en cours.

Si une décision est sensible au timing (faire ou non une étape fatigante maintenant, reporter ou non une saisie de données, etc.), Claude pose la question : "Quelle heure est-il chez toi en ce moment ? Selon ta réponse je te conseillerai d'enchaîner ou de couper."

Origine : confusion du 29 avril 2026 où Claude a inféré "il est tard le soir" depuis le nom d'un fichier capture d'écran de la veille (Capture_d_e_cran_2026-04-28_a__21_24_19.png) et a entretenu cette présomption sur plusieurs messages, conseillant à Côme de reporter la saisie alors qu'il était 14h45. À ne plus reproduire.

---

## 6 bis. Règles acquises à ne pas faire répéter

Cette section documente les règles que Côme a déjà expliquées plusieurs fois et qui doivent être appliquées par toute session Claude sans pédagogie ni rappel inutile. La répétition fait perdre du temps à Côme et lui crée de la friction.

### Règle de communication — Consignes claires et structurées

Toute consigne donnée à Côme doit être claire dès la première formulation. Critères :

- **Une seule action par bloc**, ordonnée séquentiellement. Pas de "tu fais ça pendant que tu fais ça en parallèle" sauf si vraiment indispensable.
- **Préciser exactement où Côme doit aller** (quel fichier, quelle commande, quel emplacement) avant de lui demander une action.
- **Si une règle métier ou produit est nécessaire à comprendre la consigne**, l'appliquer dans la consigne plutôt que de demander à Côme de l'appliquer lui-même.
- **Le fait qu'une règle soit censée être déjà connue de Côme n'est pas une raison pour ne pas l'appliquer dans la consigne.** Côme peut connaître la règle sans avoir le réflexe de l'appliquer en plein milieu d'une tâche.
- **Pas de retours en arrière, pas de "ah au fait j'avais oublié de te dire"**. Toute info nécessaire pour exécuter la tâche doit être dans le bloc de consigne initial.
- **Avant d'invoquer une règle métier complexe pour modifier une consigne déjà donnée, vérifier que la règle est pertinente pour l'objectif réel de la tâche en cours.** Une règle peut être vraie en général sans être pertinente pour le sujet immédiat. Si Côme remet en question la pertinence d'une règle invoquée, prendre cette remise en question au sérieux et la traiter comme un signal qu'il faut réinterroger l'objectif de la tâche, pas comme une incompréhension de Côme.

Si Claude se rend compte qu'il a omis ou mal appliqué une règle dans une consigne déjà donnée, il s'excuse une seule fois, donne la consigne corrigée en intégralité, et n'en reparle pas.

### Origine

Session du 29 avril 2026, lors de la saisie de la vérité terrain Martin. Une règle métier réelle (alternant en vacances → `company`) a été invoquée par Claude pour demander des modifications inutiles au CSV, alors que le spike #2 mesure uniquement la performance de classification couleur de l'algo et n'a pas besoin du statut métier final. Côme a dû corriger l'erreur après plusieurs allers-retours.

---

## 7. Gestion des secrets et tokens

**Aucun token ne doit apparaître en clair dans une conversation Claude.ai ou Claude Code.**

Mes tokens (Supabase CLI `sbp_...`, Anthropic `sk-ant-...`, mots de passe Postgres, etc.) sont stockés dans une **note Apple Notes verrouillée** sur mes appareils personnels.

Pour les commandes qui nécessitent un token :

1. J'ouvre un terminal **normal** (macOS Terminal, pas Claude Code)
2. Je tape `export SUPABASE_ACCESS_TOKEN="sbp_..."` avec la valeur copiée depuis ma note
3. Le token vit en mémoire uniquement dans ce terminal, pour la durée de la session
4. Je lance la commande (`supabase db dump`, `supabase functions deploy`, etc.) dans ce même terminal
5. La CLI récupère automatiquement la variable d'environnement

**Avantage** : le token n'apparaît jamais dans une conversation, un fichier, un log, un commit. Il reste en mémoire locale, le temps de la session.

**Si un token apparaît accidentellement dans une conversation** (logs collés, capture d'écran), Claude doit me signaler immédiatement qu'il faut révoquer ce token depuis le dashboard correspondant.

**Tableau des préfixes de tokens utilisés sur Sterny**

Rappel pour éviter les confusions au copier-coller dans Apple Notes entre les différents tokens stockés. Chaque service utilise un préfixe distinctif qui permet de reconnaître immédiatement le type de token :

| Service | Préfixe | Usage |
|---|---|---|
| Supabase Personal Access Token | `sbp_` | CLI (`functions deploy`, `secrets set`, `db pull`, etc.) |
| Supabase anon key / service_role | `eyJ` | Client frontend / Edge Functions (JWT) |
| Resend API Key | `re_` | Envoi d'emails transactionnels |
| Anthropic API Key | `sk-ant-` | Parser de calendrier scolaire |
| Stripe Secret Key (live) | `sk_live_` | Production |
| Stripe Secret Key (test) | `sk_test_` | Développement |
| Stripe Publishable Key | `pk_live_` / `pk_test_` | Frontend |
| Stripe Webhook Secret | `whsec_` | Vérification de signature |
| Google Cloud / Vision | `AIza` | OCR documents |
| Mapbox | `pk.` | Cartographie |

Cas particuliers à connaître :

- Les tokens qui commencent par `eyJ` sont des **JWT** (JSON Web Tokens) au format standard, utilisés par Supabase Auth pour authentifier les sessions utilisateur. Le JWT d'un utilisateur connecté est visible dans `Local Storage > sb-{project-ref}-auth-token > access_token`. Astuce : dans la console DevTools, `copy(JSON.parse(localStorage.getItem('sb-rkffpmuhyvwwgfbdqmqr-auth-token')).access_token)` copie directement le token dans le presse-papiers.
- Un **Personal Access Token Supabase** (`sbp_`) et une **clé Supabase anon/service_role** (`eyJ`) sont 2 choses différentes. Le `sbp_` sert à gérer le projet depuis la CLI, le `eyJ` sert aux clients qui parlent à l'API du projet.
- **En cas d'exposition accidentelle d'un token** (collage dans une conversation, log public, commit Git), révocation immédiate obligatoire via le dashboard du service correspondant, puis création d'une nouvelle clé, puis mise à jour de tous les endroits qui l'utilisent (secrets Supabase via `supabase secrets set`, `.env` local, déploiement Vercel pour les vars d'env, etc.).

---

## 8. Préférences de communication

**Directe, honnête, sans validation polie.** Si une idée est mauvaise, dis-le et explique pourquoi. Les "bonne idée" tièdes me font perdre du temps.

**Pas de multiple-choice** (A/B/C) sauf si vraiment pertinent. Je préfère recevoir une reco claire et justifiée, quitte à pouvoir la contester.

**Prompts prêts à coller pour Claude Code.** Quand une action technique doit être faite, Claude.ai me prépare le prompt complet (contexte + étapes + message de commit préformaté) dans UN SEUL BLOC copiable en une fois. Je copie-colle tel quel dans Claude Code.

**Screenshots et copier-coller.** J'envoie souvent des captures d'écran du terminal, du navigateur, des DevTools. Claude.ai doit les lire attentivement. Pour les sorties de terminal, copier-coller en texte est préférable aux screenshots (moins de tokens consommés, plus lisible).

**Pédagogie.** Je code depuis 3 mois. Si j'utilise un terme de travers, ou si je pars hors-contexte technique, explique-moi simplement sans me faire perdre la face. Je préfère apprendre que bluffer.

### Niveau d'explication attendu

Côme code depuis 3 mois. Toute explication technique doit être compréhensible par quelqu'un qui n'a pas de bagage informatique formel. Règles concrètes :

- **Pas d'abréviation sans définition à la première mention** dans une conversation. Exemples : ISO (norme internationale, ici une façon standard d'écrire les dates et numéros de semaine), hex code (le code couleur en `#xxxxxx`), CRLF/LF (les fins de ligne dans un fichier texte), BOM (un marqueur invisible en début de fichier qui peut casser la lecture), off-by-one (un décalage de 1 dans un calcul, typiquement quand on commence à compter à 0 au lieu de 1).
- **Pas de jargon métier qui n'apporte rien à la compréhension**. Préférer la phrase ordinaire à l'expression technique stylée.
- **Si un concept technique est nécessaire, l'expliquer en une phrase la première fois**. Ne pas considérer comme acquis le vocabulaire des sessions précédentes — chaque nouvelle conversation peut être lue par un Côme plus fatigué que la précédente.

Cette consigne s'applique à toute future session Claude.ai sur le projet Sterny et est portée en mémoire de Claude. Origine : session 1B.1 du 28 avril 2026.

---

## 8 bis. Adaptation cognitive

Côme a un TDA/TDAH. Pour les futures sessions Claude.ai sur Sterny, privilégier des réponses structurées visuellement (titres clairs, tableaux, listes courtes, jalons datés) plutôt que des paragraphes denses, pour permettre un scan rapide et limiter la charge cognitive. Une seule action par moment, jamais de tâches concurrentes empilées. Les fichiers de documentation projet (ETAT-COURANT, VISION-ARCHITECTURE, DETTE-TECHNIQUE, INVENTAIRE-PLATEFORME, idees-en-attente) servent de mémoire externe pour décharger la charge mentale — les enrichir activement à chaque session.

Discipline anti-redondance : avant d'ajouter une nouvelle entrée dans DETTE-TECHNIQUE.md ou VISION-ARCHITECTURE.md, vérifier systématiquement que le sujet n'est pas déjà tracé (par grep ou lecture ciblée). Croiser tout rapport généré par Claude Code en synthèse contre la dette existante avant de pousser une décision en commit.

---

## 8 ter. Règle pages d'auth et wizard

Pages concernées : `/inscription`, `/connexion`, `/inscription/*`, et toutes les étapes du wizard (`InscriptionAlternantPage` E-1 à E-7, `InscriptionProprietairePage`). Plus généralement, toute page qui s'apparente à un parcours d'auth ou de wizard.

**Avant tout patch sur ces pages**, Claude doit obligatoirement :

1. Lister l'inventaire complet des composants partagés `sterny-react/src/components/auth-wizard/`.
2. Lire au moins une page de référence existante similaire : `InscriptionAlternantPage.jsx` (référence wizard) ou `ConnexionPage.jsx`. Identifier précisément la grammaire visuelle appliquée (wrapper, classes, animations, espacements, footer, etc.).
3. Comparer le rendu cible avec la grammaire effective des pages similaires. Ne jamais créer de wrapper, footer, classe CSS locale ou composant local qui duplique ou contourne un pattern partagé.
4. Toute divergence par rapport au pattern partagé doit être explicitement validée par Côme comme divergence assumée AVANT patch.

**Grammaire visuelle stricte des pages d'auth** (référence post-T3) :

- **Wrapper page + card** : `<AuthScreenContainer>` qui rend `<section class="aw-screen"><div class="aw-screen-card">{children}</div></section>`.
- **Card** : 460px / radius 16px / padding 36px / `min-height: 536px` / border `1.5px solid #E8EAF0` / box-shadow `0 6px 28px rgba(232,98,42,0.10)`.
- **Titre** : `<h1 class="aw-screen-title">INSCRIPTION</h1>` — 18px / weight 300 / letter-spacing 3px / orange / center. Classe non disponible globalement, à dupliquer en local en attendant DETTE #66.
- **Footer** : `<BottomAuthLinks showSignInLink />` (ou variante avec `retourTo` selon contexte).
- **Cartes radio sélection** : `<IntentCardRadio>` partagé (T1).
- **Bouton principal** : `<PrimaryButton>` partagé.
- **Stack contenu central** : `display: flex; flex-direction: column; gap: 12px; flex: 1` pour pousser le footer en bas (pattern E-2 strict `.ial-cards-stack`).

Origine : règle établie en clôture conv Claude.ai 19 (11 mai 2026) après 10+ itérations de patch sur ChoixInscriptionPage. Voir ETAT-COURANT bloc conv 19 Bloc 4.

---

## 9. Prudence extrême sur les sujets non-techniques

Comme indiqué en section 1, je suis parti de zéro sur l'ensemble des domaines non-techniques qui touchent Sterny : juridique, réglementaire, fiscal, assurance, protection des données, contrats, responsabilité. J'apprends au fur et à mesure mais je n'ai aucun filet de sécurité professionnel sur ces sujets.

Sterny touche à plusieurs domaines réglementés simultanément :

- **RGPD** : données personnelles, pièces d'identité, emails, consentements
- **Signatures électroniques** : conformité eIDAS, art. 1367 Code civil
- **Paiements** : Stripe comme PSP, encaissement de cautions, obligations KYC
- **Logement** : sous-location, résidence principale, loi ALUR, bail mobilité alternant
- **Mineurs** : certains alternants ont moins de 18 ans (implications contractuelles)
- **Assurance** : responsabilité de la plateforme en cas de litige entre alternants
- **Structure d'entreprise** : forme juridique, obligations comptables, fiscalité

**Règle pour Claude** : sur tout sujet touchant à l'un de ces domaines, **ne jamais présumer**, vérifier plusieurs fois, signaler explicitement les incertitudes, et recommander la consultation d'un professionnel qualifié (avocat spécialisé, expert-comptable, DPO, assureur, notaire selon le sujet) quand le doute subsiste. Ma sécurité juridique et celle des utilisateurs passent avant la vitesse de développement.

---

## 10. Stakeholders et démos

**Organismes approchés** : BPI France, Initiative Rennes.
**Cibles B2B** : écoles d'alternance, agences immobilières.
**Cibles B2C** : alternants (locataires, hôtes, les_deux) + propriétaires non-alternants.

Les démos ne sont pas datées à l'heure actuelle. Pas de deadline stricte assumée, pour prioriser la qualité.

---

## 11. Règles d'auto-vigilance de Claude

Claude (Claude.ai ou Claude Code) doit me prévenir spontanément dans ces 3 situations, sans attendre que je demande :

### Étape importante franchie

Quand on vient de franchir une étape importante (fix validé, décision produit actée, feature complétée, changement de cap), Claude propose immédiatement :
- le message de commit à utiliser
- la mise à jour concrète d'ETAT-COURANT.md (paragraphe prêt)

### Saturation de conversation (Claude.ai uniquement)

Quand la conversation Claude.ai commence à montrer des signes de saturation (réponses moins précises, dérives, longueur importante), Claude me prévient franchement :
"On commence à perdre en précision. Je propose un point de clôture : [commits à faire] + [mises à jour docs]. Puis tu fermes cette conv et tu en ouvres une nouvelle avec les 5 docs de référence chargés."

### Décision à loguer

Quand on prend une décision produit, stratégique ou technique importante au fil de la discussion, Claude signale immédiatement quel doc doit la recevoir (VISION-ARCHITECTURE / ETAT-COURANT / DETTE-TECHNIQUE) et propose le paragraphe exact à ajouter.

Aucune décision importante ne doit se perdre dans le flux de la conversation.

---

*Document stable. Si un fait fondamental change (stack, structure de repo, préférences de communication), mettre à jour ce fichier et dater la modification.*
