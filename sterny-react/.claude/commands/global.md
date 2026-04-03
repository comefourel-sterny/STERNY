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
