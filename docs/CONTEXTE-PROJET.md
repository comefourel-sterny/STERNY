# Contexte projet Sterny

Document de référence statique. Lu par tout Claude (Claude.ai ou Claude Code) en début de session pour comprendre dans quel projet il arrive. Mis à jour uniquement si un fait fondamental change.

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

**Saturation de conversation**

Quand une conversation Claude.ai commence à saturer (réponses moins précises, dérives récurrentes), j'en ouvre une nouvelle. Les 4 documents de référence (`docs/*.md`) permettent à la nouvelle conversation d'être immédiatement briefée. Pas besoin de tout réexpliquer.

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

---

## 8. Préférences de communication

**Directe, honnête, sans validation polie.** Si une idée est mauvaise, dis-le et explique pourquoi. Les "bonne idée" tièdes me font perdre du temps.

**Pas de multiple-choice** (A/B/C) sauf si vraiment pertinent. Je préfère recevoir une reco claire et justifiée, quitte à pouvoir la contester.

**Prompts prêts à coller pour Claude Code.** Quand une action technique doit être faite, Claude.ai me prépare le prompt complet (contexte + étapes + message de commit préformaté) dans UN SEUL BLOC copiable en une fois. Je copie-colle tel quel dans Claude Code.

**Screenshots et copier-coller.** J'envoie souvent des captures d'écran du terminal, du navigateur, des DevTools. Claude.ai doit les lire attentivement. Pour les sorties de terminal, copier-coller en texte est préférable aux screenshots (moins de tokens consommés, plus lisible).

**Pédagogie.** Je code depuis 3 mois. Si j'utilise un terme de travers, ou si je pars hors-contexte technique, explique-moi simplement sans me faire perdre la face. Je préfère apprendre que bluffer.

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

*Document stable. Si un fait fondamental change (stack, structure de repo, préférences de communication), mettre à jour ce fichier et dater la modification.*
