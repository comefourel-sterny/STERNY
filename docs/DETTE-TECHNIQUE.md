# Dette technique Sterny

Suivi des bugs et bypass DEV à traiter en Phase 0bis (après Phase 1 complète).

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

14. **`annonces.proprietaire_id` absent en prod, référencé par trigger actif** :
    - Trigger : `trg_notif_candidature` (AFTER INSERT ON `public.candidatures`)
    - Fonction : `trigger_notif_candidature()` définie lignes 140-166 de `supabase/remote_schema.sql`
    - La fonction exécute `SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id`
    - La colonne `proprietaire_id` n'existe pas dans `annonces` (confirmé lignes 204-233 du schema dump)
    - Table `annonces` a seulement `user_id` comme pointeur vers les utilisateurs
    - Conséquence attendue : chaque INSERT dans `candidatures` déclenche le trigger, qui plante avec "column a.proprietaire_id does not exist", ce qui fait rollback de toute la transaction
    - Validation empirique à faire : tester une candidature end-to-end et observer si elle réussit ou échoue, et si le frontend affiche une erreur
    - Fix à trancher entre (A) ajouter une colonne `proprietaire_id` à `annonces` et la remplir selon logique parrainage, ou (B) modifier la fonction pour lire `user_id` si ce dernier stocke bien le propriétaire. Décision à prendre après audit Zone 2.

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

38. **Information périmée dans ETAT-COURANT sur la signature de RhythmCalendar**. Découvert lors du fix de la preview avec sélecteur de groupe le 26 avril : la session du 25 avril après-midi (Bloc B Étape 0 close) avait mentionné une signature `<RhythmCalendar parsedGroups={...} mode="readonly" selectedGroupId={...} onSelectGroup={...} />` dans son plan de démarrage Étape 1. La signature finale livrée le 25 avril fin de soirée bis (commit 599e045) est en réalité plus simple : `({ weeks, groupLabel, documentMeta, className })`. Le contrat unifié `weeks` posé en Étape 1 a remplacé l'API multi-props envisagée initialement. Pas un bug, juste une trace périmée dans l'historique d'ETAT-COURANT — la nouvelle session du 26 avril a reposé sur ce point pour rectifier. À noter pour les futures sessions : la source de vérité pour la signature actuelle de RhythmCalendar est le code lui-même (`sterny-react/src/components/rhythm/RhythmCalendar.jsx`), pas les sections historiques d'ETAT-COURANT.

39. **Composant RhythmFileUpload — UI à reprendre lors du redesign Bloc B**. La v1 du composant posée le 26 avril (commit 7b33fa8) est techniquement fonctionnelle (6 états, validations client, multipart/form-data vers Edge Function, callbacks typés sur 6 codes d'erreur) mais visuellement non aboutie selon les standards Sterny (cf. INVENTAIRE §9). Constat utilisateur en session : "rien sur cette page ne me satisfait visuellement". À reprendre dans la même session que le redesign de RhythmCalendar (DETTE #36) pour cohérence visuelle d'ensemble — les 2 composants seront posés côte à côte dans le futur RhythmOnboarding (Bloc B Étape 3) et doivent partager la même grammaire raffinée. Pas urgent — la priorité reste le diagnostic et la résolution du problème parser (DETTE #37).

## Planification

Tous ces points sont **hors scope Phase 1**. Ils seront traités en **Phase 0bis — Stabilisation CreerAnnoncePage et ménage post-audits**, à faire après la Phase 1 complète. Les dettes #21 à #33 (anomalies plateforme et divergences design) viennent étoffer la catégorie C ménage de cette Phase 0bis.
