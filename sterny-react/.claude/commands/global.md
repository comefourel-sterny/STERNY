---
description: Applique un redesign complet STERNY anti-AI-slop sur une page React
argument-name: fichier
---

SKILLS DESIGN — À lire avant tout travail frontend
Lis uniquement : .claude/skills/design/SKILL.md

---

DESIGN REFERENCE — AUTH & FORM PAGES
Base: ConnexionPage.jsx (validated)

Card:
- max-width: 460px
- width: 100%
- background: white
- border-radius: 16px
- padding: 36px
- border: 1.5px solid #E8EAF0
- box-shadow: 0 6px 28px rgba(232,98,42,0.10)

Title:
- font-size: 18px
- font-weight: 300
- letter-spacing: 3px
- color: #E8622A
- text-transform: uppercase
- text-align: center
- margin-bottom: 32px

Page background: #F4F5F7

For InscriptionRecherchePage.jsx, InscriptionProprietairePage.jsx,
CompleterProfilPage.jsx, and all profile/auth form pages:
- Card must have identical dimensions and padding to ConnexionPage
- Do not resize the card based on content
- min-height: 536px (inline style) to match ConnexionPage
- Scroll inside the card if content overflows
- All classes must be scoped with a unique prefix (cx-, ir-, ip-, cp-)

---

DESIGN REFERENCE — NAVBAR
- Logo left, messages icon with orange badge, navy circle
  avatar with white initials (36px), hamburger ☰ icon
- No mode toggle visible on dashboard pages

DESIGN REFERENCE — DASHBOARD STYLE
- Greeting: "Bonjour [Prénom]" — large bold, prénom
  underlined in #E8622A
- Background: #F4F5F7
- Cards: white, border-radius 20px,
  box-shadow: 0 2px 12px rgba(0,0,0,0.06), padding: 24px

DESIGN REFERENCE — SECTION TITLES
- SVG icon left (24px, orange background pill #FFF1E8,
  icon color #E8622A)
- Text uppercase, 11px, font-weight 600,
  letter-spacing 2px, color #E8622A
- Display flex, align-items center, gap 10px

DESIGN REFERENCE — ANNONCE CARD
- Photo: square (aspect-ratio 1/1, align-self stretch),
  border-radius 0, border-right 1px solid #E8EAF0,
  object-fit cover
- Tags: pills with border 1px solid #E8EAF0,
  border-radius 999px, padding 4px 10px, font-size 12px
- Prix tag: color #E8622A, font-weight 600
- Actions: "Modifier" orange text, "Voir" gray text,
  "Supprimer" light gray

DESIGN REFERENCE — LOCATAIRE BLOC
- Avatar navy circle with white initials
- Role badge: "LOCATAIRE" gray small, "HÔTE" green pill
- Message button: circle ghost, SVG chat icon

DESIGN REFERENCE — USER DROPDOWN
- White card, border-radius 16px
- box-shadow: 0 8px 32px rgba(0,0,0,0.12)
- Items: SVG icon gray + text navy, padding 12px 16px
- "Déconnexion": color #E8622A, icon orange

---

Tu vas transformer $ARGUMENTS en appliquant tous les skills
design dans l'ordre optimal. Travaille sur :
/Users/arnaudfourel/Desktop/STERNY/sterny-react/src/pages/$ARGUMENTS

ÉTAPE 1 — /i-audit
Analyse la page et liste tous les problèmes de design.
Attends d'avoir le rapport complet avant de continuer.

ÉTAPE 2 — /i-bolder
Rends le design plus affirmé et distinctif.
Navy #1E293B et Orange #E8622A doivent dominer clairement.

ÉTAPE 3 — /i-typeset
Optimise la typographie :
- DM Sans partout
- Contraste fort entre les tailles
- Hiérarchie visuelle claire

ÉTAPE 4 — /i-colorize
Améliore l'utilisation des couleurs selon le design system STERNY.
Élimine tout gris générique, tout violet, tout gradient par défaut.

ÉTAPE 5 — /i-animate
Ajoute des micro-interactions subtiles :
- Cards : hover translateY(-4px) + box-shadow
- Boutons : opacity 0.2s ease
- Page load : staggered fade-in sur les sections principales
- Jamais de bounce ni elastic

ÉTAPE 6 — /i-polish
Passe finale : peaufine les espacements, alignements,
border-radius, shadows. Vérifie la cohérence globale.

ÉTAPE 7 — /i-critique
Donne un score final /10 et liste les 3 points restants
à améliorer si nécessaire.

RÈGLES IMPÉRATIVES pendant toutes les étapes :
- Garde TOUS les hooks, state, appels Supabase
- Ne modifie QUE le JSX et les styles
- UNIQUEMENT str_replace
- Prévisualise sur http://localhost:5173
- Dis-moi quels fichiers ont été modifiés à la fin
