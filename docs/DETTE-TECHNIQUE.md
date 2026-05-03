# Dette technique Sterny

Suivi des bugs et bypass DEV à traiter en Phase 0bis (après Phase 1 complète).

**Dernière mise à jour** : 3 mai 2026 — Clôture conv Claude.ai 4 chantier UNIFICATION-INSCRIPTION : DETTE #55 enrichie d'une précision empirique (Confirm email Supabase casse le parcours proprio email en prod) ; création DETTE #57 (template email de confirmation Supabase à customiser, distinct de DETTE #16 sur les emails Resend transactionnels).

## Nomenclature des bugs

Les codes B1, B2, M2, M3, m1 viennent de l'audit initial du matching Sterny
(document sterny-handoff-phase1-v2.docx, avril 2026). Convention :
- **Bn** (majuscule) = Bug bloquant (ex: B1, B2)
- **Mn** (majuscule) = Bug majeur (ex: M2, M3)
- **mn** (minuscule) = Bug mineur (ex: m1)

## Bypass DEV en place dans le code (à retirer avant prod)

1. `CreerAnnoncePage.jsx` ligne ~1461 : `validateStep` fait `return true` immédiat
2. `CreerAnnoncePage.jsx` ligne ~1596 : `skipStripeIdentity = true` contourne Stripe Identity
3. `CreerAnnoncePage.jsx` ligne ~1572 : `showConfirmationModal` bypasse la modale et appelle `publierAnnonce()` directement
4. Tous les `console.log('[DEBUG...')` et `[DEBUG RENDER]` ajoutés lignes 1573, 1575, 1578, 1580, 2628

## Bugs préexistants identifiés dans CreerAnnoncePage.jsx

5. **useEffect en boucle** (ligne ~562-579) : re-render 5-6× à chaque changement de state. Le useEffect modifie ses propres dépendances via `processRhythmDates`. À refactoriser avec un `useRef` ou une condition de sortie.

6. **Latence de saisie** : 2600+ lignes de JSX dans un seul composant, pas de `React.memo` ni `useMemo`. Chaque keystroke re-rend toute la page. À refactoriser par extraction de sous-composants (sections Bail, Photos, Disponibilités, Tarification).

7. **Cropper photo cassé** (ligne ~876-891) : `setTimeout(100ms)` fragile avant init du Cropper. Si le DOM n'est pas prêt, `cropImageRef.current` est null, le cropper ne s'initialise jamais. À refactoriser avec un `useRef` callback ou `useLayoutEffect`.

8. **Modale de confirmation invisible** : JSX rendu, state correct, mais CSS `display: none`. Confirmé via `getComputedStyle` : `display="none"`, `width=0`, `height=0`, `zIndex="1000"`. À investiguer.

## Bugs préexistants ailleurs dans le code

9. **Erreur 400 sur candidatures** : requête GET `/rest/v1/candidatures?select=*,annonces(...)` renvoie 400. Probable problème RLS sur la jointure. Dashboard candidatures potentiellement cassé.

10. **URL suspecte** : le flow arrive sur `/annonce/creer?type=locataire` alors qu'un locataire n'est pas censé créer d'annonce. Cohérence du paramètre `type` à vérifier dans les CTA.

## Incohérences données BDD

11. **Orthographe type_alternance** : valeurs observées `asymmetric` (EN) et `asymetrique` (FR) dans la même colonne avant le reset de la Phase 1c. À harmoniser pour l'avenir : choisir UNE orthographe officielle, contrainte CHECK pour éviter la régression.

## Code smell à nettoyer

12. **Fallback mort dans matchScore** (`RecherchePage.jsx` ligne ~653) : `futureHostDates[0] || logement.disponibilites_pattern[0]` est inatteignable après le filter ligne 647. À simplifier ou commenter.

13. **Logique normaliseur matchScore** : `userDansPerioDeHote.length || 1` à expliciter en JSDoc (partiellement traité en Phase 1d).

## Bugs backend confirmés par audit du schéma distant (23 avril 2026)

14. **`annonces.proprietaire_id` absent en prod, référencé par trigger actif** — **CONFIRMÉE EMPIRIQUEMENT 2026-04-30** :
    - Trigger : `trg_notif_candidature` (AFTER INSERT ON `public.candidatures`)
    - Fonction : `trigger_notif_candidature()` définie lignes 140-166 de `supabase/remote_schema.sql`
    - La fonction exécute `SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id`
    - La colonne `proprietaire_id` n'existe pas dans `annonces` (confirmé lignes 204-233 du schema dump)
    - Table `annonces` a seulement `user_id` comme pointeur vers les utilisateurs
    - Conséquence attendue : chaque INSERT dans `candidatures` déclenche le trigger, qui plante avec "column a.proprietaire_id does not exist", ce qui fait rollback de toute la transaction
    - **Validation empirique faite le 30 avril 2026 soir** : INSERT test exécuté dans Supabase Dashboard SQL Editor avec ROLLBACK forcé. Message d'erreur capturé : `ERROR 42703: column a.proprietaire_id does not exist`, `QUERY: SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id`, `CONTEXT: PL/pgSQL function trigger_notif_candidature() line 7 at SQL statement`. La transaction est rollbackée par PostgreSQL avant même que la ligne candidature soit créée. **Aucune candidature ne peut aboutir en production tant que la dette n'est pas résolue. Tout le parcours locataire en aval (suivi candidature, match, signature contrat, paiement) est bloqué structurellement.** Statut : P0 bloquant pour démo.
    - Fix à trancher entre (A) ajouter une colonne `proprietaire_id` à `annonces` et la remplir selon logique parrainage, ou (B) modifier la fonction pour lire `user_id` si ce dernier stocke bien le propriétaire. **Décision à prendre en session stratégique dédiée** — le choix A vs B touche au modèle de parrainage propriétaire, ne pas trancher dans le flux de l'audit fonctionnel.

## Dette de traçabilité des migrations

15. **Migrations locales désynchronisées de la prod** :
    - Les colonnes Stripe de `paiements_loyer` (`stripe_session_id`, `stripe_payment_intent`, `stripe_payment_intent_id`, `stripe_invoice_id`) existent en prod mais sont absentes des fichiers de migration `supabase/migrations/`
    - Idem possiblement sur d'autres tables (à auditer)
    - Impact : reproduire une BDD vide depuis les migrations locales ne donnerait pas un état identique à la prod
    - Fix : en Catégorie C, générer une migration baseline depuis `supabase/remote_schema.sql` et remplacer la pile actuelle

## Design des emails transactionnels à refaire

16. **Design des templates email Resend à refondre** : les 6 Edge Functions d'envoi d'email (`send-alert-email`, `send-landing-email`, `send-proprietaire-invitation`, `send-recu-paiement`, `send-fin-bail-email`, `send-relance-impaye-email`) contiennent chacune un template HTML inline dans `supabase/functions/<nom>/index.ts`. Les designs actuels ne sont pas au niveau du design system Sterny (Navy `#1E293B`, Orange `#E8622A`, DM Sans, `border-radius: 20px`). Constat fait le 24 avril après réception du test de `send-alert-email`. À traiter une fois tous les aspects techniques opérationnels, en dernière priorité. Scope : uniformisation visuelle sur les 6 templates, cohérence avec la charte sterny.co, responsive mobile, respect des contraintes email (tables, inline styles, fonts système en fallback).

## Désynchro code local ↔ prod sur Edge Functions

17. **5 Edge Functions présentes en local mais non déployées en prod** (constat du 24 avril via `supabase functions list --project-ref rkffpmuhyvwwgfbdqmqr`) :
    - `send-landing-email` : appelée par `PasswordGate.jsx` ligne 57 — probablement cassée en prod (chemin 404 testé au curl le 24 avril)
    - `send-recu-paiement`
    - `expire-candidatures`
    - `export-data` : référencée par l'audit Zone 1 Catégorie B comme fonction RGPD non-conforme, donc cassée ET incomplète
    - `restitution-caution`

    Impact prioritaire : `send-landing-email` étant appelée en production par `PasswordGate.jsx`, l'inscription landing page ne génère aucun email de bienvenue (probablement silencieux côté user, qui voit juste son inscription validée). À vérifier avant démo.

    Fix : déployer chaque fonction après audit de son code (`supabase functions deploy <nom> --project-ref rkffpmuhyvwwgfbdqmqr` depuis la racine du repo). À faire dans une session dédiée, pas dans l'Action 2 en cours.

## Audit à faire des autres triggers SQL qui font des appels HTTP sortants

18. **Auditer les autres triggers BDD qui utilisent `net.http_post()` ou `supabase_functions.http_request()`** : suite à la découverte que le trigger `send-alert-on-insert` envoyait un body vide `{}` par design (résolu le 24 avril par suppression du trigger + appels frontend explicites à `send-alert-email` depuis PasswordGate, RecherchePage et DashboardLocatairePage), il faut vérifier qu'aucun autre trigger ne souffre du même problème silencieux. Candidats connus : `trg_notif_candidature` (voir DETTE #14) et potentiellement d'autres. Objectif : vérifier qu'ils fonctionnent réellement, et arbitrer cas par cas leur migration vers des appels frontend explicites pour cohérence avec l'arrivée de l'app mobile native. À faire dans une session dédiée.

## Asymétrie réponse client vs persistance BDD du parser rhythm_calendar

19. **Le JSON renvoyé par l'Edge Function `parse-school-calendar` au client est différent du JSON persisté en BDD** (constat du 25 avril lors de l'Action A2 phase test). La réponse client contient `groups[].weeks = null` et `weeks_count: 0`, alors que `rhythm_imports.parsed_groups` en BDD contient les semaines complètes. Le client reçoit `rhythm_import_id` au top-level pour pouvoir relire la BDD via Supabase. Comportement potentiellement intentionnel (économie de bande passante, le frontend lit la BDD via SDK plutôt que via le retour HTTP) ou bug de sérialisation côté provider/index.ts. À investiguer une fois le Bloc B terminé. Si intentionnel, le documenter explicitement dans le code de l'Edge Function. Si bug, fixer.

## Limites métadonnées document selon format source

20. **Le `document_meta` extrait par le LLM peut contenir des valeurs `null` ou des codes techniques** selon ce qui est disponible dans le document uploadé (constat du 25 avril). Exemple sur Planning_Mathis.pdf (Hyperplanning) : `school_name: null`, `program_name: "R_CA_A3"`. Le LLM ne peut pas inventer ce qui n'existe pas dans le PDF source. Le frontend devra gérer ces cas (afficher "École non détectée" ou similaire au lieu de crasher). Tracé pour qu'on le prenne en compte dans le Bloc B (`RhythmCalendar` visuel) et dans tout écran qui affiche le rythme parsé.

## Audits du 25 avril 2026 — anomalies plateforme

Découvertes lors de la génération de l'audit `docs/_audit/AUDIT-PLATEFORME-2026-04-25.md` (rapport jetable, gitignoré). Loguées ici comme dettes formelles à traiter en Phase 0bis (catégorie C ménage), sauf indication contraire.

21. **Composants React morts définis mais non référencés** : `Stepper`, `FooterMinimal`, `HamburgerMenu`, `NotificationBell` (chemins respectifs : `sterny-react/src/components/Stepper.jsx`, `sterny-react/src/components/layout/FooterMinimal.jsx`, `sterny-react/src/components/layout/HamburgerMenu.jsx`, `sterny-react/src/components/layout/NotificationBell.jsx`). Conséquence importante pour `NotificationBell` : la table `notifications_in_app` n'a plus de consommateur frontend actif. À supprimer en Phase 0bis (catégorie C ménage).

22. **Doublon de route `/annonce/creer` dans `sterny-react/src/App.jsx`** : la route est déclarée 2 fois — lignes 96-99 sous `<Layout/>` (zone "Temp: test"), lignes 145-147 sous `<DashboardLayout/>`. Le premier match (Layout simple) gagne, donc la garde `useAuth` du DashboardLayout n'est pas appliquée. Conséquence : la page de création d'annonce tourne sans la garde auth attendue. Fix : supprimer la déclaration sous `<Layout/>` (la "Temp: test"), garder uniquement celle sous `<DashboardLayout/>`.

23. **`PresentationProprietairePage` est un placeholder de 31 lignes** qui n'utilise pas le param `:id` de sa route `/proprietaire/:id`. Affiche une carte teaser générique au lieu du profil propriétaire correspondant. À reconsidérer : soit implémenter une vraie page de présentation propriétaire, soit supprimer la route et le composant.

24. **`EmailMatchConfirmationPage` exposée comme route produit `/email-match-confirmation` sous `<DashboardLayout/>`** alors que c'est une preview HTML d'email transactionnel, pas une vraie page produit. À déplacer dans `/dev/` (cohérent avec la nouvelle convention `dev/` introduite le 25 avril pour les fixtures et previews).

25. **Route `/dev/rhythm-calendar-preview` sans garde auth** (page nue, hors `<DashboardLayout/>`). Pas critique car non liée dans la nav et le dossier `dev/` est un espace dev par convention, mais à ne pas oublier au moment du déploiement prod : soit supprimer toutes les routes `/dev/*` du build de production, soit ajouter une garde dev-mode (`if (!import.meta.env.DEV) return <Navigate to="/" />`).

26. **Chemin obsolète dans `sterny-react/.claude/commands/global.md`** : référence à `/Users/arnaudfourel/Desktop/STERNY/...` au lieu de `/Users/comefourel/Dev/sterny/...`. Ancienne référence d'un autre poste, à corriger pour que le slash-command reste utilisable.

27. **Faux positif "table fantôme `documents`"** dans l'audit Zone 1 Cat. C (rapport `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md`). En réalité `documents` n'est pas une table BDD mais un bucket Supabase Storage (`storage.from('documents')` utilisé dans `DossierLocatairePage`, `ModifierProfilPage`, `delete-account`). À reclasser : pas une dette de table fantôme. Le seul vrai cas de table fantôme reste `matchs` (DETTE #28).

28. **Table fantôme `matchs`** référencée dans `supabase/functions/export-data/index.ts:94` (`.from("matchs")`). N'existe pas dans `public.*` du schéma BDD. La fonction `export-data` n'est de toute façon pas déployée en prod (DETTE #17), mais à fixer en même temps que son déploiement. Le terme "match" correspond métier-wise à `candidatures` au statut `acceptee` ou à `mises_en_relation`.

29. **Token Mapbox public en dur dans `sterny-react/src/pages/public/RecherchePage.jsx:10`** (préfixe `pk.`). Pratique courante pour les tokens Mapbox publics, **mais uniquement si des restrictions de domaine sont activées sur le dashboard Mapbox**. À vérifier en console Mapbox : que le token est bien restreint au domaine `sterny.co` (et `localhost` pour le dev). Si non, l'activer immédiatement.

30. **Constantes dupliquées massivement dans 5+ pages** : `SYMMETRIC_OPTIONS` / `ASYMMETRIC_OPTIONS` (CompleterProfilPage, RecherchePage, HomePage, InscriptionRecherchePage, ModifierProfilPage), `SIGLES_ECOLES`, `ECOLES_POPULAIRES`, `ANNEES_ETUDES` (CompleterProfilPage, ModifierProfilPage), `MOTS_INTERDITS` et `PATTERNS_SUSPECTS` (CreerAnnoncePage, ModifierAnnoncePage), `CODE_POSTAL_VILLE` (idem). À factoriser dans `sterny-react/src/utils/constants/` ou équivalent. Cohérent avec le risque que ces constantes divergent silencieusement entre pages.

## Audits du 25 avril 2026 — divergences design tokens

Découvertes lors de la génération de l'audit `docs/_audit/AUDIT-DESIGN-2026-04-25.md` (rapport jetable, gitignoré). Toutes traitables en un commit unique de "design tokens harmonization" en Phase 0bis (catégorie C ménage).

31. **Variantes orthographiques du hover Orange** : `#D4571F` (3 hits) et `#D4561F` (3 hits) coexistent dans les CSS pour la même intention sémantique (hover de l'accent Orange `#E8622A`). À harmoniser sur une seule valeur (proposer `#D4571F` après vérification visuelle).

32. **Quatre variantes d'Orange pâle** coexistent comme fonds d'icône / badge : `#FFF1E8` (5 hits, le plus utilisé), `#FFF3EE` (2 hits), `#FDF0EB` (2 hits), `#FFF7ED` (3 hits). À harmoniser sur `#FFF1E8` partout.

33. **Trois chaînes de fallback différentes pour DM Sans** dans les CSS Sterny : `'DM Sans', system-ui, -apple-system, sans-serif` (récente), `'DM Sans', sans-serif` (minimaliste), `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif` (longue legacy). À harmoniser sur la chaîne moderne `'DM Sans', system-ui, -apple-system, sans-serif`. Bonus connexe : la police `Space Grotesk` est importée dans `sterny-react/src/index.css` ligne 1 mais n'est utilisée nulle part dans les CSS audités. Soit nettoyer l'import, soit l'utiliser comme display secondaire.

## Anomalies surfacées par la session du 25 avril fin de soirée bis (Bloc B Étape 1 close)

34. **`GoogleAuthHandler` à long terme : migrer vers une route `/auth/callback` dédiée**. Le fix du 25 avril fin de soirée bis (commit `9ea6e4d`, garde sur `location.pathname` dans le useEffect) est un correctif chirurgical qui résout le bug de redirection forcée vers `/dashboard` sur toute route métier, mais il ne corrige pas la cause racine : le composant fetch le profil au montage à la racine de l'app, ce qui mélange responsabilité de routing et responsabilité d'auth callback. Solution propre à terme : créer une route dédiée `/auth/callback` qui héberge ce handler, configurer Supabase et Google OAuth pour rediriger vers cette route au lieu de `/`, et démonter le composant de la racine d'`App.jsx`. À traiter en Phase 0bis ou au moment de l'intégration de Sign in with Apple (qui aura le même besoin de callback dédié). **Note** : le commit `9ea6e4d` cite cette dette comme "DETTE #35" dans son message — c'est une discordance assumée (la dette a finalement été numérotée #34 lors du log pour respecter la séquence numérique sans trou).

35. **Briques visuelles dashboard couplées à `DashboardProprietairePage.css`** : les classes `.dp-card`, `.dp-card-title` et `.dashboard-proprio-container` sont les briques standard de toute page dashboard Sterny (cf. INVENTAIRE-PLATEFORME §9), mais elles ne vivent que dans `sterny-react/src/pages/dashboard/DashboardProprietairePage.css`. Tout composant ou page qui veut réutiliser cette grammaire doit importer ce fichier, créant un couplage trompeur (le composant n'a rien à voir avec le propriétaire). Constat fait le 25 avril fin de soirée bis lors de l'intégration de `RhythmCalendar` dans la preview. À traiter en Phase 0bis (catégorie C ménage) : extraire ces classes dans un fichier partagé `sterny-react/src/components/dashboard/dashboard-tokens.css` (ou équivalent) et migrer les imports. Cohérent avec la fusion en cours des dashboards alternants (locataire, hote, les_deux) sur `/dashboard`.

36. **`RhythmCalendar` v1 visuel à refondre — calendrier horizontal en frise temporelle**. Le composant posé le 25 avril fin de soirée bis (commit `599e045`) est une v1 technique fonctionnelle (plomberie validée : props, gestion des cas dégradés, intégration dans `.dp-card`, fixtures versionnées) mais visuellement en dessous du standard Sterny. Constats de la validation visuelle : (1) la représentation verticale par mois/cases ne raconte pas naturellement la temporalité de l'alternance, (2) les chiffres isolés dans les cases sont sémantiquement vides — l'utilisateur doit décoder qu'il s'agit d'une semaine commençant ce lundi, (3) le composant n'a pas la qualité visuelle attendue d'un élément central du dashboard alternant. La version cible est une **frise temporelle horizontale** (gauche→droite = passé→futur), avec passé compressé/atténué, futur mis en avant, blocs continus école/entreprise plutôt que cases isolées avec chiffres, curseur "Aujourd'hui" pour ancrer l'utilisateur dans le temps. À traiter dans une session dédiée "Bloc B redesign visuel" avec cadrage design en amont (références visuelles, maquettes papier, validation 2-3 directions). Ne pas considérer le composant comme abouti tant que le redesign n'est pas fait. À cette occasion, remplacer aussi l'emoji 📅 de la preview par une vraie icône SVG dans la pill `.dp-card-icon` (cf. INVENTAIRE-PLATEFORME §9.2).

## Anomalies surfacées par la session du 26 avril (Bloc B Étape 2 — tests parser)

37. **Parser rhythm_calendar non fiable sur les 2 formats testés — limite structurelle du parsing par vision LLM**. Découverte majeure de la session du 26 avril après tests utilisateur sur 2 plannings réels :

    - **Planning_Martin.JPG** (image, 4 groupes, IUT Saint-Malo BUT 3 GEA) : ~50% des cellules incorrectes sur les 4 groupes. Erreurs aléatoires (pas de pattern systémique inversion ou décalage). Le parser semble faire du remplissage statistique quand il n'arrive pas à lire la couleur d'une cellule.
    - **Planning_Mathis.pdf** (PDF Hyperplanning, 1 seul groupe, légende explicite) : également échec — alors que le format est trivialement structuré (1 colonne, légende visuelle claire "En Entreprise" / "Formation au centre" / "Jours fériés"). Le parser remplit des blocs entiers en école qui devraient être en entreprise.

    **Diagnostic** : limite structurelle du parsing par vision LLM. Les calendriers d'alternance encodent l'information dans la **couleur de fond des cellules**, pas dans le texte. Les LLM vision (Claude, GPT-4o, Gemini) ne sont pas fiables sur du parsing pixel-par-pixel à grande échelle (180 cellules à classer pour Martin, 250+ pour Mathis). Quand le modèle doute, il devine — d'où le pattern d'erreurs aléatoires observé.

    **Aucun prompt engineering ne corrige ce problème** : c'est une limite intrinsèque de la modalité "vision" des LLM actuels, pas un défaut du prompt v5.

    **Impact stratégique** : le principe fondateur de Sterny (VISION-ARCHITECTURE §1) repose sur la fiabilité du parser. Risque #4 de VISION §5 (fiabilité perçue même quand ça marche) vient de se matérialiser — bien au-delà du seuil acceptable (50%+ d'erreur, pas 1 semaine).

    **3 leviers possibles à arbitrer dans une session dédiée** :
    - **Levier 1** : tester un autre LLM vision (GPT-4o, Gemini 2.5 Pro) via la branche providers/ déjà en place. Probabilité de succès faible — tous les LLM vision ont la même limite structurelle, mais le test mérite d'être fait pour confirmer ou infirmer.
    - **Levier 2** : pipeline hybride (extraction structurée + LLM pour le mapping métier). Pour les PDFs : pdfplumber ou pdf-lib pour extraire texte + couleurs de fond cellule par cellule, puis LLM uniquement pour interpréter la légende. Pour les images : OCR + détection de couleur par zones, puis LLM pour le mapping. Probabilité de succès élevée mais chantier de 2-4 sessions.
    - **Levier 3** : pivoter le produit vers la saisie manuelle assistée. L'utilisateur saisit son rythme via une UI dédiée (probablement RhythmCalendar v2 frise horizontale en mode édition, cf. DETTE #36). L'IA devient une option qui pré-remplit, l'utilisateur corrige systématiquement. La validation visuelle (VISION §4) devient l'étape principale.

    **Reco actée en session** : combiner Levier 2 + Levier 3 sur le moyen terme. La saisie manuelle assistée est de toute façon nécessaire comme fallback robuste, et le pipeline hybride lève la dépendance à une lecture pixel parfaite. La décision finale sur le séquencement (lequel attaquer en premier) est à prendre dans une session dédiée avec cadrage produit complet.

    **Statut de la fonctionnalité d'upload** : la chaîne UX (composant RhythmFileUpload + preview + sélecteur de groupe + fetch BDD + rendu RhythmCalendar) est **techniquement opérationnelle** — drop, états, erreurs typées, intégration Supabase. C'est uniquement la fiabilité du parser sous-jacent qui est en cause. Le composant peut donc rester en place sans modification immédiate, en attendant l'arbitrage stratégique.

    **Statut au 27 avril 2026 — session de cadrage tenue, décision reportée à une session de recherche profonde.** Levier 1 éliminé empiriquement : test à la main de GPT-4o (5/10) et Gemini (4/10) sur 10 premières semaines de FA CG2P (G1) du Planning_Martin.JPG. Tous les LLM vision actuels échouent au même niveau, ce qui confirme que la limite est structurelle (modalité vision sur classification couleur à grande échelle) et non spécifique à un provider. Test technique sur Mathis : PDF identifié comme vectoriel (texte sélectionnable dans Aperçu), mais faisabilité d'extraction couleur de fond cellule par cellule **non encore démontrée** — le caractère vectoriel du texte ne garantit pas que les fonds de cellules soient eux-mêmes vectoriels et lisibles programmatiquement. Aucune décision actée sur le levier à privilégier : la session de cadrage a fait émerger qu'aucune des 3 options documentées (Levier 1/2/3) ne doit être tranchée tant qu'une recherche technique approfondie n'a pas exploré l'ensemble des techniques disponibles pour combiner plusieurs signaux (couleur + texte intra-cellule + position + légende + métadonnées PDF) en un pipeline multi-signaux. Cette recherche est le prérequis de toute décision d'architecture. Voir ETAT-COURANT.md section 0 du 27 avril pour le plan de la session de recherche.

    **Statut au 29 avril 2026 — DETTE #37 close stratégiquement.** Les deux spikes techniques ont été menés à terme :

    - **Spike #1** (PDFs vectoriels via pdf.js getOperatorList) : verdict GO à **99.1% consolidé** sur Mathis (100%) et Matthieu (98.1%), 162 semaines testées.
    - **Spike #2** (images raster via algorithme manuel sur ImageData en TypeScript Deno pur) : verdict GO à **93.33%** sur Martin FA CG2P G1, 45 semaines testées. Trois erreurs résiduelles tracées en DETTE #41.

    L'arbitrage F1/F2/F3 (leviers 1, 2, 3) est tranché : levier 1 (autre LLM vision) éliminé empiriquement le 27 avril 2026 (GPT-4o 5/10, Gemini 4/10 sur 10 semaines Martin), leviers 2 et 3 retenus en combinaison sous forme d'une **stratégie discriminante par format source** :

    - PDFs vectoriels → pdf.js getOperatorList (chemin automatique 1)
    - Images raster → algorithme manuel sur ImageData avec ancrage manuel UI (chemin automatique 2)
    - Tout le reste → saisie manuelle assistée (chemin 3, couche universelle, à concevoir séparément)

    La décision est formalisée dans VISION-ARCHITECTURE.md §5 ("Stratégie discriminante par format source"), qui devient la référence canonique sur l'architecture parser de Sterny.

    **Implémentation production restant à faire** (cette dette est résolue stratégiquement, pas opérationnellement) :

    - Industrialisation du chemin 1 dans une Edge Function dédiée (ou dans `parse-school-calendar` existante après refactor) : intégration de pdf.js, heuristique de détection de PDF vectoriel exploitable, parsing complet de fixtures supplémentaires au-delà de Mathis et Matthieu.
    - Industrialisation du chemin 2 : intégration de l'algorithme dans une Edge Function Deno, conception et implémentation de l'UI d'ancrage manuel (clic des deux ancres, validation visuelle des 45 cellules calculées avant confirmation), gestion de la précision d'ancrage (cf. apprentissage du spike #2 : 2 px d'erreur = 4 cellules mal classées).
    - Investigation et résolution de DETTE #41 (3 erreurs résiduelles spike #2) avant industrialisation chemin 2.
    - Conception détaillée et implémentation du composant de saisie manuelle assistée (chemin 3), à cadrer en session dédiée.
    - Aiguillage à l'upload : règle d'orientation du fichier vers le bon chemin selon MIME type et heuristique vectorielle, avec fallback systématique vers le chemin 3 en cas d'échec d'un chemin automatique.

    Ces chantiers seront tracés au fil des sessions dans ETAT-COURANT.md et logueront leurs propres dettes au moment de leur cadrage. La dette stratégique #37 est résolue, les dettes d'implémentation lui succèdent.

38. **Information périmée dans ETAT-COURANT sur la signature de RhythmCalendar**. Découvert lors du fix de la preview avec sélecteur de groupe le 26 avril : la session du 25 avril après-midi (Bloc B Étape 0 close) avait mentionné une signature `<RhythmCalendar parsedGroups={...} mode="readonly" selectedGroupId={...} onSelectGroup={...} />` dans son plan de démarrage Étape 1. La signature finale livrée le 25 avril fin de soirée bis (commit 599e045) est en réalité plus simple : `({ weeks, groupLabel, documentMeta, className })`. Le contrat unifié `weeks` posé en Étape 1 a remplacé l'API multi-props envisagée initialement. Pas un bug, juste une trace périmée dans l'historique d'ETAT-COURANT — la nouvelle session du 26 avril a reposé sur ce point pour rectifier. À noter pour les futures sessions : la source de vérité pour la signature actuelle de RhythmCalendar est le code lui-même (`sterny-react/src/components/rhythm/RhythmCalendar.jsx`), pas les sections historiques d'ETAT-COURANT.

39. **Composant RhythmFileUpload — UI à reprendre lors du redesign Bloc B**. La v1 du composant posée le 26 avril (commit 7b33fa8) est techniquement fonctionnelle (6 états, validations client, multipart/form-data vers Edge Function, callbacks typés sur 6 codes d'erreur) mais visuellement non aboutie selon les standards Sterny (cf. INVENTAIRE §9). Constat utilisateur en session : "rien sur cette page ne me satisfait visuellement". À reprendre dans la même session que le redesign de RhythmCalendar (DETTE #36) pour cohérence visuelle d'ensemble — les 2 composants seront posés côte à côte dans le futur RhythmOnboarding (Bloc B Étape 3) et doivent partager la même grammaire raffinée. Pas urgent — la priorité reste le diagnostic et la résolution du problème parser (DETTE #37).

## Anomalies surfacées par la session du 28 avril nuit (spike #1 étape 1B.6.1)

40. **Trou de couverture silencieux pdf.js sur la Soutenance M2 Matthieu — 2 cellules manquantes sur 5**. Découvert pendant l'analyse exploratoire 1B.6.1 (28 avril nuit) sur output-matthieu-cells.json page 2. Côme observe visuellement 5 cellules rouges consécutives (lundi 1 → vendredi 5 juin 2026) marquant la semaine de Soutenance pour le master 2 CCA. Pdf.js extrait seulement 3 fills #ff0000 sur les jours 1, 2, 3 juin (lundi-mardi-mercredi). Les fills correspondant aux jours 4 et 5 juin (jeudi-vendredi) sont absents du JSON sous toute couleur proche du rouge (filtre RGB élargi exécuté, R>=C0 et G<=80 et B<=80, aucun fill trouvé dans la zone géométrique attendue). Aucun compteur "non supporté" ne signale ce manque : unsupportedFillsCount = 0, unsupportedFillsBecauseColorN = 0, unsupportedFillsBecauseNullColor = 0 sur les 2 pages. Le phénomène est silencieux : pdf.js ne sait pas qu'il a raté ces cellules. Impact quantitatif : 2 jours école sur ~250 jours/an pour le seul M2, soit ~0.8% d'erreur, négligeable en valeur absolue. Impact qualitatif : préoccupant car indétectable sans observation visuelle humaine. À approfondir en clôture spike #1 ou en spike dédié si reproduit sur d'autres fixtures. Hypothèses à investiguer : (a) ces cellules sont peintes par un opérateur PDF non capté par notre parser (autre que setFillRGBColor), (b) elles font partie d'un objet plus complexe (groupe, image embarquée locale), (c) elles sont dans un layer optionnel non rendu. Hors scope 1B.6.2 — le script de matching doit fonctionner avec les données extraites disponibles, pas tenter de reconstruire ce qui manque.

**Mise à jour 29 avril 2026 — addendum 1B.6.2** : la dette n'est pas résolue (le trou silencieux reste, 2 cellules sur 5 manquantes sur la Soutenance M2), mais son **impact sur le score de matching est nul tant que la perte est ≤2 jours par semaine de 5 jours école**. Politique majorité 3/5 du contrat accumulateur (VISION §4) : 3 votes `school` sur 5 ⇒ `status = school`, attendu = `school` ⇒ match. Confidence dégradée à 0.6 au lieu de 1.0 sur la semaine concernée, signal correct du contrat accumulateur. Validé empiriquement par 1B.6.2 : score M2 obtenu = 100% = plafond théorique. Investigation des hypothèses (a)/(b)/(c) ci-dessus reste hors scope tant que le phénomène n'est pas reproduit sur d'autres fixtures.

## Anomalies surfacées par la session du 29 avril soirée (spike #2 étape 1B)

41. **Spike #2 Martin — 3 erreurs résiduelles à 93.33% sur cellules à hex verdâtre ambigu**. Découvert pendant l'étape 1B du spike #2 (29 avril soirée) sur Martin FA CG2P G1. 3 cellules sur 45 produisent un mismatch persistant après recalibrage de l'ancrage manuel : semaines 2 (`#cdd72e` prédit jaune→school, observé company), 5 (`#bad431` prédit vert→company, observé school), 9 (`#b7d332` prédit vert→company, observé school). Ces 3 hex ont des composantes R et G très proches (R∈[183, 205], G∈[211, 215]), zone de transition entre les buckets "jaune" (R>200 ET G>180 ET B<150) et "vert" (G>R ET G>B). Trois causes possibles non tranchées en fin de session : (a) bruit JPG localisé sur ces cellules spécifiques (compression chroma subsampling), (b) ambiguïté visuelle réelle (cellules vert-citron qu'un humain pourrait classer dans un sens ou l'autre), (c) défaut d'alignement vertical résiduel non résolu — Côme a observé en fin de session que "tous les markers semblent légèrement décalés vers le haut" malgré le recalibrage Y_FIRST 535→537. Investigation à reprendre en session ultérieure avant industrialisation production. Hypothèses à tester dans l'ordre : (1) ré-ancrer plus précisément en partant d'un screenshot zoomé partagé entre Côme et Claude, (2) élargir la fenêtre d'échantillonnage à 9×9 ou 11×11 pour absorber le bruit JPG, (3) ajouter un 3e bucket "ambigu" pour les hex à composantes R-G proches et router vers la saisie manuelle assistée. Impact actuel : aucun sur la décision DETTE #37 (verdict cascade A déjà acquis à 93.33% ≥ seuil 80%). Impact production : à mesurer sur les 3 autres groupes FA Martin (étape 2 spike #2 reportée).

    **Statut au 30 avril 2026 — diagnostic enrichi, hypothèses initiales (a), (b), (c) éliminées ou recadrées.** Investigation menée en 2 sessions de debug, traces dans les fichiers `debug-dette-41.ts`, `debug-dette-41-markers.png`, `debug-dette-41-colors.json`, `etape-1c-debug-palette-filter.ts` et `etape-1c-results.json` du dossier spike #2.

    **Première session debug — échantillonnage multi-positions sur les 3 cellules erronées.** Pour chaque semaine 2, 5, 9, on a échantillonné 13 hex à des positions précises autour du centre calculé (centre + 8 voisins ±5 px + 4 voisins ±10 px), plus le hex moyen filtré luminance 7×7. Constat numérique :

    - Cellule semaine 2 : dispersion énorme (R varie de 74 à 255, B de 0 à 77 dans la même fenêtre 7×7). Pattern de gradient vertical : très lumineux en haut de la fenêtre, très sombre en bas.
    - Cellules semaines 5 et 9 : centre lui-même est très sombre (luminance < 80, exclu par le filtre actuel). Trait sombre horizontal qui traverse la cellule au niveau de y=0 dans la fenêtre. Diagonales (±5, ±5) : alternance jaune lumineux et vert moyen.

    Ces patterns sont **structurés** (gradient vertical, trait horizontal), pas aléatoires. Cela élimine l'hypothèse (a) bruit JPG. Et les 13 hex ne sont pas similaires entre eux — cela élimine l'hypothèse (b) cellule à teinte vert-citron uniforme. Les hex `#cdd72e`, `#bad431`, `#b7d332` ne sont pas des couleurs de cellules : ce sont des médianes calculées sur des fenêtres contaminées par un mélange jaune lumineux + vert moyen + sombre.

    **Seconde session debug — approche B (filtre par distance euclidienne RGB à la palette extraite automatiquement).** Le filtre luminance [80, 230] a été remplacé par un filtre palette : extraction des centroïdes jaune et vert sur les 42 cellules non-erronées (centroïdes obtenus `#f2f21f` jaune et `#96ca56` vert, cohérents avec la palette de l'étape 0 du spike), puis classification par distance euclidienne avec un seuil RAYON_PALETTE=80. Score obtenu : **91.11% (41/45)**, soit une régression d'1 cellule vs le filtre luminance (93.33% au run 2 1B). Les 3 cellules erronées initiales (2, 5, 9) restent en erreur, et 1 nouvelle cellule (semaine 7) bascule en "ambigu".

    **Pattern frappant dans la sortie 1C** : sur les semaines 5, 7, 9, la fenêtre 7×7 contient exactement **21 pixels classés jaune et 21 pixels classés vert** (égalité parfaite). Une fenêtre 7×7 a 49 pixels organisés en 7 lignes de 7. La distribution 21+21+7 correspond précisément à 3 lignes complètes d'un côté, 3 lignes complètes de l'autre côté, 1 ligne médiane rejetée (les 7 pixels de cette ligne sont à mi-chemin entre les 2 centroïdes, donc rejetés par le filtre palette). Cela révèle que **la frontière entre la cellule cible et la cellule adjacente passe pile au milieu de la fenêtre 7×7**.

    **Diagnostic structurel au 30 avril** : le problème n'est ni couleur, ni bruit, ni alignement uniforme. C'est une **inexactitude cumulative de la division uniforme entre les 2 ancres cliquées**. step = 15.16 px arrondi à l'entier le plus proche par cellule, ce qui accumule des sous-pixels d'erreur jusqu'à ce que certains markers tombent pile sur des bordures inter-cellules. Aucun ajustement du filtre couleur (luminance, palette, ou autre) ne peut résoudre cela — c'est un défaut géométrique, à corriger côté géométrie.

    **Hypothèse (c) recadrée** : ce n'est pas un décalage uniforme vertical de tous les markers ("tous décalés vers le haut"), c'est une accumulation d'erreurs de fraction de pixel qui se manifeste par chevauchement de bordures sur certaines cellules spécifiques (celles dont la position calculée tombe pile sur la frontière entre 2 cellules).

    **Implication produit, à reprendre en session stratégique fraîche** : viser 100% automatique sur image raster est probablement disproportionné. Les options pour passer au-dessus de 93.33% sont coûteuses (ancrage multi-clics au lieu de 2, détection automatique de bordures par projection, fenêtre dynamique recadrée selon la position dans la cellule) et ne traitent qu'un défaut structurel mineur de l'approche par division uniforme. La vraie question — à traiter en session dédiée — est le **rôle attendu de l'algorithme automatique dans la chaîne UX** : "pré-remplit, l'utilisateur valide" risque de produire des erreurs validées par réflexe sur une cible jeune (cf. VISION §7 risque 4). Une architecture "suggère, l'utilisateur construit" demande moins à l'algo. Cette question parquée touche aussi le chemin 1 (PDF vectoriel à 99.1%) et déborde le scope DETTE #41.

    DETTE #41 reste **ouverte** : la question des 3 erreurs résiduelles sera reprise lors du cadrage du chemin 3 VISION §5 (composant de saisie manuelle assistée), où elle se résoudra naturellement par la couche de validation visuelle obligatoire — ou disparaîtra si l'on reformule le rôle de l'algo automatique en suggesteur plutôt que pré-remplisseur.

    **Statut au 30 avril 2026 fin de journée — éligible à clôture, conditionnée au verdict du spike #4 magick-wasm.** Le spike #3 (homographie 4 ancres bloc Martin entier) a confirmé l'hypothèse de DETTE #41 : remplacer la division uniforme entre 2 ancres par une transformation par homographie sur 4 ancres élimine l'accumulation d'erreur subpixel et fait passer le score G1 de 93.33 % (spike #2) à 97.78 % (spike #3), soit +4.45 points attribuables exclusivement au changement d'ancrage. Le défaut géométrique diagnostiqué par cette dette est résolu par construction.

    Le score consolidé 4 groupes du spike #3 (94.44 % = 170/180) reste sous le seuil cible 97 %, mais le plafond résiduel est diagnostiqué comme un problème de **classification couleur** (10 erreurs sur 180, toutes de profil predit=company / observe=school sur des hex jaune-verdâtres à la frontière du bucket). Ce plafond est hors périmètre de DETTE #41 (qui porte sur la géométrie d'ancrage, pas la classification couleur). Voir DETTE #43 (nouvelle, créée par cette même session de clôture).

    DETTE #41 est éligible à clôture définitive. La clôture sera prononcée à la fin du spike #4 magick-wasm, selon le verdict :
    - Si magick-wasm ouvre une voie qui supprime entièrement l'algo manuel ImageData → DETTE #41 disparaît par changement de chemin technique.
    - Si l'algo manuel ImageData avec homographie 4 ancres reste retenu → DETTE #41 est close, l'homographie est documentée comme la voie de référence pour le chemin 2 image raster.

    Voir docs/spikes/2026-04-30-03-homographie-3-4-ancres/RESULTS.md pour le détail complet.

## DETTE #42 — Anomalies de saisie CSVs vérité terrain Martin G3/G4

**Statut au 30 avril 2026 après-midi (post-spike #3) — DETTE #42 close.** Passe dédiée de nettoyage exécutée en début de session du 30 avril après-midi (post-spike #3), avant ouverture du spike #4. Les 3 corrections ont été appliquées sur les CSVs vérité terrain Martin (gitignored, donc corrections sur disque uniquement, pas en commit) :

1. Format à 8 colonnes ramené à 5 colonnes sur la ligne 2026-10-12 du fichier `martin-ground-truth-g3-gema-log.csv` (1 ligne corrigée).
2. Format à 8 colonnes ramené à 5 colonnes sur la ligne 2026-10-12 du fichier `martin-ground-truth-g4-gema-md.csv` (1 ligne corrigée).
3. Label de groupe `FA_GEMA_LOG_G4_2026-2027` remplacé par `FA_GEMA_MD_G4_2026-2027` sur les 45 lignes du fichier `martin-ground-truth-g4-gema-md.csv` (45 lignes corrigées).

Vérifications post-corrections : 4 lignes 2026-10-12 propres à 5 colonnes sur l'ensemble des CSVs, 0 occurrence du label fautif dans le dossier `docs/fixtures-ground-truth/martin/`, 45 occurrences du label correct dans le fichier g4. État de la vérité terrain Martin propre pour le spike #4.

**Statut au 30 avril 2026 fin de journée** : créée pendant la passe d'exécution du spike #3, hors-scope du spike (préservation de la discipline « une variable change à la fois »). À traiter en passe dédiée de nettoyage CSV avant tout futur spike de mesure parser sur Martin qui ferait du filtrage par préfixe de groupe.

Deux anomalies distinctes ont été remontées dans `docs/fixtures-ground-truth/martin/` :

1. **Format à 8 colonnes au lieu de 5 sur G3 et G4 sem 7 (2026-10-12)** : les 2 lignes ont 3 virgules surnuméraires en queue + une duplication du champ `statut_business` en colonne 5. Probable scorie de saisie. Sans impact sur run.ts du spike #3 (qui split puis lit `cols[2]` en ignorant les colonnes surnuméraires) mais à normaliser pour propreté et pour éviter les pièges sur des parsers CSV plus stricts.

2. **Label de groupe G4 incorrect sur les 45 lignes de `martin-ground-truth-g4-gema-md.csv`** : la colonne `groupe` contient `FA_GEMA_LOG_G4_2026-2027` au lieu de `FA_GEMA_MD_G4_2026-2027` (probable copier-coller depuis G3 lors de la saisie). Sans impact sur le spike #3 (run.ts ne filtre pas par préfixe, lecture directe par chemin de fichier) mais piège silencieux pour tout futur run cross-fixture qui matcherait par préfixe groupe — l'erreur passerait inaperçue jusqu'à ce qu'un croisement de données échoue sans message clair.

**Action de clôture** : passe dédiée de correction CSV (~10 minutes), à exécuter avant le spike #4 ou avant tout autre traitement cross-fixture. Pas urgent mais à ne pas oublier.

## DETTE #43 — Plafond du bucket de classification couleur sur teintes ambiguës

**Statut au 30 avril 2026 fin de journée** : créée par le spike #3 qui a diagnostiqué le facteur limitant du score consolidé après résolution de DETTE #41.

Le bucket de classification couleur actuel (hérité du spike #2) :
- `R>200 && G>180 && B<150 → jaune (school)`
- `G>R && G>B → vert (company)` (hors jaune)
- sinon → autre (unknown)

Sur les 10 erreurs résiduelles du spike #3, le profil est **systématique** : `predit=company / observe=school` sur des hex de cellule à composantes RGB ≈ (180-190, 210-215, 40-50). La règle `G>R && G>B → vert` classe ces hex en vert (G domine R de 15-25 unités sur 255) alors qu'ils sont visuellement jaunes dans le PDF. La règle n'a pas de zone tampon entre les 2 buckets.

**Pistes de résolution à arbitrer** :
1. Élargir la plage jaune sur l'axe G/R (par exemple `G > R-20 && B<150 → jaune` au lieu d'exiger `G > R`).
2. Remplacer la règle déterministe par un classifieur k-NN (k Nearest Neighbors — méthode statistique de classification : on a une palette de référence avec couleurs étiquetées, et chaque hex de cellule est classé selon la couleur de référence la plus proche en distance RGB ; plus robuste aux teintes frontière qu'une règle binaire).
3. Pré-traiter l'image via magick-wasm (saturation, contraste, lissage colorimétrique) pour augmenter l'écart entre les buckets avant échantillonnage. Cette piste est partiellement testée par le spike #4 (mission complémentaire ajoutée à son cadrage par le verdict du spike #3).

**Décision de planning** : DETTE #43 sera adressée selon le verdict du spike #4 :
- Si magick-wasm résout cette dette par effet de bord (option 3) → DETTE #43 close.
- Sinon, ouverture d'un spike #5 dédié à la classification couleur (option 1 ou 2 à arbitrer).

Voir docs/spikes/2026-04-30-03-homographie-3-4-ancres/RESULTS.md section 5 pour le détail des 10 erreurs résiduelles.

## DETTE #44 — UX mobile globale non aboutie depuis la création

**Statut au 30 avril 2026 soir bis** : créée par la session de cadrage `RhythmManualBuilder` v1 (chemin 3 VISION §5).

Constat verbalisé par Côme en session : « pour le mobile c'est la catastrophe, pas du tout réfléchi depuis la création ». La plateforme Sterny est conçue principalement sur desktop, et l'adaptation mobile n'a pas fait l'objet d'un travail dédié. Conséquence : les écrans qui semblent corrects sur Mac sont potentiellement inutilisables sur téléphone, ce qui contredit la cible utilisateur (jeune alternant qui fait tout sur son téléphone, voir VISION §10 « L'application mobile native est différée, pas dépriorisée »).

**Périmètre à investiguer** : tous les composants frontend du projet, mais en priorité ceux du parcours d'inscription et de recherche (entrée critique des nouveaux utilisateurs).

**Conséquence sur les composants en cours de développement** : `RhythmManualBuilder` v1 (chemin 3) est explicitement cadré desktop-only en première version. Sa responsiveness mobile sera reprise dans le cadre de la passe globale UX mobile, pas en spike isolé.

**Plan de résolution** : passe dédiée UX mobile à programmer après la démo Le Poool du 4 mai. Audit page-par-page sur navigateur mobile (DevTools → mode responsive Chrome ou Firefox), liste des défauts observés, priorisation des chantiers de refonte. Pas de fix anticipé tant que l'audit n'est pas complet — risque de patcher les symptômes sans traiter les causes (probablement un manque de tokens responsive dans le design system ou des grids qui ne s'adaptent pas).

**Sujet distinct de VISION §10 (app mobile native différée)** : VISION §10 traite de la décision stratégique de différer l'app native iOS/Android. DETTE #44 traite de la qualité responsive du web actuel, qui doit rester utilisable sur mobile en attendant l'app native. Les 2 sujets sont complémentaires.

## DETTE #45 — Wording v1 modale Q8 + pop-up Q9 RhythmManualBuilder à valider par avocat

**Statut au 1er mai 2026 matin** : créée par la session de cadrage `RhythmManualBuilder` v1 (chemin 3 VISION §5).

Le wording de la modale de prévention affichée au clic "Confirmer mon planning" et celui du pop-up affiché sur les actions protégées (`/recherche`, `/annonce/creer`, candidater) ont été rédigés en interne pour la démo Le Poool du 4 mai 2026. Objectif : faire le job pédagogique auprès des testeurs sans contenir de formulation à effet contractuel ou de décharge de responsabilité (interdictions explicites au moment de la rédaction : pas de "vous reconnaissez", "vous acceptez", "Sterny ne pourra être tenu responsable", "à vos risques et périls", "vous êtes seul responsable", etc.). Les deux risques utilisateurs sont énoncés en conséquences factuelles (présence simultanée dans le logement, paiement d'une semaine non occupée) sans clause d'exonération.

**Pourquoi cette dette existe** : informer un utilisateur qu'une saisie incorrecte peut conduire à un conflit avec un autre alternant ou à un paiement indu touche aux questions de responsabilité de la plateforme et au modèle contractuel (cf. CONTEXTE-PROJET.md §9 et VISION-ARCHITECTURE.md §10). Un wording mal calibré peut soit créer une obligation que Sterny n'est pas en mesure d'assumer, soit dégager une responsabilité qu'on n'a pas le droit de dégager unilatéralement, soit n'être tout simplement pas opposable.

**Choix de vocabulaire actés en v1, à challenger en consultation avocat** :

- Le terme « colocataire » a été explicitement écarté du wording v1 car factuellement faux dans le modèle Sterny (pas de cohabitation, pas de loi ALUR, pas de responsabilité solidaire). Remplacé par « un autre alternant ».
- Le verbe « facturer » a été écarté car il préjuge de l'émetteur de la facture dans la chaîne contractuelle (Sterny vs propriétaire), point non tranché tant que le montage juridique n'est pas validé. Remplacé par « payer », qui décrit le flux financier sans préjuger de qui émet.
- La phrase « vous paierez pour une semaine que vous n'occuperez pas » suppose que l'utilisateur final est partie au paiement — à reconfirmer une fois le modèle contractuel gelé.
- L'expression « un autre alternant » couvre uniquement le pitch principal alternant↔alternant (VISION §1 principe fondateur). Elle ne couvre pas le cas où l'autre partie est un propriétaire non-alternant (CONTEXTE §3 type_user `proprietaire`). Choix assumé pour la démo Le Poool. À élargir si pertinent en v2 du wording, après validation que ce cas existe bien dans le modèle déployé.

**Texte v1 archivé** (référence pour l'étape 3 RhythmManualBuilder.jsx) :

### Modale Q8 — déclenchée au clic "Confirmer mon planning"

**Titre** : `Avant de confirmer, vérifiez votre planning`

**Corps** :

> Ce calendrier indique les semaines où vous serez présent dans le logement que vous cherchez. Sterny s'en sert pour vous mettre en relation avec un autre alternant dont les semaines de présence sont opposées aux vôtres — pour que vous n'occupiez jamais le logement en même temps.
>
> Deux types d'erreurs peuvent avoir des conséquences une fois le bail signé :
>
> — Si vous oubliez de cocher une semaine où vous serez réellement présent, vous pouvez vous retrouver dans le logement en même temps que l'autre alternant cette semaine-là.
>
> — Si vous cochez une semaine où vous serez en réalité ailleurs, vous paierez pour une semaine que vous n'occuperez pas, et l'autre alternant croira le logement occupé.
>
> Prenez un instant pour comparer ce calendrier à votre planning officiel d'alternance avant de continuer.

**Boutons** : `Revenir au calendrier` (secondaire, fond blanc bordure navy) / `Confirmer mon planning` (primaire, fond orange `#E8622A`).

### Pop-up Q9 — déclenché au clic sur action protégée si rhythm_calendar est NULL ou vide

**Titre** : `Complétez votre planning d'alternance`

**Amorce variable selon l'action protégée** :

| Action | Amorce |
|---|---|
| Recherche (`/recherche`) | `Pour chercher un logement sur Sterny,` |
| Créer annonce (`/annonce/creer`) | `Pour publier une annonce sur Sterny,` |
| Candidater | `Pour candidater à cette annonce,` |

**Suite commune** (s'enchaîne directement après l'amorce sans saut de ligne) :

> votre planning d'alternance est nécessaire — c'est lui qui permet à Sterny de vous mettre en relation avec un autre alternant dont le rythme est compatible avec le vôtre.
>
> Vous pouvez le compléter en quelques minutes maintenant, ou plus tard depuis votre profil.

**Boutons** : `Plus tard` (secondaire, ferme le pop-up sans rediriger) / `Compléter mon planning maintenant` (primaire orange, redirige vers `/completer-profil` à l'étape calendrier).

**Densité du wording v1 — point UX à acter en parallèle de la consultation avocat (2 mai 2026 après-midi)**

Côme a remonté en validation visuelle de l'étape C que le wording v1 de la modale Q8, bien qu'irréprochable juridiquement, est trop dense et lourd pour être effectivement lu par un utilisateur. 5 paragraphes consécutifs avec 2 tirets cadratins constituent un pavé de texte que les jeunes alternants (cible Sterny) ne liront pas en pratique. Le risque produit n'est plus juridique mais fonctionnel : un wording non-lu ne fait pas le job pédagogique qu'il prétend faire.

**Acceptable pour la démo Le Poool** : les évaluateurs institutionnels liront le wording attentivement. Donc on garde le wording v1 tel quel pour la présentation du 4 mai 2026.

**À reprendre avant production** : la consultation avocat (déjà prévue en plan de résolution) doit inclure une demande explicite de réécriture en version compacte — 2 phrases d'avertissement clair, plutôt que 5 paragraphes — qui conserve l'absence de formulations contractuelles interdites tout en étant effectivement lisible. Test attendu : un utilisateur de 20 ans doit comprendre les 2 risques en moins de 10 secondes. Cible : modale tient en 1 écran sans scroll, total ≤ 60 mots.

**Plan de résolution** : faire valider les deux wordings par un avocat spécialisé en droit du logement et droit de la consommation avant tout déploiement en production. La consultation est listée comme prérequis dans VISION-ARCHITECTURE.md §10. À intégrer dans la liste des consultations professionnelles pré-lancement.

**Localisation des wordings** : commentaire `// TODO validation avocat avant production` à poser au-dessus de chacun des 2 textes dans le code source — chercher cette chaîne pour les retrouver. Concerné en première intégration : `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx` (modale Q8) et le composant pop-up Q9 (nom à arrêter à l'étape 4, probablement `sterny-react/src/components/rhythm/RhythmRequiredPopup.jsx`).

## DETTE #46 — Modèle de données multi-années pour utilisateurs récurrents

**Statut au 2 mai 2026 après-midi** : créée par l'arrêt du cadrage de l'étape C lorsque Côme a identifié que la décision de structure pour la saisie multi-années touche à un fondement architectural transversal (`rhythm_imports`, contrats, transitions entre années, matching année en cours).

**Constat** : Sterny est conçu pour des utilisateurs qui resteront sur la plateforme plusieurs années (formation alternance 2-3 ans typique, plus si renouvellements). Un utilisateur va inscrire son planning de l'année 1, signer un contrat A, finir cette année. Démarrer l'année 2, re-saisir son nouveau planning, signer un contrat B, potentiellement avec un autre alternant. Et ainsi de suite. La probabilité qu'un seul match couvre 3 ans à 100% est très faible donc le modèle doit nativement supporter une succession de plannings annuels et de contrats indépendants, sans bug, sans mélange entre années, sans confusion entre contrats déjà signés et contrats à venir.

**Sujets à cadrer (liste indicative non-exhaustive)** :

- Modèle de stockage des plannings annuels successifs (1 ligne `rhythm_imports` par année académique vs ligne unique consolidée).
- Détermination de l'année active pour le matching à un instant T (par fenêtre de dates de chaque import vs `users.rhythm_import_id` unique).
- Cohérence avec VISION §6 « Multi-fichiers et historique » (les contrats référencent des dates explicites, pas le rythme source).
- Transition entre années (utilisateur qui re-saisit en septembre N, planning N-1 doit rester consultable, planning N devient actif).
- Cas particuliers : changement d'école entre 2 années, année de césure, rupture de contrat en cours d'année, chevauchement contractuel sur 1 semaine de transition.
- Évolution de la RPC `confirm_rhythm_calendar_manual` pour accepter une saisie multi-années en une seule confirmation utilisateur (cf. principe VISION §10 « pas de découpage technique imposé à l'utilisateur »).

**Impact sur la v1 démo Le Poool du 4 mai 2026** : aucun. La v1 supporte 1 année académique à la fois, suffisant pour démontrer le concept. Le cas multi-années en saisie est rare et improbable en démo.

**Bloquant pré-production** : oui. Aucun lancement opérationnel ne peut être fait tant que ce modèle n'est pas tranché et implémenté, sinon le premier utilisateur qui revient pour son année 2 trouve un système qui ne sait pas quoi faire.

**Plan de résolution** : 1 ou 2 sessions Claude.ai dédiées pour cadrer le modèle. Premier livrable : un document `docs/recherche/MODELE-MULTI-ANNEES.md` qui décrit les scénarios, les options de modèle, et tranche par grand bloc (stockage, matching, transitions, contrats). À programmer après la démo Le Poool, en priorité haute (avant tout codage du flux contrat/paiement, qui dépend de ce modèle).

## DETTE #47 — Barre de recherche homepage propose un rythme abstrait obsolète + flow visiteur non-connecté à repenser

**Statut au 2 mai 2026 après-midi** : créée par identification du désalignement entre VISION §2 (rythme abstrait abandonné) et le code actuel de la HomePage et de `/recherche`, qui continue de demander un rythme à l'utilisateur dans la barre de recherche.

**Constat** : le formulaire de recherche actuel demande à un visiteur (connecté ou non) de saisir un rythme abstrait (type "4-2", "2-2"), or VISION §2 a tranché que ces patterns ne sont pas une donnée de matching valide. Conséquence : le visiteur remplit un champ qui ne sert à rien, et le code post-soumission essaie probablement de matcher sur `rythme_pattern` (colonne dépréciée par VISION §3). Désalignement code ↔ vision.

**Proposition produit (validée le 2 mai après-midi sur le principe, détails à trancher en session dédiée)** :

- Réduire le formulaire homepage à la **ville uniquement** (comportement standard de toute plateforme de recherche logement : Leboncoin, SeLoger, Bien'ici, Airbnb).
- Au clic "Rechercher" → page `/recherche` qui affiche la liste publique des annonces de la ville (sans matching personnel pour visiteur non-connecté).
- **Modale d'incitation non-bloquante** en overlay sur la page `/recherche` grisée derrière, fermable par croix en haut à droite. L'utilisateur peut soit s'inscrire/se connecter via la modale, soit la fermer et continuer à consulter la liste publique. Pattern "soft signup wall" type Booking ou Doctolib.
- Pour utilisateur connecté : barre de recherche pré-remplie avec sa propre ville (cohérent VISION §6).

**Sujets à trancher en session dédiée post-Poool** :

- Visibilité publique des annonces : que voit exactement un visiteur non-connecté dans la liste (photo, ville, fourchette prix, pas de contact ni de dispos détaillées) — à valider RGPD + impact SEO du rendu indexable.
- Wording de la modale d'incitation : éviter le générique, mettre la promesse Sterny en frontal (matching planning d'alternance, pas message vague). Validation copywriting à anticiper.
- Comportement du formulaire actuel sur les utilisateurs déjà inscrits avec un `rythme_pattern` rempli (descriptif uniquement, à ignorer pour le matching).
- Cohérence avec VISION §6 (homepage pré-remplie pour utilisateur connecté avec ses propres villes selon `ville_recherchee` saisie en étape D du chantier RhythmManualBuilder).

**Cas utilisateur connecté (décision actée le 2 mai 2026 après-midi en complément de cette dette)** :

Pour un utilisateur connecté ayant déjà saisi son `rhythm_calendar`, la barre de recherche homepage est pré-remplie avec **uniquement la ville** (sa ville d'école ou ville d'entreprise selon `users.ville_recherchee`, saisie en étape D du chantier RhythmManualBuilder). Au clic "Rechercher", il arrive directement sur `/recherche` **sans modale d'incitation** (puisqu'il est connecté). La page `/recherche` affiche les annonces de la ville filtrées et scorées par compatibilité avec son `rhythm_calendar`.

Le mécanisme de filtrage et de scoring par compatibilité est traité dans une dette dédiée — voir DETTE #48 (matching partiel et présentation du score de compatibilité).

**Impact sur la démo Le Poool du 4 mai 2026** : aucun. La démo évalue le concept et le parcours alternant authentifié, pas le détail du formulaire homepage. Acceptable de laisser l'ancien formulaire pendant la démo.

**Bloquant pré-production** : oui — un visiteur qui remplit un champ rythme abstrait obsolète et atterrit sur une recherche cassée est un point de friction de premier ordre pour la conversion.

**Plan de résolution** : 1 session Claude.ai dédiée post-Poool, couvrant audit du code actuel de HomePage et `/recherche`, refonte des champs, refonte du flow visiteur non-connecté, design et wording de la modale d'incitation. À séquencer avec le cadrage DETTE #46 multi-années — l'ordre exact (DETTE #46 ou DETTE #47 en premier) à arbitrer selon priorité du moment.

## DETTE #48 — Matching partiel et présentation du score de compatibilité

**Statut au 2 mai 2026 après-midi** : créée par identification d'un trou produit fondamental lors de la session étape D du chantier RhythmManualBuilder.

**Constat** : un alternant n'a presque jamais un rythme symétrique parfait (2 semaines école / 2 semaines entreprise, ou similaire). Conséquence : pour qu'un locataire trouve un hôte dont les semaines sont parfaitement opposées aux siennes, la probabilité d'un match 100% est très faible. Dans la majorité des cas, le locataire devra **combiner plusieurs logements** pour couvrir l'ensemble de ses semaines à l'école — par exemple logement A pour 40% des semaines + logement B pour 30% + logement C pour 30%, en composition complémentaire.

Sterny doit donc présenter un **score de compatibilité partielle** par annonce et orchestrer une **logique de composition multi-logements** pour aider le locataire à approcher 100% de couverture sans friction. Si ce mécanisme n'est pas conçu finement, le produit perd sa promesse : un locataire qui voit "compatibilité 40%" et rien d'autre se décourage et part. Et un hôte qui se voit proposer des locataires qui ne prennent qu'une partie de ses semaines disponibles risque de refuser de signer (il préfère 1 contrat sur 100% de ses semaines).

**6 sous-problèmes à cadrer en session dédiée** :

1. **Algorithme de scoring** : calcul du pourcentage de couverture des semaines `school` du locataire par les semaines de disponibilité de l'hôte. Intersection de sets de dates ISO du lundi (cohérent VISION §3). À formaliser pour l'implémentation et à documenter dans le doc de recherche.

2. **Présentation non-décourageante du score** : "40%" sonne comme un échec alors que ça peut représenter 18 semaines couvertes sur 32. Reformulation à privilégier en absolu plutôt qu'en ratio (par exemple : *"Ce logement couvre 18 de tes 32 semaines à Rennes"*), avec framing positif. Choix de copywriting à valider.

3. **Composition multi-logements pour couvrir 100%** : problème de **set cover** au sens algorithmique (NP-difficile en général, mais résoluble par heuristiques efficaces sur des sets de quelques dizaines d'éléments — donc faisable en pratique sur les volumes Sterny). Sterny doit suggérer au locataire la combinaison optimale d'annonces complémentaires pour combler ses trous.

4. **Tension entre intérêts hôte et locataire** : l'hôte veut combler ses semaines vite et idéalement en 1 seul contrat (réduit la friction admin et le risque d'impayé). Le locataire qui ne prend qu'une partie des dispos d'un hôte lui laisse un trou difficile à recombler. Comment l'algorithme de matching arbitre-t-il entre intérêt hôte (préférer les locataires qui prennent toutes ses dispos) et intérêt locataire (lui présenter les meilleures couvertures partielles dispo) ? Question stratégique à trancher.

5. **UX du parcours fragmenté** : comment présenter au locataire qu'il devra signer 2 ou 3 contrats différents pour couvrir son année. Signature séquentielle ou en parallèle ? Gestion des états intermédiaires (j'ai signé contrat A pour ces semaines, je cherche encore pour les semaines restantes). Affichage clair de la couverture cumulée au fil des signatures.

6. **Question stratégique de fond** : Sterny vend-elle "tu auras toujours un logement chaque semaine" (promesse forte mais difficile à tenir), ou "Sterny te trouve les meilleures combinaisons possibles, mais 100% de couverture n'est pas garanti" (promesse honnête mais moins sexy) ? Ce choix conditionne le copywriting de la homepage, des annonces, et le pricing.

**Impact sur la démo Le Poool du 4 mai 2026** : aucun. La démo peut se faire avec des comptes test ayant des rythmes parfaitement opposés (matching 100%). Le sujet sera mentionné comme axe de réflexion produit avancée, pas comme bloqueur immédiat.

**Bloquant pré-production** : oui — sans ce mécanisme, le produit ne tient pas sa promesse pour la majorité des utilisateurs réels. Aucun lancement opérationnel ne peut se faire tant que le matching partiel et la composition multi-logements ne sont pas conçus, implémentés et testés.

**Plan de résolution** : 1 ou 2 sessions Claude.ai dédiées post-Poool, livrant un document `docs/recherche/MATCHING-PARTIEL.md` qui couvre les 6 sous-problèmes ci-dessus avec scénarios, options, et tranches par grand bloc (algorithme, UX, copywriting, modèle contractuel multi-logements). À séquencer en priorité haute aux côtés de DETTE #46 (multi-années) et DETTE #47 (refonte barre recherche). Ces 3 dettes forment ensemble le "noyau produit pré-lancement" — aucune ne peut être skipée.

## DETTE #49 — Extraction des étapes de CompleterProfilPage en sous-composants

**Statut au 2 mai 2026 soir** : créée par audit lecture-seule de `sterny-react/src/pages/auth/CompleterProfilPage.jsx` en préparation du chantier unification inscription (Option A actée en VISION §6).

**Constat** : `CompleterProfilPage.jsx` est un monolithe de 1125 lignes qui porte 5 responsabilités (4 étapes + cropper photo). L'ajout d'une étape `RhythmManualBuilder` + popup Q9 le pousserait au-dessus de 1500 lignes. La refonte du chantier unification inscription (Option A) va ajouter encore plus de logique. Sans extraction, le composant devient ingérable et fragile.

**Recommandation** : extraire chaque étape en sous-composant dans `sterny-react/src/pages/auth/CompleterProfilSteps/` (ou équivalent) avant tout ajout de logique majeure. Sous-composants envisagés : `Step1Identity.jsx`, `Step2Cities.jsx`, `Step3Studies.jsx`, `Step4Profile.jsx`, plus `PhotoCropper.jsx` extrait.

**Bloquant pré-production** : non. Le composant fonctionne. C'est de la dette d'évolutivité, pas de stabilité.

**Plan de résolution** : 1 session Claude.ai dédiée à intégrer dans la séquence du chantier unification inscription (Option A). À faire AVANT toute nouvelle ajout de logique métier. Si l'unification inscription démarre par une refonte from-scratch du composant, cette dette devient caduque (l'extraction se fera de facto pendant la refonte).

## DETTE #50 — Couplage redondant statut_ville_* ↔ type_user dans DashboardLocatairePage

**Statut au 2 mai 2026 soir** : créée par audit lecture-seule de `CompleterProfilPage.jsx` qui a remonté un grep d'usage des colonnes ville_* dans `DashboardLocatairePage.jsx`.

**Constat** : `DashboardLocatairePage.jsx` ligne ~104 utilise le couple `statut_ville_*` comme détection alternative de `les_deux`, en parallèle de `users.type_user`. Les 2 sources d'information décrivent la même réalité métier (l'utilisateur est-il `les_deux` ou pas) mais peuvent diverger en pratique : si un utilisateur passe de `locataire` à `les_deux` via une migration de profil sans qu'on mette à jour `statut_ville_*` correctement (ou inversement), les 2 sources renvoient des résultats incohérents.

**Risque** : bug silencieux où le dashboard affiche un état utilisateur qui ne correspond pas à `type_user` réel, ou inversement.

**Plan de résolution** : auditer chaque endroit du code où `statut_ville_*` est lu pour décider du comportement. Tracer une seule source de vérité officielle (probablement `type_user` qui est protégé par CHECK constraint et plus simple à raisonner). Refactor pour que toute logique métier passe par `type_user` exclusivement, et que `statut_ville_*` reste descriptif uniquement (qui propose / qui cherche, pas un proxy de type_user).

À séquencer dans le chantier unification inscription (Option A) ou dans une session dédiée immédiatement après, parce que l'unification touche aussi à l'écriture de ces colonnes.

**Bloquant pré-production** : non, mais à fixer avant lancement opérationnel pour éviter des bugs de dashboard qui dégraderaient la confiance utilisateur dès la première utilisation.

## DETTE #51 — Apple OAuth à implémenter dans le cadre du chantier unification inscription [RÉSOLUE — caduque]

**Statut au 3 mai 2026** : **CADUQUE** suite au cadrage de la section 4 du doc `docs/recherche/UNIFICATION-INSCRIPTION.md` en conv Claude.ai 2.

**Résolution** : la création d'un `AppleAuthHandler.jsx` séparé n'est plus nécessaire. La refonte `GoogleAuthHandler.jsx` → `OAuthHandler.jsx` générique (cf. UNIFICATION-INSCRIPTION § 4.5.2 et § 4.6) gère Google + Apple + toute future méthode OAuth dans un seul composant. Le handler ne lit pas le provider — il s'applique à toute session Auth ouverte. Le pré-remplissage prenom/nom spécifique au provider est fait côté `InscriptionAlternantPage` E-1, pas dans le handler.

**Statut original** (laissé pour traçabilité) : créée par cadrage du chantier unification inscription (Option A) qui doit traiter les 3 méthodes d'authentification (email, Google OAuth, Apple OAuth) au même niveau.

**Constat original** : Apple Developer account actif, Apple OAuth pas encore implémenté côté code Sterny.

**Plan de résolution effectif** : intégré à la tranche T4 du plan d'implémentation UNIFICATION-INSCRIPTION (cf. UNIFICATION-INSCRIPTION § 7.3.4).

**Bloquant pré-production** : non.

## Planification

Tous ces points sont **hors scope Phase 1**. Ils seront traités en **Phase 0bis — Stabilisation CreerAnnoncePage et ménage post-audits**, à faire après la Phase 1 complète. Les dettes #21 à #33 (anomalies plateforme et divergences design) viennent étoffer la catégorie C ménage de cette Phase 0bis.

## DETTE #52 — Bypass DEV `import.meta.env.DEV` dans CompleterProfilPage

**Statut au 2 mai 2026 soir bis** : créée par audit lecture-seule `docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md` (§6).

**Constat** : `sterny-react/src/pages/auth/CompleterProfilPage.jsx` contient 5 bypass `import.meta.env.DEV` aux lignes 332, 338, 362, 378, 804 qui désactivent la validation des 4 étapes du wizard et les redirections automatiques en mode dev/preview. Ces bypass n'étaient pas logués dans la liste DETTE-TECHNIQUE existante (qui ne couvrait jusque-là que `CreerAnnoncePage.jsx`).

**Risque** : faible en l'état (bypass actifs uniquement quand `import.meta.env.DEV === true`, donc absent du build production Vercel). Mais à l'origine de divergences de comportement entre dev et prod qui peuvent égarer pendant les tests manuels.

**Bloquant pré-production** : non.

**Plan de résolution** : caduque en sortie du chantier unification inscription. La refonte from-scratch de `CompleterProfilPage` en `InscriptionAlternantPage` ne reproduira pas ces bypass — l'ancienne page sera supprimée dans le même chantier (Q12 actée : modèle 1 passe, plus de complétion séparée). Aucune action préalable nécessaire.

## DETTE #53 — Variables sémantiques `--error` et `--success` divergent du design system Sterny

**Statut au 2 mai 2026 nuit** : créée par audit design `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md` § 2 (table des design tokens).

**Constat** : `sterny-react/src/index.css:25-40` définit `--error: #ff6b6b` et `--success: #51cf66`. Ces valeurs divergent du design system Sterny documenté en `INVENTAIRE-PLATEFORME.md` §9.1, qui cite `#dc2626` (rouge) et `#059669` (vert) comme couleurs sémantiques.

**Risque** : faible. Cohérence visuelle légèrement compromise selon le contexte d'affichage des erreurs/succès. Pas de bug fonctionnel.

**Plan de résolution** : à harmoniser dans une passe "design tokens" plus large (introduction de variables CSS pour border-radius, box-shadows, transitions, espacements actuellement hardcodés). Décision : laquelle des 2 valeurs est la "vraie" référence Sterny ? À arbitrer en session dédiée. Cohérent avec DETTE #31 (token hover orange `#D4571F` hardcodé) et DETTE #44 (UX mobile globale).

**Bloquant pré-production** : non.

## DETTE #54 — Refonte responsive RhythmManualBuilder pour intégration card 460px du parcours unifié

**Statut au 3 mai 2026** : créée par cadrage section 3.9 et section 7.3.8 du doc `docs/recherche/UNIFICATION-INSCRIPTION.md` en conv Claude.ai 2.

**Constat** : `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx` a été livré le 2 mai après-midi avec un design pleine largeur (12 colonnes mensuelles qui scrollent horizontalement) qui ne tient pas dans la card 460px du parcours d'inscription unifié `InscriptionAlternantPage`.

**Décision Côme du 3 mai 2026** : E-5 reste dans la card 460px standard (cohérence visuelle avec les autres étapes du wizard). Le composant `RhythmManualBuilder` doit être refondu pour s'adapter à cette largeur avant intégration.

**Plan de résolution** : session Claude Code dédiée à la refonte responsive avant T8 du plan d'implémentation UNIFICATION-INSCRIPTION. Options de layout à explorer en début de tranche : layout vertical avec sélecteur mois en haut, layout compact mois × semaines redimensionné, layout calendaire condensé. Validation visuelle desktop + mobile obligatoire. Cohérent avec DETTE #44 (UX mobile globale).

**Bloquant pré-production** : oui — prérequis bloquant de la tranche T8 du chantier UNIFICATION-INSCRIPTION (intégration RhythmManualBuilder en E-5 du wizard).

## DETTE #55 — Adaptation parcours proprio post-suppression INSERT OAuthHandler (Q5)

**Statut au 3 mai 2026** : créée par cadrage section 4.10 du doc `docs/recherche/UNIFICATION-INSCRIPTION.md` en conv Claude.ai 2.

**Constat** : la décision Q5 (suppression de l'INSERT `users` dans le handler OAuth, cf. UNIFICATION-INSCRIPTION section 4) **casse le parcours proprio Google actuel** qui dépendait de cet INSERT. Aujourd'hui `InscriptionProprietairePage.jsx:72` appelle `signInWithOAuth` avec `sessionStorage.signup_type='proprietaire'` puis le handler `GoogleAuthHandler` INSERT `users` avec `type_user='proprietaire'` au callback. Sans le handler qui fait l'INSERT, le proprio Google se retrouve avec une session Auth active mais aucune ligne `public.users` correspondante.

**Plan de résolution** : adapter `InscriptionProprietairePage.jsx` pour qu'elle fasse son propre INSERT au callback OAuth (cf. UNIFICATION-INSCRIPTION § 4.10.2) — détection session Auth active au montage, SELECT users, INSERT minimal avec `type_user='proprietaire'` + `parrain_id` du token + `email` + `prenom`/`nom` depuis user_metadata + `profil_complet=false`. Suppression du `sessionStorage.signup_type='proprietaire'` côté `signInWithOAuth`.

**Séquencement** : intégré comme commit 2/2 de la tranche T4 du plan d'implémentation UNIFICATION-INSCRIPTION (cf. UNIFICATION-INSCRIPTION § 7.3.4 et § 4.10.5). 2 commits dans la même session Claude Code, indissociables — pousser commit 1 (refonte OAuthHandler) sans commit 2 casse le proprio Google en prod.

**Tests à valider en sortie** : parcours proprio Google complet avec lien `?r=<token>` valide, INSERT au callback avec valeurs correctes, wizard proprio existant fonctionne jusqu'à fin. Ne sera pas couvert par les 9 parcours nominaux UNIFICATION-INSCRIPTION (qui sont alternant only, cf. § 5.1) — table de tests proprio à produire dans le cadre de cette DETTE.

**Précision 3 mai 2026 (conv 4)** : confirmation empirique du bug — l'activation de "Confirm email" sur le projet Supabase prod casse immédiatement le parcours `/inscription/proprietaire` méthode email avec l'erreur PostgreSQL `insert or update on table "users" violates foreign key constraint "users_id_fkey"`. Cause probable : le code actuel d'`InscriptionProprietairePage.jsx` ne gère pas le cas `data.session === null` post-signUp (comportement de signUp quand Confirm email est ON) et tente un INSERT users avec un id mal initialisé. Workaround temporaire : Confirm email désactivé sur Supabase prod jusqu'à livraison T4. Test reproductible avant fix : activer Confirm email Supabase + remplir le formulaire `/inscription/proprietaire` méthode email + clic "Créer mon compte" → erreur affichée sous le bouton Google. À traiter dans la même tranche T4 que la refonte OAuthHandler générique (commit 2/2). À réactiver impérativement avant test du sous-commit 2 du chantier UNIFICATION-INSCRIPTION (qui dépend de Confirm email ON pour valider l'écran "Vérifie ta boîte mail"), et à laisser ON en permanence après livraison T4.

**Bloquant pré-production** : oui — sans cette adaptation, le parcours proprio Google ne fonctionne plus après la refonte UNIFICATION.

## DETTE #56 — Tokenisation systématique des couleurs sémantiques danger/succès hardcodées

**Statut au 3 mai 2026** : créée par découverte lors du grep préalable T1-PARTIE-1 (tranche 1 du chantier UNIFICATION-INSCRIPTION).

**Constat** : 43 occurrences hardcodées de `#dc2626` (rouge danger, 6 occurrences) et `#059669` (vert succès, 37 occurrences) dans la base CSS de la plateforme. Aucune n'utilise `var(--error)` ou `var(--success)`. Fichiers principaux concernés : `DashboardProprietairePage.css` (8 occurrences `#059669`), `EtatDesLieuxPage.css` (4), `ContratLocationPage.css` (4), `DashboardLocatairePage.css` (3), `RenouvellementPage.css` (5), plus 12 autres fichiers répartis sur dashboards, transactions, profil, public.

**Conséquence** : si la palette danger/succès évolue un jour (changement de tonalité, mode sombre, accessibilité), il faudra modifier 43 endroits dispersés au lieu d'une seule ligne dans `:root`. Risque de divergence visuelle silencieuse.

**Action requise** : passe dédiée de tokenisation systématique. Remplacer toutes les occurrences hardcodées par `var(--error)` et `var(--success)` (vars définies dans `:root` après T1). Vérification visuelle par capture d'écran avant/après sur les pages les plus touchées (Dashboard Proprio, EtatDesLieux, ContratLocation).

**Effort estimé** : 1h-1h30 Claude Code (find + replace + visual diff).

**Priorité** : faible. La plateforme fonctionne, aucune régression visuelle. À traiter dans une session de nettoyage design system globale, hors scope T1-T9 du chantier UNIFICATION-INSCRIPTION.

**Origine** : grep préalable T1-PARTIE-1 (3 mai 2026), session Claude Code.

## DETTE #57 — Email de confirmation Supabase à customiser (template + SMTP custom Resend)

**Statut au 3 mai 2026** : créée par cadrage du sous-commit 2 du chantier UNIFICATION-INSCRIPTION en conv Claude.ai 4.

**Constat** : avec "Confirm email" activé sur le projet Supabase, Supabase envoie un email de confirmation au signUp via son template par défaut (expéditeur générique `noreply@mail.app.supabase.io`, design générique sans branding Sterny). C'est fonctionnel mais pas au niveau du design system Sterny (Navy `#1E293B`, Orange `#E8622A`, DM Sans, `border-radius: 20px`, signature de marque).

**Distinct de DETTE #16** (refonte des 6 templates email Resend transactionnels) : l'email de confirmation Supabase est un **7ᵉ email distinct**, géré directement par Supabase et non par Resend. Il ne s'agit pas d'une refonte mais d'une création initiale au niveau du standard Sterny.

**Plan de résolution** :
1. Customisation du template HTML dans Supabase Studio → Authentication → Email Templates → Confirm signup. Reprise des codes visuels Sterny et tone of voice cohérent avec les autres emails.
2. Idéalement : configuration SMTP custom Resend pour expéditeur `noreply@sterny.co` (Authentication → SMTP Settings). Permet aussi un meilleur contrôle anti-spam et brand integrity.

**Bloquant pré-production** : non, mais à traiter avant lancement opérationnel pour cohérence brand. Décision Côme à arbitrer avec l'avocat/DPO sur les mentions légales obligatoires dans l'email de confirmation (cf. QUESTIONS-PROFESSIONNELS.md Q-DPO-001 à Q-DPO-007).

**Effort estimé** : 1h-2h Claude Code (template HTML inline + tests sur dev avec inscription bidon, validation visuelle Côme).

**Origine** : sous-commit 2 du chantier UNIFICATION-INSCRIPTION (3 mai 2026, conv 4).
