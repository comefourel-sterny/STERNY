# Dette technique Sterny

Suivi des bugs et bypass DEV à traiter en Phase 0bis (après Phase 1 complète).

**Dernière mise à jour** : 2026-06-24 (conv 88) — DETTE #113 : audit Lot 3 complet, plan 3a/3b/3c figé (aucun code touché).

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

9. ✅ **DIAGNOSTIQUÉE 2026-06-10 (conv 48)** — **Erreur 400 sur candidatures** : ce n'est PAS un problème RLS (policies SELECT en USING(true) sur candidatures ET annonces, vérifié). Cause réelle : `loadCandidaturesEnvoyeesHote` (DashboardLocatairePage.jsx:306-315) filtre sur `.eq('user_id', userId)` alors que `candidatures.user_id` n'existe pas — la colonne est `locataire_id`. Fix nominal = remplacer `user_id` par `locataire_id` (1 ligne). Impact latéral seulement : try/catch isolé (l.314), n'empêche pas le chargement des candidatures reçues (M2a). NON corrigé. **MAJ 2026-06-10 (conv 49)** : confirmée en runtime (2× 400 dans la console du dashboard hôte, sur .../candidatures...created_at.desc). N'empêche pas l'affichage des candidatures reçues (M2a OK). Fix nominal inchangé : `.eq('user_id', …)` → `.eq('locataire_id', …)`. **✅ RÉSOLUE 2026-06-10 (conv 49 suite)** : fix appliqué (l.311, `.eq('user_id', …)` → `.eq('locataire_id', …)` dans loadCandidaturesEnvoyeesHote) et validé runtime (locataire@sterny.test : « Tes candidatures » affiche le Studio test Rennes, 400 console disparus).

10. **URL suspecte** : le flow arrive sur `/annonce/creer?type=locataire` alors qu'un locataire n'est pas censé créer d'annonce. Cohérence du paramètre `type` à vérifier dans les CTA.

## Incohérences données BDD

11. **Orthographe type_alternance** : valeurs observées `asymmetric` (EN) et `asymetrique` (FR) dans la même colonne avant le reset de la Phase 1c. À harmoniser pour l'avenir : choisir UNE orthographe officielle, contrainte CHECK pour éviter la régression.

## Code smell à nettoyer

12. **Fallback mort dans matchScore** (`RecherchePage.jsx` ligne ~653) : `futureHostDates[0] || logement.disponibilites_pattern[0]` est inatteignable après le filter ligne 647. À simplifier ou commenter. — RÉSOLUE 2026-06-18 (commit feat b18484b) : tout l'ancien calcul inline matchScore est supprimé, remplacé par couvertureSemaines ; le fallback n'existe plus.

13. **Logique normaliseur matchScore** : `userDansPerioDeHote.length || 1` à expliciter en JSDoc (partiellement traité en Phase 1d). — RÉSOLUE 2026-06-18 (commit feat b18484b) : le normaliseur || 1 a disparu avec l'ancien calcul (couvertureSemaines ne divise pas).

## Bugs backend confirmés par audit du schéma distant (23 avril 2026)

14. ✅ **RÉSOLUE 2026-06-10** — **`annonces.proprietaire_id` absent en prod, référencé par trigger actif** (confirmée empiriquement 2026-04-30) :
    - Trigger : `trg_notif_candidature` (AFTER INSERT ON `public.candidatures`)
    - Fonction : `trigger_notif_candidature()` définie lignes 140-166 de `supabase/remote_schema.sql`
    - La fonction exécute `SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id`
    - La colonne `proprietaire_id` n'existe pas dans `annonces` (confirmé lignes 204-233 du schema dump)
    - Table `annonces` a seulement `user_id` comme pointeur vers les utilisateurs
    - Conséquence attendue : chaque INSERT dans `candidatures` déclenche le trigger, qui plante avec "column a.proprietaire_id does not exist", ce qui fait rollback de toute la transaction
    - **Validation empirique faite le 30 avril 2026 soir** : INSERT test exécuté dans Supabase Dashboard SQL Editor avec ROLLBACK forcé. Message d'erreur capturé : `ERROR 42703: column a.proprietaire_id does not exist`, `QUERY: SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id`, `CONTEXT: PL/pgSQL function trigger_notif_candidature() line 7 at SQL statement`. La transaction est rollbackée par PostgreSQL avant même que la ligne candidature soit créée. **Aucune candidature ne peut aboutir en production tant que la dette n'est pas résolue. Tout le parcours locataire en aval (suivi candidature, match, signature contrat, paiement) est bloqué structurellement.** Statut : P0 bloquant pour démo.
    - Fix à trancher entre (A) ajouter une colonne `proprietaire_id` à `annonces` et la remplir selon logique parrainage, ou (B) modifier la fonction pour lire `user_id` si ce dernier stocke bien le propriétaire. **Décision à prendre en session stratégique dédiée** — le choix A vs B touche au modèle de parrainage propriétaire, ne pas trancher dans le flux de l'audit fonctionnel.
    - ✅ RÉSOLUE 2026-06-10 : fonction `trigger_notif_candidature()` corrigée — lit `annonces.user_id` (= hôte créateur de l'annonce) au lieu de `annonces.proprietaire_id` (inexistant) ; variable renommée `v_destinataire_id` ; lien notif `'/dashboard'` (dashboard alternant fusionné) au lieu de `'dashboard-proprietaire.html'`. Arbitrage A vs B tranché par audit 2026-06-10 : le propriétaire n'étant jamais rattaché à une annonce (parrainage = lien vers un user via invitation_token, intervention au stade contrat), l'option A n'avait aucune source de remplissage ; user_id = hôte = bon destinataire. SQL appliqué en prod via Dashboard SQL Editor, conservé dans supabase/migrations/20260610181122_fix14_trigger_notif_candidature.sql (non poussé via CLI, cf. DETTE #15). Test BEGIN/INSERT/ROLLBACK du 2026-06-10 : candidature insérée sans erreur, trigger OK.

## Dette de traçabilité des migrations

15. **Migrations locales désynchronisées de la prod** :
    - Les colonnes Stripe de `paiements_loyer` (`stripe_session_id`, `stripe_payment_intent`, `stripe_payment_intent_id`, `stripe_invoice_id`) existent en prod mais sont absentes des fichiers de migration `supabase/migrations/`
    - Idem possiblement sur d'autres tables (à auditer)
    - Impact : reproduire une BDD vide depuis les migrations locales ne donnerait pas un état identique à la prod
    - Fix : en Catégorie C, générer une migration baseline depuis `supabase/remote_schema.sql` et remplacer la pile actuelle

## Design des emails transactionnels à refaire

16. **Design des templates email Resend à refondre** : les 6 Edge Functions d'envoi d'email (`send-alert-email`, `send-landing-email`, `send-proprietaire-invitation`, `send-recu-paiement`, `send-fin-bail-email`, `send-relance-impaye-email`) contiennent chacune un template HTML inline dans `supabase/functions/<nom>/index.ts`. Les designs actuels ne sont pas au niveau du design system Sterny (Navy `#1E293B`, Orange `#E8622A`, DM Sans, `border-radius: 20px`). Constat fait le 24 avril après réception du test de `send-alert-email`. À traiter une fois tous les aspects techniques opérationnels, en dernière priorité. Scope : uniformisation visuelle sur les 6 templates, cohérence avec la charte sterny.co, responsive mobile, respect des contraintes email (tables, inline styles, fonts système en fallback).
   **MAJ 2026-06-19 (conv 71)** : `send-landing-email` refait + déployé → sert de GABARIT DE RÉFÉRENCE pour les 5 autres templates. Grammaire validée : bandeau navy #1E293B + logo blanc (Logo-Sterny-V1-white.png, bucket public-assets), accent orange #E8622A, corps blanc centré aéré, carte 460px radius 16px, fond #F4F5F7, mention légale hors carte, email-safe (tables + inline + color-scheme light only). Reproduire cette grammaire sur les 5 restants plutôt que re-concevoir.

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
    - **MAJ 2026-06-11 (conv 51)** : le re-route #92 (notif candidature → messagerie) confirme empiriquement le code mort de NotificationBell + HamburgerMenu — notifications_in_app n'a plus aucun consommateur UI. Consigne actée : ne plus écrire dans notifications_in_app (aucun affichage). Nettoyage (suppression composants + dépréciation table/RPC creer_notification_in_app) à grouper avec la catégorie C ménage.

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

**Mise à jour 2 juin 2026 (conv 25)** : le wording Q9 archivé plus haut (titre « Complétez votre planning d'alternance », « vous », amorces variables par action, 2 boutons) est PÉRIMÉ. Le composant réel `RhythmRequiredPopup.jsx` a été refondu puis finalisé en conv 25. Texte courant (commit deb9f5f) :
- Titre : « Complète ton calendrier »
- Corps : « C'est ce qui permet à Sterny de te mettre en relation. Ça prend 2 minutes, tu pourras le modifier plus tard. »
- Bouton unique : « Renseigner mon calendrier »
Tutoiement « tu », texte statique (pas d'amorce variable), 1 seul bouton primaire. Travail de longueur/lisibilité uniquement — juridiquement léger (aucune clause contractuelle, paiement ni responsabilité), donc hors périmètre du gel avocat. Largeur du popup portée de 400px à 460px (`.aw-rrp-panel max-width`) pour matcher la carte du wizard et tenir chaque phrase sur une ligne — divergence assumée vs la spec §738.

**Correction de localisation** : le composant vit dans `sterny-react/src/components/auth-wizard/RhythmRequiredPopup.jsx` (et non `components/rhythm/` comme indiqué en §352). Le `// TODO validation avocat avant production` n'est présent QUE sur la modale Q8 dans `RhythmManualBuilder.jsx`. La Q8 (127 mots, 5 paragraphes) reste INTACTE : sa longueur est du fond juridique gelé, compaction réservée à la consultation avocat. Aucune coupe faite sur la Q8 en conv 25.

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

**Pistes d'enrichissement (brainstorm conv 40, à approfondir post-MVP) :**
1. **Complétion ciblée depuis le dashboard.** Un match couvrant ~80 % des semaines : l'utilisateur clique sur les semaines manquantes → lance une recherche pré-filtrée sur exactement cette période résiduelle.
2. **Recherche par période façon Airbnb.** Heuristique : privilégier la plus longue période continue couverte par un même logement (limiter la fragmentation entre plusieurs logements).
3. **Classement par probabilité d'acceptation de l'hôte.** Prioriser les hôtes ayant déjà ≥3 semaines contiguës comblées ; ne pas remonter en tête les annonces à 0 semaine comblée.

**MAJ 2026-06-15 (conv 61) — DIRECTION actée : recherche = accompagnement guidé à la couverture.** Tranche les sous-pb 3 (composition multi-logements : « le plus couvrant d'abord » puis recalcul des trous), 5 (UX parcours fragmenté : candidatures parallèles non bloquantes, au rythme du locataire) et 6 (promesse : couverture maximisée, jamais garantie, §566). Dénominateur du score = total des semaines cherchées du locataire (Y), pas la fenêtre d'annonce. Sous-pb 4 (tension hôte/locataire) non tranché. Premier code = moteur de couverture (fonction pure → liste des semaines couvertes par logement). Audit conv 61 : score inline RecherchePage.jsx:432-451, matching.js code mort, semaines_reservees vide + RLS 0 policy. Détail : VISION « Recherche = accompagnement guidé à la couverture » + ETAT-COURANT bloc conv 61.
**MAJ 2026-06-18 (conv 65) — pièces 2+4 livrées (commit feat b18484b).** couvertureSemaines branché sur les cartes /recherche (badge « X de tes Y », pastille ✓ Couvert / X/Y sem., tri par couvertes décroissant, dénominateur = total cherché). Décision : le dénominateur deviendra « restant à couvrir » (total moins semaines SIGNÉES) — pièce 3, via le registre semaines_reservees (#93). Modèle 3 états acté (à couvrir / en attente=candidaté / couvert=signé) ; seule la signature retire une semaine. Détail : VISION + ETAT bloc 2026-06-18.

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

**Mise à jour conv 12 du 6 mai 2026** : le couplage `statut_ville_*` ↔ `type_user` devient déterministe par la convention slot actée en conv 12 (cf. VISION §3). Mono-ville : `statut_ville_entreprise = type_user`, l'autre statut NULL. les_deux : `statut_ville_entreprise = 'hote'` + `statut_ville_ecole = 'locataire'` toujours. La dette n'est pas résolue mais transformée — le nettoyage final (passage à une colonne `ville_principale` unique ou helper de lecture aplati) reste à faire post-pilote.

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

## DETTE #54 — Refonte responsive RhythmManualBuilder pour intégration card 460px du parcours unifié [RÉSOLUE]

**Statut au 3 mai 2026** : créée par cadrage section 3.9 et section 7.3.8 du doc `docs/recherche/UNIFICATION-INSCRIPTION.md` en conv Claude.ai 2.

**Constat** : `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx` a été livré le 2 mai après-midi avec un design pleine largeur (12 colonnes mensuelles qui scrollent horizontalement) qui ne tient pas dans la card 460px du parcours d'inscription unifié `InscriptionAlternantPage`.

**Décision Côme du 3 mai 2026** : E-5 reste dans la card 460px standard (cohérence visuelle avec les autres étapes du wizard). Le composant `RhythmManualBuilder` doit être refondu pour s'adapter à cette largeur avant intégration.

**Plan de résolution** : session Claude Code dédiée à la refonte responsive avant T8 du plan d'implémentation UNIFICATION-INSCRIPTION. Options de layout à explorer en début de tranche : layout vertical avec sélecteur mois en haut, layout compact mois × semaines redimensionné, layout calendaire condensé. Validation visuelle desktop + mobile obligatoire. Cohérent avec DETTE #44 (UX mobile globale).

**Bloquant pré-production** : oui — prérequis bloquant de la tranche T8 du chantier UNIFICATION-INSCRIPTION (intégration RhythmManualBuilder en E-5 du wizard).

**Statut au 1er juin 2026 — partie layout RÉSOLUE par commit 995898f** : les 12 mois tiennent désormais dans la card 460px sans scroll horizontal. Cadre interne `.rmb-root` retiré (padding 0, sans fond/bordure/ombre/radius) ; `--rmb-cell-size: 24px` ; `--rmb-month-gap: 4px` ; `.rmb-grid` sans `overflow-x` ; `.rmb-month-column` en `flex: 1 1 0` + `min-width: 0` (les 12 colonnes partagent la largeur) ; `.rmb-cell` responsive (`width: 100%` + `aspect-ratio: 1` + `max-width: var(--rmb-cell-size)`). En-têtes de mois = initiale 1 lettre.

**Statut au 1er juin 2026 (soir) — DETTE entièrement RÉSOLUE** :
- (a) **Noms de mois 3 lettres horizontales** (commit c6f2eb4) — l'initiale ambiguë (J×3 jan/juin/juil, M×2 mars/mai) est remplacée par 3 lettres horizontales en 11px, `letter-spacing: 0`. Le 3-lettres empilé verticalement avait été testé et rejeté.
- (b) **Garde-fou au 1er clic via prop `onEmptyConfirm`** (commit 096093d) — nouvelle prop sur `RhythmManualBuilder` ; à 0 semaine cochée, le clic sur « Confirmer mon planning » déclenche directement `RhythmRequiredPopup` côté wizard (skip de la modale d'avertissement interne du builder). `handleE5Confirm` conserve sa vérif défensive `hasSchoolWeek`.
- (d) **Semaines passées restylées aligné DS** (commit 15b811c) — fond clair `--rmb-bg-empty` + `border: 1.5px solid #94A3B8` + diagonale 1.5px `#94A3B8` (gris secondaire officiel de la plateforme), `opacity: 1`. Plus de dilution visuelle.

**Seul reliquat builder** : raccourcir les textes de la modale d'avertissement interne du builder + de `RhythmRequiredPopup`. Suivi sous **DETTE #45** (wording, en attente d'avis avocat).

**Note de nettoyage** : les variables CSS `--rmb-past-bg` et `--rmb-past-border` sont devenues inutilisées après le restyle (d). À supprimer lors du nettoyage de tokenisation prévu sous **DETTE #56**.

**Bloquant pré-production** : non — la DETTE est entièrement résolue.

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

## DETTE #58 — Modification du composant T1 <TextInput> pour aligner sur le pattern IR/CP

**Statut au 4 mai 2026 (clôture conv 6)** : RÉSOLUE par commit d91b5d6 sur origin/feat/unification-inscription. Périmètre couvert : composant <TextInput> aligné sur le pattern canonique IR/CP. Note importante : la prop placeholder s'est révélée déjà supportée en signature et transmise à <input> natif — DETTE #58 effective réduite à 2 changements (label aligné + retrait astérisque), pas 3 comme initialement anticipé.

**Statut au 4 mai 2026** : créée par audit IR/CP en clôture de conv Claude.ai 5 du chantier UNIFICATION-INSCRIPTION.

**Constat** : le composant partagé <TextInput> créé en T1 (sterny-react/src/components/auth-wizard/TextInput.jsx + .css) utilise un style label "doux" (13px weight 600 lowercase + indicateur * orange si required) qui diverge du pattern canonique IR/CP en prod (label 11px uppercase weight 700 letter-spacing 1px navy + placeholder dans input + pas d'astérisque). Cette divergence n'avait pas été identifiée à T1 parce que la sandbox était conçue isolément, sans comparaison directe à IR/CP.

**Décision actée en conv 5 (D3)** : aligner strictement <TextInput> sur le pattern IR/CP.

**Plan de résolution** :
1. Modifier sterny-react/src/components/auth-wizard/TextInput.css : passer le label en 11px weight 700 letter-spacing 1px text-transform uppercase color #1E293B
2. Modifier sterny-react/src/components/auth-wizard/TextInput.jsx : ajouter le support de la prop `placeholder` qui sera affichée dans l'input HTML natif
3. Retirer l'affichage de l'astérisque * orange quand `required={true}` est passé. Soit retirer complètement (préférable), soit conditionner via une prop `showRequired` (default false). Aligner sur IR/CP qui n'utilisent pas d'astérisque visuel.
4. Vérifier visuellement la sandbox /dev/auth-wizard-sandbox après modification : les 16 sections existantes vont changer d'apparence pour s'aligner sur le design canonique. C'est un changement positif (la sandbox devait refléter le design system Sterny qui est IR/CP).

**Effort estimé** : 30 min Claude Code (modifications CSS + JSX + visual diff sandbox).

**Bloquant pré-production** : non en soi (la sandbox est dev-only) mais bloquant pour la livraison du nouveau sous-commit 2/5 du chantier UNIFICATION-INSCRIPTION en conv 6 (qui ne peut pas commencer son rendu E-1 sans le <TextInput> aligné IR).

**Origine** : audit lecture pure IR + CP en clôture conv 5 (4 mai 2026).

## DETTE #59 — Retrait de la flèche ← dans <BackLink>

**Statut au 5 mai 2026 (post conv 8)** : DETTE encore active mais SANS usage en E-2. Le sous-commit 3/5 (fb14252) utilise BottomAuthLinks (avec onRetour={goToPrevStep}) qui ne contient aucune flèche, jamais. La DETTE reste applicable au composant <BackLink> pour les usages futurs de la sandbox + autres écrans à venir (qui pourraient ne PAS utiliser BottomAuthLinks).

**Statut au 4 mai 2026 (post conv 7)** : DETTE encore active mais SANS usage en E-1. Le sous-commit 2/5 livré par 852846d a remplacé `<BackLink>` par `<BottomAuthLinks retourTo="/inscription" retourLabel="Retour" showSignInLink />` qui rend nativement "Retour · Déjà un compte ? Se connecter" sur une seule ligne, sans flèche. DETTE applicable uniquement aux autres pages utilisant encore `<BackLink>` (sandbox + écrans du wizard E-3 à E-7 à venir).

**Statut au 4 mai 2026** : créée par retour Côme en conv 6 ("ça fait pas pro").

**Constat** : le composant <BackLink> partagé (sterny-react/src/components/auth-wizard/BackLink.jsx) affiche actuellement "← Retour" avec une flèche unicode dans le label. Décision Côme : retirer la flèche, garder uniquement le texte "Retour" pour un rendu plus pro et aligné design system Sterny.

**Plan de résolution** :
1. Localiser le rendu de la flèche dans BackLink.jsx (probablement dans le contenu textuel du composant, ex. {`← ${label}`} ou similaire).
2. Retirer la flèche, conserver uniquement {label}.
3. Vérifier visuellement la sandbox /dev/auth-wizard-sandbox (sections concernées : 9-bis ou 10 selon le composant exposant <BackLink>) et les pages IR/CP en mode dev local.
4. Audit grep des autres usages de <BackLink> dans le repo pour confirmer aucun consommateur ne dépend de la flèche.

**Effort estimé** : 15 min Claude Code.

**Bloquant pré-production** : non. Cosmétique pur.

**Origine** : retour Côme conv 6 sur la sandbox AuthWizardSandbox section 10 BackLink.

## DETTE #60 — Hiérarchie typographique IntentCardRadio

**Statut au 5 mai 2026 (post conv 8)** : contournée localement en E-2 par une classe .ial-card-keyword qui injecte le mot-clé en MAJUSCULE via JSX inline dans la prop label du composant. Le composant partagé <IntentCardRadio> lui-même n'a PAS été modifié pour cette hiérarchie typo — il garde sa typo standard 15px / 700 / slate-700. La DETTE reste donc active pour les autres consommateurs futurs du composant : si on veut promouvoir cette hiérarchie globalement, il faudra refondre le composant. Décision reportée à plus tard, le contournement local en E-2 est jugé suffisant pour le moment.

**Statut au 4 mai 2026** : créée par retour Côme en conv 6 ("on ne lit pas les mots clés cherche / propose / les deux").

**Constat** : le composant <IntentCardRadio> (sterny-react/src/components/...) affiche 3 cartes "Je cherche un logement / Je propose mon logement / Les deux" avec un sous-titre descriptif sous chaque. Le mot-clé sémantique principal (cherche / propose / les deux) doit être plus saillant typographiquement pour permettre un scan rapide.

**Plan de résolution** :
1. Identifier le composant <IntentCardRadio> et son CSS associé.
2. Mettre en avant les mots-clés "cherche / propose / les deux" : poids typographique plus fort, couleur orange accent, ou taille augmentée. À tester en majuscule (essai Côme).
3. Audit visuel sandbox + écran réel.

**Effort estimé** : 20-30 min Claude Code (un peu de design itératif).

**Bloquant pré-production** : non. Cosmétique pur.

**Origine** : retour Côme conv 6 sur la sandbox AuthWizardSandbox section 12.

## DETTE #61 — Bascule placeholders IR/CP sur école 2 si IR/CP survivent au-delà du wizard unifié

**Statut au 4 mai 2026** : créée par décision conv 6.

**Constat** : InscriptionRecherchePage.jsx (IR) et CompleterProfilPage.jsx (CP) restent en école 1 (placeholders type "Marie", "Dupont", "marie@email.com", "06 12 34 56 78") tandis que le wizard unifié naît en école 2 (cf. UNIFICATION-INSCRIPTION § 3.5.1). Cohabitation transitoire acceptée tant que IR/CP sont vouées à être remplacées par le wizard.

**Plan de résolution** : aucun travail à faire si IR/CP sont supprimées dans T7 comme prévu. Si pour une raison quelconque IR/CP sont conservées en parallèle du wizard, exécuter l'audit + bascule fait par Claude Code en conv 6 :
- 12 placeholders école 1 identifiés à basculer : IR:473, 477, 482, 486 (identité Dupont/Marie/email/téléphone), IR:547, 559, 574, 585 (alternance + villes), CP:915, 973, 1025, 1046 (ville/rythme/études).
- 6 cas hybrides à arbitrer en plus : IR:606 (mdp longueur min), IR:610 (confirm mdp déjà école 2), CP:848-852 (labels bruts), CP:858 (format date JJ/MM/AAAA), CP:1003 (école avec verbe "Recherche"), CP:1090 (textarea bio).

**Bloquant pré-production** : non. La cohabitation école 1 (IR/CP) + école 2 (wizard) n'a aucun impact utilisateur tant que les 2 parcours ne se croisent pas dans la même session.

**Origine** : décision arbitrage Côme conv 6 (4 mai 2026) — refus de modifier du code voué à disparaître.

## DETTE #62 — Autofill Chrome neutralisation à promouvoir au composant TextInput

**Statut au 5 mai 2026** : créée en conv 8 lors du sous-commit 3/5.

**Constat** : la règle CSS qui neutralise le fond bleu autofill Chrome a été ajoutée dans `InscriptionAlternantPage.css` avec un sélecteur scopé `.ial-form input:-webkit-autofill`. Cohérent pour le sous-commit 3/5 (E-1 est le seul écran avec inputs pour l'instant), mais quand E-3+ auront leurs propres inputs (école, années, filière, villes, etc.), il faudra soit dupliquer la règle dans chaque page, soit la promouvoir dans le composant partagé `TextInput.css`.

**Plan de résolution** :
1. Déplacer le bloc CSS de `InscriptionAlternantPage.css` vers `TextInput.css`.
2. Modifier le sélecteur de `.ial-form input:-webkit-autofill` à `.aw-textinput-input:-webkit-autofill` (la classe portée par l'`<input>` natif dans TextInput.jsx).
3. Vérifier l'absence de régression visuelle en sandbox section 4 (TextInput) et IR (qui consomme `<TextInput>` sur 5 étapes).
4. Décider du sort de la DETTE pour `InscriptionRecherchePage` : promouvoir aussi ou garder localement (cf. politique "ne s'applique pas rétroactivement à IR/CP", comme conv 6 école 2).

**Effort estimé** : 20 min Claude Code.

**Bloquant pré-production** : non. Cosmétique pur (uniquement visible si l'utilisateur a déjà une saisie auto-remplie par Chrome).

**Origine** : conv 8 sous-commit 3/5, retour visuel Côme sur fond bleu Chrome jugé inesthétique.

## DETTE #63 — Icônes IntentCardRadio absentes en E-2

**Statut au 7 mai 2026 (conv 15)** : ✅ **RÉSOLUE** au passage par injection des 3 SVG Material Symbols (loupe/maison/flèches) en prop `icon` lors de la refonte DETTE #67 (même commit). Voir ETAT-COURANT bloc "2026-05-07 (suite) — Conv Claude.ai 15 bloc 1".

**Statut au 5 mai 2026** : créée en conv 8 lors du sous-commit 3/5.

**Constat** : la spec UNIFICATION-INSCRIPTION § 7.3.2 prévoyait textuellement des icônes pour les 3 cartes E-2 (Icône maison + flèche, Icône maison avec clé sortante, Icône cycle / 2 flèches alternées). Aucune icône n'a été câblée en sous-commit 3/5 — alignement sur la démo sandbox section 12 qui n'en utilise pas. La prop `icon` du composant `<IntentCardRadio>` est optionnelle, donc l'ajout est trivial techniquement, mais demande d'arbitrer 3 SVG (loupe pour locataire, maison-clé pour hote, swap pour les_deux ; ou Material Symbols Rounded search / home_work / swap_horiz).

**Plan de résolution** :
1. Choisir la source : Material Symbols Rounded inline SVG (cohérent avec le check icon installé en conv 8) ou SVG custom dans le style IR.
2. Ajouter les 3 SVG en const à l'intérieur de `InscriptionAlternantPage.jsx` (ou dans un fichier séparé `src/components/auth-wizard/IntentCardIcons.jsx` si on prévoit de les réutiliser).
3. Câbler la prop `icon` sur les 3 IntentCardRadio E-2.
4. Test visuel sandbox section 12 + écran E-2.

**Effort estimé** : 30-45 min Claude Code (essentiellement choix design des 3 SVG).

**Bloquant pré-production** : non. Cosmétique pur, absence d'icône reste lisible.

**Origine** : conv 8 sous-commit 3/5, alignement pragmatique sur la sandbox plutôt que sur la spec § 7.3.2 pour livrer rapidement.

## DETTE #64 — Design UI E-4 toggle ville à finaliser pour standard "à la hauteur de Sterny"

**Statut au 6 mai 2026 (soir, conv 12)** : ✅ **RÉSOLUE PAR SIMPLIFICATION PRODUIT**. Décision Côme en conv 12 : suppression du toggle école/entreprise. Pour locataire/hote, une seule ville demandée. Pour les_deux, deux villes avec labels explicites ("Ville où tu proposes" / "Ville où tu cherches"). Commit feat `bea05cd`. Voir VISION §3 (convention slot), VISION §6 (paragraphe "Simplification mono-ville E-4") et ETAT-COURANT bloc "2026-05-06 (soir) — Conv Claude.ai 12".

**Statut au 6 mai 2026** : créée par clôture conv Claude.ai 11 chantier UNIFICATION-INSCRIPTION sous-commit E-4.

**Constat** : le sous-commit E-4 villes & statuts_villes (commit 55475d4) est livré fonctionnellement complet et accessible. Mais le design UI du toggle ville (cas locataire/hote) n'est pas considéré "à la hauteur de Sterny" par Côme. 5 itérations visuelles successives ont été tentées en conv 11 sans atteindre le standard recherché : (a) IntentCardRadio standard, (b) IntentCardRadio variante `.compact`, (c) segmented control gris façon iOS, (d) segmented control affiné avec affichage des noms de villes réels, (e) 2 cartes blanches indépendantes avec bordure orange au sélectionné. Aucune n'a satisfait Côme.

**Diagnostic** : le sujet n'est pas un détail CSS mais un sujet de brief de design. Itérer en aveugle sans référence visuelle cible côté Côme n'est pas une méthode efficace.

**Plan de résolution** : conv Claude.ai dédiée au design E-4 (conv 12 ou ultérieure), démarrée avec un brief enrichi côté Côme : 2-3 références visuelles d'apps qu'il considère "à la hauteur de Sterny" (Linear, Stripe, Notion, Cal.com, Apple, Arc Browser, etc.), description de ce qui lui plaît dans ces apps (typo, shadow, couleur d'accent, espacement, micro-animations), screenshot d'un toggle ou radio de référence si possible. Le design sera conçu en amont (mockup textuel + validation Côme) avant de coder. Pas l'inverse.

**Bloquant pré-production** : non. Le E-4 fonctionnel marche, la logique métier est correcte (validation, navigation, accessibilité, table 1.3 couverte), seul le polish design reste à faire.

**Mise à jour 2 juin 2026 (conv 29) — RÉOUVERTE.** La décision conv 12 (suppression du choix école/entreprise en E-4) est révisée. Motif : la nature de la ville est indispensable au matching (dispo dérivée du rhythm_calendar + nature de la ville) et non dérivable a posteriori. Contexte changé depuis conv 12 (écran E-4 épuré → 1 question claire). Réintroduit pour locataire/hote via CustomSelect (commit dc8eabe), pas via les cartes IntentCardRadio (re-rejetées). Polish visuel reporté à une phase design. Cas les_deux à traiter → DETTE #77.

## DETTE #65 — Auto-capitalize première lettre transverse sur les autres types d'inputs texte

**Statut au 6 mai 2026 (soir, conv 12)** : créée suite à l'amélioration `AutocompleteInput` conv 12.

**Constat** : la prop `capitalizeFirst = true` (par défaut) a été ajoutée au composant `AutocompleteInput` en conv 12, ce qui couvre tous les écrans wizard utilisant ce composant (E-3 école/année/filière + E-4 villes + futurs écrans). Mais les autres types d'inputs texte de la plateforme (champs prénom, nom, bio, descriptions d'annonce, messages chat, etc.) ne bénéficient pas de cette correction. Côme a remonté en conv 12 que la majuscule en début de saisie devrait être un comportement transverse à toute la plateforme.

**Plan de résolution** :
1. Auditer les composants et inputs texte utilisés ailleurs (`<input type="text">` natifs, `<textarea>`, composants partagés type TextInput s'il en existe).
2. Identifier les champs où la capitalisation est attendue (data humaine : prénom, nom, ville, école, titre d'annonce, etc.) vs ceux où elle ne l'est pas (email, mot de passe, URL, code, montant numérique).
3. Soit modifier les composants pour accepter une prop `capitalizeFirst` cohérente avec celle d'`AutocompleteInput`, soit créer un helper utilitaire `capitalizeFirstLetter(str)` à appliquer dans les handlers concernés.
4. Documenter la convention dans le design system.

**Effort estimé** : 1-2h — propagation à plusieurs endroits, pas un chantier en soi.

**Bloquant pré-production** : non, cosmétique pur, visible en UX.

## DETTE #66 — Polish design E-6 (carte trop étirée)

**Statut au 2 juin 2026 (conv 28)** : 🔄 RÉOUVERTE. Le retrait de la photo du wizard (commit ca8d87c, décision conv 26 — progressive profiling) supprime l'élément haut sur lequel reposait l'équilibre vertical validé en conv 15. E-6 réduit à date_naissance + sexe → vide vertical entre les 2 champs (en haut) et le bouton Continuer (en bas) dans la carte à 536px. Polish à arbitrer par Côme directement dans npm run dev, idéalement une fois E-7 branché (vue d'ensemble du parcours). Aucune maquette imposée.

**Statut au 7 mai 2026 (conv 15 bloc 3)** : ✅ **RÉSOLUE** par refonte design E-6 sur grammaire wizard unifiée (commit feat ci-dessus). Photo centrée 80×80 + ligne date+sexe en grille 2 cols + tooltip flottant absolute + bio supprimée. Contenu E-6 plafonné sous 464px → carte à 536px stricts comme les autres étapes. Voir ETAT-COURANT bloc "2026-05-07 (suite) — Conv Claude.ai 15 bloc 3".

**Statut** : créée conv 14 — code fonctionnel, design pas validé visuellement.

**Contexte** : 6 itérations design tentées en conv 14 (subtitle, ial-form-row, refactor labels, grid 2 colonnes, photo centrée, photo-cell sans cadre) sans validation visuelle finale. Carte trop étirée verticalement, sensation de "brouillon" remontée par Côme. Le rendu actuel utilise un grid 2 colonnes (photo gauche + champs droite) avec cercle 72px + badge orange + lien "Ajouter une photo" + ⓘ tooltip — fonctionnel mais design non validé.

**À traiter** : conv dédiée polish wizard (probable conv 15) avec approche méthodique 1 écran à la fois, référence design IR legacy (`/inscription/recherche`) à analyser comparativement, max 2-3 itérations par écran avant clôture.

**Référence** : `InscriptionAlternantPage.jsx` branche `if (state.currentStep === 6)` + `InscriptionAlternantPage.css` classes `.ial-e6-*`.

## DETTE #67 — Refonte E-2 sur pattern IR legacy

**Statut au 7 mai 2026 (conv 15)** : ✅ **RÉSOLUE** par refonte `IntentCardRadio` sur pattern IR legacy compact (commit feat ci-dessus). Voir ETAT-COURANT bloc "2026-05-07 (suite) — Conv Claude.ai 15 bloc 1".

**Statut** : créée conv 14 — détecté en fin de conv lors de la consultation `/inscription/recherche` IR legacy.

**Contexte** : E-2 (Type de profil) du wizard unifié utilise actuellement le composant `IntentCardRadio` (cards radio horizontales 3 cartes) livré T1 conv 5. Le pattern legacy IR `/inscription/recherche` step 3 utilise des cartes "selectable" plus compactes : icône à gauche + texte à droite + bouton radio rond à l'extrémité droite, avec un look plus pro et plus économe en hauteur.

**Sujet à arbitrer** : remplacer `IntentCardRadio` par un nouveau composant aligné sur le pattern IR legacy (à extraire en `auth-wizard/SelectableRadioCard` par exemple), ou conserver `IntentCardRadio` actuel.

**À traiter** : conv 15 dédiée polish wizard, en parallèle de DETTE #66.

**Référence** : `InscriptionAlternantPage.jsx` branche `if (state.currentStep === 2)` (utilise `IntentCardRadio`) + `InscriptionRecherchePage.jsx` step 3 (référence visuelle).

**Origine** : conv 12 du 6 mai 2026, lors de la refonte E-4 villes simplifiée.

## DETTE #68 — Extraction `.aw-screen-title` dans CSS partagé global

**Statut au 11 mai 2026** : créée en clôture conv Claude.ai 19 T3.

**Constat** : la classe `.aw-screen-title` (18px / weight 300 / letter-spacing 3px / orange / center) qui porte le titre "INSCRIPTION" des pages d'auth wizard n'est définie que dans des fichiers CSS locaux (`ChoixInscriptionPage.css` ligne 5 réplique locale, `InscriptionAlternantPage.css` lignes 7 et 263 mobile). Aucune définition globale partagée. Toute nouvelle page d'auth doit re-dupliquer cette classe en local pour ne pas tomber sur le style par défaut `<h1>` du navigateur.

**Priorité** : faible. Pas de bug fonctionnel, juste duplication CSS. La grammaire métho établie en clôture conv 19 (CONTEXTE-PROJET section 8 ter) impose la duplication locale jusqu'à résolution.

**Plan de résolution** : extraction dans un fichier partagé `sterny-react/src/components/auth-wizard/wizard-tokens.css` (ou équivalent) importé par chaque page concernée. À traiter en session T1 cleanup, hors urgence.

**Note de collision** : numéros DETTE #66 et #67 étaient initialement prévus dans le brief conv 19 mais collision avec DETTE #66 (Polish design E-6) et #67 (Refonte E-2 pattern IR) déjà créées en conv 14 + résolues en conv 15. Numérotation décalée à #68 et #69.

## DETTE #69 — `GoogleSignInButton` prop `loading` non câblée visuellement

**Statut au 11 mai 2026** : créée en clôture conv Claude.ai 19 T3.

**Constat** : le composant partagé `GoogleSignInButton` a une signature `({ onClick, label = 'Continuer avec Google', className, style, ...rest })`. Quand on lui passe une prop `loading={true}`, elle est transmise au `<button>` natif via `...rest`, ce qui produit un warning React (prop non-DOM) sans aucun effet visuel (pas de spinner, pas d'opacité, pas de désactivation).

**Priorité** : faible. Pas de bug fonctionnel, juste un warning console et une prop sans effet. Pour l'usage actuel (la prop `loading` n'est plus utilisée par ChoixInscriptionPage suite à la refonte T3 v3 finale), la dette est purement préventive pour un usage futur.

**Plan de résolution** : extension du composant pour câbler vraiment `loading` (spinner blanc remplaçant le label, opacité 0.7, `disabled={true}` sur le button natif). Filtrer la prop pour qu'elle ne soit pas transmise au DOM. À traiter en session T1 cleanup, hors urgence.

## DETTE #70 — Routage OAuthHandler ne doit plus dépendre de `profil_complet`

**Statut au 31 mai 2026 (conv 23)** : créée. Parkée jusqu'au retour sur l'OAuth (après E-7).

**Constat** : `OAuthHandler` route tout utilisateur `profil_complet=false` vers `/inscription/alternant` sans tenir compte de `type_user` → un proprio incomplet est envoyé dans le wizard alternant. Cause profonde : avec l'unification inscription + compléter-profil, l'étape "compléter profil" disparaît. Une ligne `users` n'est créée qu'à la fin (INSERT unique E-7 alternant / INSERT direct proprio), donc `profil_complet=false` est un état qui ne devrait jamais exister dans le modèle cible. Le "Cas B" du handler est un vestige de l'ancienne persistance progressive (INSERT-à-E-1 + UPDATEs partiels) abandonnée.

**Reco (à valider et loguer dans VISION-ARCHITECTURE au retour OAuth)** : router uniquement sur l'EXISTENCE de la ligne `users` (absente → laisser sur le parcours d'inscription ; présente → /dashboard), jamais sur `profil_complet`. Garder `profil_complet` comme garde-fou (toujours true dès qu'une ligne existe) ou la supprimer — à trancher. Prérequis : E-7 construit et définissant l'écriture complète.

**Priorité** : moyenne — bloque la cohérence du retour OAuth, non urgente tant que E-7 n'existe pas.

**Référence** : `OAuthHandler.jsx` (Cas A/B/C, L.44-59) ; `InscriptionProprietairePage.jsx` CHECK 1 (L.72-77) ; VISION-ARCHITECTURE §6 (one-pass E-7).

**Observé conv 28** : symptôme visible en local — le header affiche un avatar connecté (initiales « CF ») sur /inscription/alternant pendant le parcours d'inscription ; une session active n'a pas de garde de route sur le wizard. À diagnostiquer (origine de la session : dev résiduelle vs ligne test founder DETTE #72) et à traiter dans le même chantier E-7/OAuth que ce routage.

## DETTE #71 — Service Agentation `localhost:4747` injoignable en local (ERR_CONNECTION_REFUSED)

**Statut au 31 mai 2026 (conv 23)** : créée. Non bloquant.

**Constat** : en local, la console affiche `POST localhost:4747/sessions` et `GET localhost:4747/health` → ERR_CONNECTION_REFUSED, plus `[Agentation] Failed to initialize session, using local storage: TypeError: Failed to fetch` (référencé App.jsx:188). Le service Agentation (port 4747) n'est pas lancé en local ; fallback gracieux vers le local storage. Aucun impact sur l'inscription.

**Priorité** : faible. À investiguer ultérieurement (rôle d'Agentation, faut-il le lancer en dev ou le fallback suffit-il).

**Référence** : `App.jsx:188`.

## DETTE #72 — Ligne `users` CF périmée (données de test à nettoyer)

**Statut au 31 mai 2026 (conv 23)** : créée.

**Constat** : la ligne `users` de `comefourel@gmail.com` (id c2e5770e-…) est un reliquat de test : `type_user=proprietaire`, `profil_complet=false`, créée le 25 février 2026 avec parrainage de test. Cet état n'a plus de sens dans le modèle cible et fausse les tests de redirection (cf. DETTE #70).

**Plan** : pour retester le flux alternant OAuth, utiliser un compte Google sans ligne `users` ou de type alternant — ou corriger/supprimer cette ligne. Ne pas tester le parcours alternant avec ce compte proprio.

**Priorité** : faible (donnée de test, pas un bug code).

**Référence** : table `public.users`, id c2e5770e-65ca-4b15-acc0-95a3d21849c1.

## DETTE #73 — Policy RLS INSERT sur `public.users` en `WITH CHECK (true)`

**Statut au 31 mai 2026 (conv 24)** : créée (audit lecture seule).

**Constat** : la policy INSERT « Users can insert own profile » est en `WITH CHECK (true)`, sans contrôle `auth.uid() = id` → tout rôle authentifié peut insérer une ligne `users` avec un `id` arbitraire. Seule la clé étrangère `users_id_fkey` vers `auth.users` freine. Faille de sécurité.

**Plan** : restreindre le `WITH CHECK` à `auth.uid() = id` une fois le flux E-7 stabilisé (après vérification qu'aucun chemin légitime n'insère pour un autre `id`). À inscrire à la revue sécurité/RGPD professionnelle avant lancement.

**Priorité** : moyenne. **Réf** : policies `public.users`, `remote_schema.sql`.

## DETTE #74 — Environnement Supabase local non reproductible (schéma absent des migrations) [RÉSOLUE]

**Statut au 2 juin 2026 (conv 27)** : RÉSOLUE. `supabase db reset` rejoue les 8 migrations depuis zéro sans erreur.

**Constat initial (conv 26)** : `supabase start` sur base fraîche échouait — `function public.is_admin() does not exist` à la migration 090000. Cause : la migration initiale 20260421082830 était VIDE ; le vrai schéma vivait dans supabase/remote_schema.sql (hors migrations/), rejoué par rien. Seed déclaré actif mais fichier absent.

**Fix appliqué (conv 27)** :
- Contenu de supabase/remote_schema.sql (dump propre, ~21-24 avril, 1973 lignes) intégré dans la migration initiale 20260421082830 — pose le schéma de base avant les migrations dépendantes.
- Migration 20260421090000 rendue idempotente : 2 CREATE INDEX en IF NOT EXISTS + DROP POLICY IF EXISTS devant les 4 policies rhythm_imports (seules collisions, déjà présentes dans le dump).
- supabase/seed.sql vide créé.

**Critère de succès (validé)** : `supabase db reset` passe sans erreur — seul test valable de la baseline. Destructif LOCAL uniquement, jamais la prod.

**Caveat prod (au déparquage prod)** : remplir une migration déjà appliquée crée une divergence fichier/prod sans danger SI la version est marquée appliquée côté Remote. Avant tout `supabase db push`, vérifier via `supabase migration list` que 20260421082830 et 090000 sont bien présentes côté Remote — sinon elles seraient rejouées en prod et entreraient en collision avec le schéma existant.

**Note triggers HTTP (local)** : le dump contient 2 appels HTTP sortants (handle_new_alerte via net.http_post + trigger send-alert-on-insert vers l'Edge Function prod send-alert-email). Non bloquants au démarrage, mais tout INSERT sur la table alertes en local taperait la prod. Consigne : ne pas insérer dans alertes en local tant que ces triggers ne sont pas neutralisés.

**Réf** : supabase/migrations/20260421082830, 20260421090000, supabase/seed.sql, config.toml [db.seed].

## DETTE #75 — Conteneur Studio local unhealthy + CLI Supabase obsolète

**Statut au 2 juin 2026 (conv 27)** : créée. Non bloquante pour les tests RPC/DB.

**Constat** : `supabase start` complet échoue sur le health check du conteneur Studio (supabase_studio_STERNY unhealthy) → rollback de toute la stack. Contournement appliqué : `supabase start -x studio,imgproxy` démarre la base sans l'UI web (localhost:54323) ni le proxy d'images — suffisant pour les tests RPC/migrations. CLI Supabase v2.90.0 installée, v2.104.0 disponible (cause possible). Contexte : env sortait d'un disque plein + redémarrage Docker (DETTE #74).

**Impact** : pas d'UI Studio locale. Aucun impact sur migrations ni tests RPC.

**Piste** : mettre à jour la CLI Supabase, retenter `supabase start` complet ; si Studio reste unhealthy, investiguer via les logs docker.

**Priorité** : basse. **Réf** : `supabase start -x studio,imgproxy`, CLI Supabase v2.90.0.

## DETTE #76 — Incohérence des 4 colonnes ville/statut entre wizard, legacy et dashboard

**Statut au 2 juin 2026 (conv 29)** : créée (surfacée par l'audit E-4).

**Constat** : les 4 colonnes (ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise) sont utilisées de façon incohérente :
- Wizard E-4 : ville unique (locataire/hote) → ville_entreprise ; les_deux par action (propose→ville_entreprise, cherche→ville_ecole) ; statuts laissés null.
- Legacy InscriptionRecherchePage (l.354-369) : ville de recherche → ville_ecole + statuts remplis — convention opposée au wizard.
- DashboardLocatairePage : détecte les_deux via (statut_ville_ecole='hote' && statut_ville_entreprise='recherche') — statuts jamais remplis par le nouveau parcours → détection KO (seul type_user='les_deux' la sauve) ; affiche ville_ecole→« Hote », ville_entreprise→« Recherche ».

**Conséquence** : remplir correctement les 4 colonnes à E-7 (nature + statut) entrera en conflit avec le dashboard/legacy si une convention unique n'est pas figée et propagée.

**Plan** : une fois E-7 + les_deux construits avec la capture de nature, figer UNE convention (colonne=nature, statut=action, VISION §65-86) et la propager (DashboardLocatairePage, ModifierProfilPage, sort du legacy à décider). Chantier dédié, distinct de E-7.

**Priorité** : moyenne. **Réf** : InscriptionAlternantPage E-4, InscriptionRecherchePage l.354-369, DashboardLocatairePage l.104/338/391/580/620/627, VISION §65-86.

**MAJ 2026-06-09 (conv 43)** : nouvelle manifestation au dashboard locataire — le gate l.610 du bloc « ville de recherche + menu "+" » teste `userData.ville` (colonne dépréciée, NON peuplée par le wizard actuel). Pour tout compte du nouveau parcours, ce champ est vide → le menu "+" ne se rend jamais → (a) la bascule locataire→les_deux et l'ajout d'une ville de recherche sont INACCESSIBLES (feature pourtant documentée « en place », CONTEXTE §3) ; (b) la modale ville (#86) est inatteignable par ce chemin, donc le fix CSS #86 (commit 55c8a97) non validable runtime tant que ce gate n'est pas corrigé. Correctif = lire ville_ecole/ville_entreprise au lieu de ville, dans ce chantier après fige de convention.

**MAJ 2026-06-09 (conv 45) — correctif MONO livré + note conv 43 démentie par la donnée.** Vérification base locale (compte locataire de test) : `ville_ecole='Rennes'`, `statut_ville_ecole='recherche'`, colonne dépréciée `ville`=VIDE. Donc la note conv 43 « statuts jamais remplis par le nouveau parcours » est FAUSSE : le wizard écrit bien nature+statut conformes (#77 résolue). #76 est un bug de LECTURE du dashboard, pas d'écriture. **Livré (commit feat)** : helper `getVillesUtilisateur(user)` ajouté dans `utils/deriveVilleColonnes.js` (lecture inverse : 4 colonnes → liste `{ville,nature,action}`) ; branché sur le cas MONO de DashboardLocatairePage (gate l.611, affichage l.615, flux recherche l.371/580). Bloc « ville + bouton + » ré-affiché (« Rennes »). Validé runtime. **RESTE #76** : cas les_deux (mapping figé l.602/609 `ville_entreprise`→« Recherche » / `ville_ecole`→« Hôte ») NON corrigé — non testable sans compte les_deux ; à brancher sur le même helper (action dérivée de `statut_ville_*`). Lecteurs `ville_ecole`/`ville_entreprise` directs ailleurs (l.318 filtre hôte, etc.) non audités cette passe.

## DETTE #77 — Capture de la nature ville pour le cas les_deux en E-4

**Statut au 3 juin 2026 (conv 30)** : ✅ RÉSOLUE (commit 022baba). les_deux réutilise la question de nature de la mono (« {ville}, c'est ta ville d'école ou d'entreprise ? ») posée sur la ville PROPOSE (slot ville_entreprise) ; la nature de la ville CHERCHE (slot ville_ecole) est DÉDUITE opposée. Champ unifié `nature_ville` pour mono ET les_deux ; `ecole_emplacement` (ajouté en cours de conv) abandonné. Garde-fou : question unique → état « deux écoles » non représentable. validateE4 les_deux exige nature_ville. Visuel aligné sur la mono (typo .ial-step-subtitle, sous-titre générique retiré, options « École / Entreprise », resserrage margin-top 10px). CAPTURE SEULE — dérivation des 4 colonnes/statuts déléguée à E-7 (propose→'hote', cherche→'recherche'). Combos cherche×2 / propose×2 hors périmètre : non capturables à l'inscription, à vérifier côté dashboard (le modèle n'a qu'un statut par colonne) — non acquis.

**Statut au 2 juin 2026 (conv 29)** : créée.

**Constat** : la capture de la nature école/entreprise a été réintroduite en E-4 pour locataire/hote (mono-ville, commit dc8eabe, champ nature_ville + CustomSelect). La branche les_deux n'a PAS été traitée : elle capture ses 2 villes par action (« où tu proposes » → ville_entreprise, « où tu cherches » → ville_ecole), sans nature ni statuts.

**Plan** : avant E-7, étendre la capture de nature au cas les_deux (nature de chacune des 2 villes + action de chacune) pour remplir ville_ecole/ville_entreprise par nature + statut_ville_* par action (VISION §65-86). Forme visuelle pilotée par Côme.

**Priorité** : moyenne — prérequis à un E-7 qui écrit des données conformes pour un profil les_deux. **Réf** : InscriptionAlternantPage branche E-4 les_deux, useInscriptionWizard validateE4.

## DETTE #78 — Normalisation des villes (référentiel canonique) pour fiabiliser le matching

**Statut au 3 juin 2026 (conv 30)** : créée.

**Constat** : les champs ville du wizard (AutocompleteInput, E-4) acceptent du texte libre — une ville inexistante ou mal orthographiée passe. Or le matching croise la ville du logement avec les villes de l'utilisateur (VISION §112-131) : sans identité canonique (forme unique + identifiant), deux saisies de la même ville ne se comparent pas de façon fiable, et une ville hors référentiel ne peut pas être croisée. Risque : matching qui rate silencieusement.

**Reco (à valider)** : résoudre la saisie vers une ville réelle canonique au moment de la saisie via Mapbox (déjà dans la stack) — proposer de vraies villes, exiger une sélection, stocker le résultat normalisé (nom officiel + coordonnées GPS + identifiant). Les coordonnées ouvrent un matching de proximité ultérieur (villes voisines). Ne PAS pré-charger une base de toutes les communes.

**Première étape** : audit lecture seule de `AutocompleteInput` (Mapbox, liste statique, ou rien ?) avant toute décision.

**Priorité** : moyenne — non bloquant pour E-7, mais à trancher AVANT de construire le matching. À inscrire à la revue (source canonique de villes).

**Réf** : AutocompleteInput, InscriptionAlternantPage E-4, VISION §112-131.

**MAJ 2026-06-14 (conv 57) — audit lecture seule + décision.**
Constat : pas de source unique de villes. Deux listes en dur coexistent — VILLES_FRANCE (181, France entière, saisie ville perso via AutocompleteInput, valeur = string brute) et VILLES_DISPONIBLES (10 bretonnes, villes de lancement) présente dans 7 emplacements, homepage incluse (HomePage, RecherchePage +VILLES_COORDS, InscriptionPartagerPage, CompleterProfilPage, InscriptionRecherchePage, DashboardLocatairePage, ModifierProfilPage). Aucune table/RPC de couverture ; annonces.ville en texte libre.
Trois notions distinctes actées : (1) saisie all-France ; (2) villes de lancement (curé) ; (3) villes avec annonces (dérivable, non bâti).
Décision : la barre homepage suggère les VILLES DE LANCEMENT (notion 2), pas (1), pas (3). On consolide (2) en une source unique (sterny-react/src/data/villes-lancement.js) importée par tous les consommateurs. Dérivation (3) différée (gros chantier : RPC + normalisation texte libre). La normalisation canonique pour le matching reste le cœur non-soldé de #78.

**MAJ 2026-06-14 (conv 58, clôture) — cohérence des villes à l'inscription (à traiter rapidement, après 5b-1).** Constat : les champs ville de l'inscription utilisent VILLES_FRANCE (181, all-France) ; un alternant peut s'inscrire avec une ville où Sterny n'opère pas → compte cul-de-sac. À contraindre, mais de façon ASYMÉTRIQUE (PAS un swap global) : la ville où l'utilisateur CHERCHE / PROPOSE sur Sterny → villes de lancement ; la ville COMPLÉMENTAIRE (son autre ville) → reste all-France, car nécessaire au calcul des disponibilités (VISION §114-133 : Sterny croise la ville du logement avec les 2 villes de l'utilisateur ; ex. étudie Paris / entreprise Quimper / propose Quimper → besoin de « Paris » pour le calcul). Avant patch : audit du parcours d'inscription unifié (identifier quel champ = usage Sterny vs complémentaire), puis règle 8ter (composants auth-wizard). Révise la position conv 57 (« saisie all-France »), qui devient asymétrique.

## DETTE #79 — Comptes auth orphelins (signUp sans RPC complétée)

**Statut au 4 juin 2026 (conv 31)** : créée.

**Constat** : à E-7, le compte `auth.users` est créé par signUp AVANT l'appel RPC qui crée la ligne `public.users`. Si l'utilisateur abandonne entre les deux, il reste un compte auth sans ligne `public.users` — l'angle mort jumeau de DETTE #70 ("authentifié mais sans ligne users").

**Conséquences** : (a) le routage post-auth doit gérer "session active + pas de ligne users" → renvoyer dans le wizard, jamais vers /dashboard ; (b) accumulation de comptes auth fantômes → stratégie de purge à définir.

**Plan** : traiter avec DETTE #70 au retour routage/OAuth (après E-7 bout-en-bout). Le miroir sessionStorage limite déjà le cas "refresh sur l'écran code". À inscrire à la revue sécurité/RGPD.

**Scénario mobile (conv 32)** : si l'utilisateur quitte vers son appli mail puis revient, le retour sur l'écran code repose sur le miroir sessionStorage ; or sessionStorage peut être vidé si le navigateur mobile purge l'onglet de la mémoire → l'utilisateur retombe en arrière avec un compte auth déjà créé. Arbitrage sessionStorage vs localStorage à rouvrir avec le routage/OAuth.

**Priorité** : moyenne. **Réf** : EtapeCreationCompte.jsx, DETTE #70, OAuthHandler.

## DETTE #80 — E-5 : semaines passées/en cours sélectionnables dans le builder de rythme

**Statut au 4 juin 2026 (conv 31)** : créée (surfacée en validant E-7).

**Constat** : le builder E-5 laisse cliquer n'importe quelle semaine de l'année académique, y compris écoulées et la semaine ISO en cours. Incohérent avec le wording (« où tu SERAS à l'école » = futur) et VISION §137-149 (aucun matching/facturation sur semaines passées ; date d'effet ≥ semaine ISO en cours).

**À trancher (chantier E-5, décision à loguer en VISION)** : bloquer visuellement toute semaine dont le lundi ISO ≤ lundi de la semaine en cours ; revoir le défaut du sélecteur d'année (en juin, 2025-2026 quasi finie ; VISION §147 propose année courante + suivante) ; statuer sur la conservation descriptive des semaines passées (VISION §139-141) vs capture du futur seulement.

**Priorité** : moyenne (correctness matching/facturation). À traiter dans le chantier de refonte E-5, pas pendant E-7.

**Réf** : RhythmManualBuilder / étape E-5, VISION §137-149 et §147.

**Statut au 2026-06-06 (conv 35) — RÉSOLUE** (commit fix 5ea6964). RhythmManualBuilder.jsx : helper module unique `isWeekBlocked(week, mondayCurrentTs)` = `week.mondayTs <= mondayCurrentTs` (seuil lundi `<=` → bloque passé + semaine en cours, contre l'ancien seuil jeudi `<`). Partagé par `pastWeekStarts` (rendu grisé + garde `toggleWeek`), hydratation `initialPast`, et `materialize` (qui n'émet plus que du futur → asymétrie #82 lot 1 résorbée). Wording cellule bloquée → « passée ou en cours ». Défaut du sélecteur d'année **inchangé** (décision produit logée VISION). Validé visuellement. Réserve VISION §151 : vérifier qu'aucun code aval ne suppose un calendrier complet 52 semaines avant le chantier paiement/matching.

## DETTE #81 — Modale Q8 (confirmation du planning) à aligner sur la grammaire des cartes wizard

Aujourd'hui la modale a sa propre forme (rmb-modal-*). À refaire pour reprendre : la forme de carte (.aw-screen-card — radius 16px, border #E8EAF0, shadow) ; « Confirmer mon planning » = bouton principal style carte (PrimaryButton / .ial-btn-continuer, orange pleine largeur) ; « Revenir au calendrier » = lien retour SOUS le bouton (comme BottomAuthLinks). Texte à raccourcir : (a) ne coche que tes semaines d'école ; (b) attention, une erreur a de grosses conséquences sur tes réservations. Lecture 8ter requise (PrimaryButton, BottomAuthLinks, .ial-btn-continuer, .aw-screen-card).

**Statut au 2026-06-06 (conv 34) — RÉSOLUE** (commit feat 86e6cc7). **Cible corrigée après audit des modales existantes** : référent = pattern popup maison **RhythmRequiredPopup** (popup frère, même builder), PAS « carte wizard » (.aw-screen-card). Panel : radius 20, borderless, ombre sombre 0 24px 64px rgba(0,0,0,0.25), hauteur auto, max-width 400, padding 32, contenu centré. Bouton = PrimaryButton importé (pleine largeur) ; « Revenir au calendrier » = lien centré dessous (style aw-bottom-auth-link recopié sur <button>, sans border-top). Classes .rmb-modal-btn-* supprimées. Wording : titre « Vérifie ton planning » + corps « Assure-toi d'avoir coché les bonnes semaines d'école… » — sous réserve avocat (DETTE #45).

## DETTE #82 — Capture multi-années dans le builder E-5 (mise en œuvre)

Permettre de saisir plusieurs années académiques en une inscription (ex. fin de l'année courante + année suivante). Voir la décision d'architecture en VISION-ARCHITECTURE.md. Travaux : (1) navigation par flèches entre années plutôt que le seul déroulant ; (2) ANNULER le reset des cases au changement d'année introduit en b3619e2 — au contraire accumuler les sélections des deux années (les lundis sont des dates uniques, un seul ensemble suffit), compteur = total cumulé ; (3) la confirmation doit matérialiser les semaines des DEUX années, pas seulement l'année affichée — retravailler materialize + définir « le reste = entreprise » sur le périmètre des années visitées ; (4) écriture en ajout/upsert par (utilisateur, lundi), jamais de remplacement global ; (5) intégrer DETTE #80 (bloquer les semaines passées) — synergie : en juin l'année courante est surtout du passé grisé + quelques semaines futures. PRÉALABLE : lire le schéma réel de rhythm_calendar + ce qu'écrit le RPC complete_inscription_alternant avant toute conception.

**Statut au 2026-06-05 (conv 33) — PRÉALABLE LEVÉ.** Socle data déjà conforme et multi-années-ready (colonne `jsonb` sans CHECK ; RPC valide lundi/status/unicité sans cap ni borne d'année et écrit tel quel ; builder émet les mêmes clés). **Aucune migration, aucune modif RPC pour l'inscription.** Scope réduit au builder : state `clicked` keyé lundi absolu sans reset au changement d'année + `materialize` = union des années visitées. Réserve ajout post-inscription : RPC en remplacement total → relire+fusionner côté client (ou RPC d'ajout dédiée), à cadrer après audit dashboard.

**Statut au 2026-06-05 (conv 33) — LOT 1 LIVRÉ (accumulation).** RhythmManualBuilder.jsx : reset au changement d'année supprimé (les cases s'accumulent, Set keyé par lundi absolu) ; `materialize` réécrit sur l'union des années **renseignées** (décision (b) : une année n'entre que si ≥1 semaine y est cochée), dédup par lundi + tri ; inversion `villeRecherchee` préservée. Bug round-trip corrigé : l'hydratation de `clicked` couvre désormais l'union des années candidates (helper partagé `candidateAcademicYears()`) — avant, seule l'année par défaut était restaurée au retour sur E-5. Validé visuellement (aller-retour E-5↔E-7, 2 années conservées). **Précision (b)** : remplace « périmètre des années visitées » du point (3) par « années renseignées (≥1 clic) ». **Garde « semaines passées → company »** retiré de `materialize` et renvoyé à #80 (sans impact transactionnel, VISION §141-143) ; note : l'hydratation exclut toujours le passé → asymétrie sans effet sur les semaines futures, à résorber avec #80. **Reste #82** : intégration #80 (semaines passées sur l'union) + élargissement au-delà de 2 ans + écriture ajout/upsert post-inscription. **(1) navigation par flèches : LIVRÉE** (conv 33, 09db163 feat + a580970 style).

**Statut au 2026-06-07 (conv 37) — (a) LIVRÉE + audit dashboard ; (b) recadré et PARQUÉ.** Audit dashboard (lecture seule) : aucune surface de rythme au dashboard (`rhythm_calendar` ni lu/affiché ni édité hors wizard ; `RhythmCalendarPreview` dev-only ; `RhythmManualBuilder` importé seulement par E-5). Seul chemin d'écriture = E-7 (`complete_inscription_alternant`, remplacement total). `confirm_rhythm_calendar` / `_manual` sans appelant front. Aucun lecteur aval de `rhythm_calendar`. → **Point (b) recadré** : « écriture ajout/upsert post-inscription » n'est pas un simple upsert mais une feature dashboard complète (affichage rythme + point d'entrée d'édition + écriture fusionnante) ; **PARQUÉ** jusqu'au dashboard fusionné + moteur lisant `rhythm_calendar` ; ne pas créer de RPC d'ajout orpheline avant qu'un écran l'appelle. **(a) navigation au-delà de 2 ans : LIVRÉE** (commit feat 7f3e782) — flèches E-5 en pas-à-pas (`previousAcademicYear`/`nextAcademicYear`), plancher = année courante, pas de plafond futur ; `candidateAcademicYears` dérivé des données (couvre hydratation + materialize). **Bonus : année académique redéfinie septembre→août** (par mois du JEUDI, ISO) : `firstMondayForAcademicYear` part du 1ᵉʳ jeudi de septembre ; `academicYearForMonday` classe par mois du jeudi ; `weeksForAcademicYear` génère 52 ou 53 semaines (tuilage parfait). Affichage : 12 colonnes SEP→AOÛ identiques, semaine de fin août rattachée à l'année précédente. Aucun impact BDD (lundis absolus stockés, année dérivée). **#82 désormais : seul (b) reste, parqué.**

## DETTE #83 — Généraliser l'œil afficher/masquer à tous les champs mot de passe

**Statut au 2026-06-07 (conv 36)** : créée. L'œil a été ajouté au composant partagé TextInput (conv 36, commit 71c019b) mais ne couvre que les champs password rendus VIA TextInput — aujourd'hui seul E-7 (EtapeCreationCompte).

**Constat** : la majorité des champs mot de passe de la plateforme sont des `<input type="password">` natifs hors TextInput, donc non couverts : ConnexionPage (toggle TEXTE maison « Afficher/Masquer », `.cx-password`), ModifierProfilPage, ModifierProfilProprietairePage, InscriptionRecherchePage, DashboardProprietairePage, ParametresPage, PasswordGate.

**Plan (à arbitrer)** : (a) migrer ces champs vers le composant TextInput (réduit la duplication, mais refactor par écran), ou (b) extraire l'œil en hook/composant réutilisable pour les inputs natifs. ConnexionPage : remplacer le toggle texte par l'œil pour cohérence visuelle.

**Bloquant pré-production** : non. Cohérence/cosmétique.

**Origine** : audit conv 36 (œil TextInput).

**Statut au 2026-06-07 (conv 38) — APPROCHE (b) ACTÉE + LOT 0 LIVRÉ.** Arbitrage tranché : (b) composant réutilisable contrôlé pour les inputs natifs, PAS migration vers TextInput (composant auth-wizard à grammaire stricte ; 5/6 cibles hors auth ; migration = refactor risqué pour gain cosmétique). Lot 0 (pilote) : `components/PasswordRevealButton.jsx` + `.css` (props visible/onToggle/disabled ; SVG+CSS repris de TextInput ; classes pw-* ; a11y identique ; masqué=œil ouvert / affiché=œil barré), appliqué à PasswordGate. Particularités PasswordGate (tout inline) : padding-right 44px en inline (`.pw-has-reveal` retirée car neutralisée), marge basse déplacée de l'input vers `.pw-field` pour centrer l'œil. Validé visuellement. **Reste** : lot 1 (ModifierProfilPage + ModifierProfilProprietairePage), lot 2 (DashboardProprietairePage + ParametresPage), lot 3 (InscriptionRecherchePage, lecture 8ter renforcée), lot 4 (ConnexionPage : remplacer le toggle texte par l'œil). 1 lot = 1 commit feat.

**MAJ clôture conv 38** : lot 0 livré+poussé. Lots 1 (profils, 4 champs), 3 (InscriptionRecherchePage), 4 (ConnexionPage : remplacement du toggle texte par l'œil) PATCHÉS mais NON validés visuellement et NON commités (working tree — voir git status). Lot 2 (DashboardProprietairePage + ParametresPage) non commencé. Reprise : valider + committer par lot (feat, git add par chemin), puis lot 2.

**MAJ 2026-06-07 (conv 39)** : lots 1 (profils, 70704d5) et 4 (ConnexionPage, 7f2e795) livrés, validés et POUSSÉS (9e3f802..7f2e795). Lot 3 (InscriptionRecherchePage) ABANDONNÉ : page legacy vouée à suppression (unification Q3/T6) ; modifs restaurées. Périmètre figé par grep global type="password" : seuls les 4 champs du lot 2 (DashboardProprietairePage + ParametresPage) restent ; DashboardLocatairePage a du CSS .modal-pwd-group résiduel mais aucun input password en JSX. Lot 2 PATCHÉ (build vert) mais NON validé / NON commité (working tree) : validation bloquée par bug préexistant /parametres (rend seulement le footer) + pas de compte proprio de test. Reste : valider lot 2 → commit feat → push → #83 bouclé.

**MAJ 2026-06-08 (conv 42)** : moitié parametres du lot 2 LIVRÉE (commit 6562990 — œil sur les 2 champs de la modale mdp de ParametresPage). Prérequis levés d'abord : rendu de /parametres (commit b56ce1f, colonne photo_profil_url) + affichage des modales (commit 1898c81, DETTE #86). **Moitié Dashboard proprio TOUJOURS NON commitée** : sa modale mdp est masquée par la même collision .modal-overlay (DETTE #86), pas encore corrigée sur cette page → reportée à la revue du dashboard proprio. **#83 à moitié bouclé** : reste la moitié proprio (débloquer #86 côté dashboard proprio → valider l'œil → commit feat).

## DETTE #84 — Providers OAuth Google/Apple non activés côté Supabase

**Constat (conv 40).** Le code OAuth est complet et correct côté front (boutons Google + Apple sur ConnexionPage, InscriptionProprietairePage et le wizard alternant ; URL authorize bien formée). Mais le clic échoue en local avec : `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`.

**Cause.** Config Supabase, pas un bug code : les providers Google et Apple ne sont pas activés dans le dashboard Supabase Auth, et les credentials OAuth ne sont pas créés.

**À faire (config / setup, hors code) :**
- Google : créer un OAuth client (Google Cloud Console), renseigner client ID + secret dans Supabase Auth, configurer les redirect URLs (local + préprod + prod).
- Apple : créer un Service ID + clé (Apple Developer, compte payant requis), configurer dans Supabase.
- Tester le retour OAuth bout-en-bout (création de session, garde CHECK 2 post-OAuth, redirection par rôle).

**Priorité.** Prérequis au test des parcours OAuth. Ne bloque ni le login email/mdp ni l'inscription email/OTP. À traiter avant la mise en préprod des parcours sociaux.

## DETTE #85 — Incohérence de longueur minimale de mot de passe entre parcours d'inscription

**Statut au 8 juin 2026 (conv 41)** : créée lors du re-skin InscriptionProprietairePage.

**Constat** : les deux parcours d'inscription n'appliquent pas la même règle de longueur de mot de passe. Création de compte alternant (`EtapeCreationCompte.jsx:285`, écran E-7) affiche le placeholder « 8 caractères minimum ». Inscription proprio (`InscriptionProprietairePage.jsx`, `handleSubmit`) valide `password.length < 6` + placeholder « 6 caractères minimum ». Politique non homogène sur une même plateforme.

**À vérifier avant d'harmoniser** : la validation EFFECTIVE des deux côtés, pas seulement les placeholders — la condition JS réelle de chaque page ET le réglage « Minimum password length » de Supabase Auth (défaut 6). Le « 8 » côté alternant est peut-être lui-même un placeholder non aligné sur sa vraie validation.

**⚠️ Sécurité** : le choix de la longueur minimale (et d'éventuelles exigences de complexité) relève d'une décision produit/sécurité, à valider lors de la consultation sécurité/RGPD prévue comme étape obligatoire avant lancement (CONTEXTE §9, VISION §10). Ne pas trancher à l'aveugle.

**Priorité** : basse, non bloquant. À traiter au durcissement de l'auth, avec #84 et #70.

**Référence** : `EtapeCreationCompte.jsx:285`, `InscriptionProprietairePage.jsx` (handleSubmit).

## DETTE #86 — Collision CSS globale sur .modal-overlay (modales masquées dans la zone authentifiée)

**Statut au 2026-06-08 (conv 42)** : créée lors du bilan MVP étape 2 (audit /parametres). **Fix tactique /parametres livré** (commit 1898c81).

**Constat** : la classe `.modal-overlay` est redéfinie dans plusieurs CSS de pages, toutes globales (pas de scoping), avec des conventions incompatibles :
- DashboardProprietairePage.css:1706 et DashboardLocatairePage.css:465 → `.modal-overlay { display: flex }` (visible par défaut ; visibilité pilotée par le rendu conditionnel en JSX).
- ContratLocationPage.css:539 → `.modal-overlay { display: none }` + `.modal-overlay.active { display: flex }` (masquée par défaut ; visibilité pilotée par la classe `.active`).
À spécificité égale (1 classe), l'ordre d'injection du bundle tranche. Dans App.jsx, ContratLocationPage est importée après les dashboards → sa règle `display:none` gagne la cascade → `.modal-overlay` calcule `display:none` globalement.

**Conséquence** : toute modale rendue avec `.modal-overlay` SANS `.active` (ParametresPage mdp + suppression ; modale mdp Dashboard proprio ; probablement d'autres) est montée dans le DOM mais masquée → perçue comme bouton mort. JS sain (state à true, DOM monté) ; seul le CSS masque. Seules les modales de ContratLocationPage (qui ajoutent `.active`) s'affichent.

**Impact lot 2 #83** : l'œil mdp est dans ces modales → validation bloquée tant que la modale ne s'affiche pas. Moitié parametres débloquée par le fix tactique ci-dessous ; moitié Dashboard proprio encore bloquée.

**Fix tactique (conv 42, commit 1898c81)** : override scopé `.parametres-container .modal-overlay { display: flex }` (spécificité 0,2,0 > globale 0,1,0), sans toucher ContratLocationPage ni les dashboards. Débloque /parametres uniquement.

**Fix racine (chantier dédié)** : unifier UNE convention `.modal-overlay` + extraire en CSS partagé (ou composant Modal). ⚠️ Touche ContratLocationPage (signature, P0 juridique) → test complet sans régresser la signature. Auditer toutes les pages utilisant `.modal-overlay`.

**Priorité** : haute (P1) — masque silencieusement des modales dans toute la zone authentifiée.

**MAJ 2026-06-09 (conv 43)** : 2e instance traitée — modale « ville » de DashboardLocatairePage, override scopé `.dashboard-container .modal-overlay` (commit 55c8a97), même pattern que /parametres. ⚠️ NON validé runtime : la modale reste inatteignable car son point d'entrée (menu « + ») est masqué par le gate `userData.ville` (voir #76) → validation différée à la levée de ce gate. Couverture : /parametres ✅ + dashboard locataire (sur revue) ; reste la modale mdp du dashboard proprio (moitié #83) et le fix racine.

**MAJ 2026-06-09 (conv 45) — instance dashboard locataire VALIDÉE runtime.** La levée du gate #76 (correctif mono) rend la modale ville atteignable : clic « + » → « Rechercher un logement » → la modale « Ajouter une ville de recherche » s'affiche (fix scopé `55c8a97` enfin validé en live). Couverture #86 : /parametres + dashboard locataire. Reste : moitié mdp dashboard proprio (#83) + fix racine (unifier `.modal-overlay`, touche ContratLocationPage P0).

## DETTE #87 — Collision CSS globale sur `.empty-icon` (états vides)

Même famille que #86 :
- `.empty-icon` était défini deux fois en global non scopé : `DashboardLocatairePage.css` (64px) et `DashboardProprietairePage.css` l.1138 (56px, radius 14). L'ordre du bundle décidait arbitrairement laquelle s'appliquait.
- **Résolu côté locataire** (2026-06-10, commit c3f6620) : `.empty-icon`/`.empty-icon svg`/`.empty-text` du fichier locataire scopées sous `.dashboard-container` (spécificité 0,2,0 > 0,1,0 global) → gagnent toujours, indépendamment du bundle. Proprio non touché.
- **Reste à faire** : le `.empty-icon` du proprio (l.1138) est toujours global non scopé — à scoper sous `.dashboard-proprio-container` lors de la revue proprio parquée, pour fermer la collision des deux côtés.

## DETTE #88 — Fuite globale de la règle `.btn` (CreerAnnoncePage.css) — famille #86/#87

- `CreerAnnoncePage.css:1593` définit `.btn` (nu, non scopé) avec une cascade de `!important` (padding/height/radius/font-weight...). Tout le CSS étant bundlé globalement, cette règle s'applique à TOUT `.btn` de l'app et écrase les définitions locales.
- **Partiellement traité** (2026-06-10, commit fix(css)) : `text-transform:uppercase !important` + `letter-spacing:1px !important` retirés → la casse n'est plus forcée (boutons en casse normale partout).
- **Reste à faire** : les autres `!important` (height 44px, padding 0 24px, radius 12px, font-weight 600) fuient toujours sur tous les `.btn` hors page annonce. Vrai nettoyage = scoper la règle. Audit 2026-06-10 : pas de wrapper racine unique (3 contextes `.user-type-screen` + `.create-container` + modale crop) ; le `.jsx` porte le bypass DEV → scoping à faire en CSS sur les 3 contextes (pas via wrapper JSX). À grouper avec le nettoyage collisions CSS (#87 proprio).

## DETTE #89 — `notifications_in_app.lien` consommé de deux façons incompatibles

**Statut** : ouverte, non bloquante. Repérée le 2026-06-10 pendant le fix DETTE #14.

**Problème** : `NotificationBell.jsx` (~l.89) fait `window.location.href = lien` (traite `lien` comme une URL absolue, recharge la page) ; `HamburgerMenu.jsx` (~l.110) fait `navigate(lien)` (route React Router, navigation SPA). Un chemin commençant par `/` fonctionne dans les deux ; toute autre forme casse l'un des deux.

**Fix** : uniformiser sur `navigate(lien)` partout, et garantir côté producteur (fonctions/triggers SQL écrivant `lien`) une valeur toujours préfixée `/`.

## DETTE #90 — Action accepter/refuser candidature absente côté hôte
**Statut** : ouverte, P1 (bloque la fin de l'étape 5 MVP). Repérée 2026-06-10 (conv 48).
**Problème** : le dashboard hôte fusionné (DashboardLocatairePage.jsx:955-989, section « Candidatures reçues ») affiche les candidatures mais n'offre aucun bouton accepter/refuser. La transition en_attente→acceptee/refusee n'existe que dans ContratLocationPage.jsx:305-315 (flux contrat), pas à la main de l'hôte depuis son dashboard.
**À construire** : boutons accepter/refuser sur chaque candidature reçue + handler UPDATE candidatures.statut (respecter le CHECK en_attente|acceptee|refusee). Volet RGPD à cadrer séparément : ce que l'hôte voit du dossier locataire (VISION §361-372 : statut agrégé « vérifié », jamais les pièces) — consultation pro avant tout affichage de dossier.
**✅ RÉSOLUE 2026-06-11 (conv 50, commit a6a7802)** : boutons Accepter/Refuser (statut en_attente) + Annuler (acceptee/refusee → en_attente) sur chaque candidature reçue du dashboard hôte, via modale de confirmation (forme #81 : bouton plein en haut + lien « Retour » gris dessous ; Accepter vert, Refuser rouge, Annuler navy). Transition candidatures.statut conforme au CHECK {en_attente,acceptee,refusee}. Non-exclusif (n'altère ni annonces.disponible ni les autres candidatures), réversible, maj UI locale sans reload. Policy RLS candidatures_update suffisante (pas de RPC). RGPD : aucune vue dossier locataire (conforme VISION §361-372). Notif locataire + justification = hors lot (voir DETTE #92).

## DETTE #91 — Environnement de test local vide + confusion .env.local
**Statut** : ouverte, bloque tout test runtime en local. Repérée 2026-06-10 (conv 48).
**Contexte** : suite de DETTE #74 [RÉSOLUE conv 27] — le `supabase/seed.sql` vide créé à ce moment-là n'a jamais été peuplé. Ce seed est précisément ce que la session dédiée doit remplir.
**Problème** : la base locale (54322) ne contient qu'1 compte (comefourel@gmail.com), 0 annonce, 0 candidature. Toutes les données de test sont sur le distant (rkffpmuhyvwwgfbdqmqr), où se fait de facto le dev. `.env` pointe distant, `.env.local` pointe 127.0.0.1:54321 et surcharge `.env` au `npm run dev` (priorité Vite) → confusion local/prod : pendant le test M2a, reset mdp / insert candidature / vérif trigger #14 ont été appliqués sur le distant via le Dashboard en ligne, alors que l'app lisait le local vide. Symptôme : connexion impossible en local (400, compte absent de 54322).
**À traiter (session dédiée)** : monter un seed local reproductible (compte hôte + locataire + annonce + candidature) via supabase/seed.sql rechargé par `supabase db reset` (vérifier si un seed existe déjà) ; vérifier que le fix trigger #14 est appliqué en local ; clarifier la convention d'environnement (dev/test local seedé vs distant comme staging — décision à trancher, implications RGPD si vraies données un jour).
**✅ RÉSOLUE 2026-06-10 (conv 49)** : supabase/seed.sql écrit et validé — `db reset` rejoue migrations + seed sans erreur ; 2 comptes connectables (hote@/locataire@sterny.test, mdp sterny-dev, fictif/local/versionné, assumé), 1 annonce, 1 candidature, notif #14 produite. Convention : seed via `db reset` uniquement. Décision « local seedé vs distant staging » NON tranchée (reste ouverte, implications RGPD).

## DETTE #92 — Notifications candidature côté locataire + justification d'annulation
**Statut** : ouverte, hors M4, **gated vérif juridique**. Décidée conv 50 (11 juin 2026).
**Décision produit** : informer le locataire des décisions de l'hôte via une notification dans ses messages (acceptation ; annulation avec motif rédigé par l'hôte). But : transparence, réduire la frustration d'un refus après acceptation.
**À construire** : producteur de notifs candidature (la cloche a les types candidature_acceptee/refusee câblés mais aucun producteur) ; stockage du motif (colonne à créer) ; affichage côté locataire ; policy RLS INSERT autorisant l'hôte à créer une notif destinée au locataire (non auditée).
**⚠️ Pré-requis juridique AVANT code** : un motif de refus en logement est juridiquement sensible (discrimination au logement, France) ; stocker + transmettre un motif personnel touche au RGPD. Validation avocat immobilier + DPO (champ libre vs motifs pré-rédigés, conservation, base légale). Reco design : motifs pré-rédigés. La notif SIMPLE (sans motif) est buildable sans ce gate.
**✅ PARTIE SIMPLE (ACCEPTATION) RÉSOLUE 2026-06-11 (conv 51, commit fe46fd0)** : re-routée de la cloche vers la messagerie (cloche = code mort, voir #21). À l'acceptation, handleAccepterCandidature insère un message best-effort dans `messages` (expediteur = hôte via RLS, destinataire = locataire, contenu personnalisé au prénom, annonce_id rattaché). Validé runtime. **Reste GATÉ** : message au refus/annulation + motif rédigé (avocat immo + DPO).

## DETTE #93 — Modèle de capacité multi-locataires (§1) absent + verrou mono-locataire au stade signature
**Statut** : ouverte, hors M4. Repérée audit conv 50.
**Constat** : `annonces` n'a qu'un booléen `disponible`, aucune notion de capacité/places ni de semaines réservées ; `candidatures` n'a aucune contrainte d'unicité (plusieurs 'acceptee' possibles côté base). MAIS le stade signature (ContratLocationPage l.296-315) pose `annonces.disponible=false` + auto-refuse les autres candidatures en_attente → interdit de fait le 2e locataire complémentaire. **Contredit le principe fondateur §1.**
**À concevoir** : modèle de capacité (combien de locataires, semaines couvertes/réservées) avant tout vrai multi-locataires ; revoir le verrou du stade signature en cohérence.
**Notes audit conv 50** : (1) ContratLocationPage l.313 écrit `statut='paiement_ok'`, absent du CHECK local → drift prod/migrations suspecté, à confirmer/aligner. (2) 2 policies UPDATE candidatures en USING(true) (tout authentifié peut modifier toute candidature) → conformité Cat. B, même famille que le SELECT USING(true) noté conv 48.
**MAJ 2026-06-11 (conv 52) — conception ENGAGÉE.** Décision produit : le modèle multi-locataires se conçoit dès maintenant (plus « plus tard »). Principe acté : « jamais de match parfait » → couverture partielle gérée explicitement (semaines couvertes par A, B, ou personne), pas de complémentarité parfaite exigée. Méthode : analyse Airbnb (mécanique/UX uniquement ; cadre juridique exclu, ≠ Sterny). Conception détaillée en conversation dédiée. Voir VISION (section « Modèle multi-locataires — conception engagée »).
**MAJ 2026-06-12 (conv 53) — modèle CONÇU, validé, en attente d'implémentation.** Conçu sur schéma réel audité (annonces sans capacité ; candidatures sans semaines, CHECK statut = {en_attente,acceptee,refusee}, aucune unicité ; contrats = période globale date_debut/date_fin sans granularité semaine). Modèle : (1) `candidatures.semaines_demandees` jsonb (lundis ISO, la demande) ; (2) nouvelle table registre 1-ligne-par-semaine-réservée avec UNIQUE(annonce_id, semaine) → exclusion dans la base ; (3) couverture calculée (disponibilites_pattern moins registre), jamais stockée. Capacité = ensemble des semaines libres, pas un nombre. Verrou reconçu : suppression de annonce.disponible=false + auto-refus + écriture paiement_ok ; remplacés par insertion au registre à la signature + visibilité par intersection de semaines. `annonces.disponible` déprécié (transition). Détail : VISION section « Modèle multi-locataires ».
**paiement_ok (drift confirmé)** : 'paiement_ok' absent de tout CHECK migration → l'UPDATE ContratLocationPage:313 viole le CHECK local. Décision : SUPPRIMER cette écriture ; l'état « payé » vit sur contrats (champs Stripe déjà présents), jamais sur la candidature. À confirmer côté prod (CHECK distant élargi hors-migration ?) — étape token séparée, non bloquante.
**Emboîtement #48** : #93 = offre (1 logement, N locataires) ; #48 = demande (1 locataire, N logements + score). Même fondation semaine ISO. Ne pas redéfinir le score (#48).
**Reste (implémentation, session séparée)** : migration colonne + table registre + unicité ; refonte verrou signature ; calcul couverture + visibilité filtrée par semaine ; UI semaines demandées à la candidature.
**MAJ 2026-06-12 (conv 54) — TRANCHE 1 (fondation de données) LIVRÉE, validée runtime.** 2 migrations sur feat/unification-inscription : (1) 20260612130950 colonne candidatures.semaines_demandees jsonb NOT NULL DEFAULT '[]' ; (2) 20260612130951 table semaines_reservees (id uuid pk ; annonce_id NOT NULL FK CASCADE ; semaine date ; contrat_id + locataire_id NULLABLES FK CASCADE ; created_at ; UNIQUE(annonce_id, semaine) + CHECK ISODOW=1 ; RLS ENABLE sans policy). seed enrichi (4 lundis dispo, 2 demandées, registre vide). db reset OK ; unicité + check lundi validés en psql. **Dette transitoire** : contrat_id/locataire_id à passer NOT NULL au lot signature. **Reste** : (A) capture UI semaines à la candidature ; (B) refonte verrou signature (supprimer disponible=false/auto-refus/paiement_ok → INSERT registre + NOT NULL + policies RLS registre) ; (C) couverture calculée + visibilité par semaine.
**Suite OBLIGATOIRE de la tranche A (décision conv 54) — pré-cochage automatique des semaines à la candidature.** La tranche A livre la capture MANUELLE (le locataire coche lui-même les semaines offertes). Une fois ce socle en place, brancher IMPÉRATIVEMENT le pré-cochage automatique : pré-cocher l'intersection rhythm_calendar du locataire (interprété pour la ville de l'annonce) × disponibilites_pattern de l'offre, ajustable (VISION §571, §137). C'est la raison d'être de la capture du rhythm_calendar à l'inscription : la plateforme connaît déjà le rythme, l'utilisateur ne doit jamais le ressaisir (VISION §399). Sans ce pré-cochage, le locataire ressaisit à la main ce que Sterny sait déjà. Dépend du croisement de semaines = matching #48 (l'interprétation rythme×ville touche aussi #76). À faire juste après la tranche A.
**MAJ 2026-06-12 (conv 54 suite) — tranches RÉORDONNÉES par le changement de cap (priorité recherche).** La tranche C (couverture + visibilité par semaine) migre dans le chantier recherche (#48) ; la tranche A (capture candidature) passe en fin de parcours ; la fondation de données (TRANCHE 1) reste acquise et sert la recherche. Détail : ETAT-COURANT bloc « conv 54 suite — changement de cap ».

## DETTE #94 — Pas d'expéditeur « système » dans la messagerie (limitation RLS)
**Statut** : ouverte, limitation assumée. Repérée 2026-06-11 (conv 51) pendant le re-route #92.
**Constat** : la table messages n'a pas d'expéditeur système ; RLS INSERT impose auth.uid() = expediteur_id. Tout message automatique porte donc l'utilisateur connecté (l'hôte), jamais « Sterny ». OK pour #92 (ouvre le fil hôte↔locataire), mais bloque tout vrai message système.
**À concevoir (si besoin)** : compte système + insertion via fonction SECURITY DEFINER (contourne RLS) ou WITH CHECK assoupli. Touche à la sécurité → prudence, cadrage avant implémentation.
**Priorité** : basse. **Réf** : table messages (RLS messages_insert), ChatComponent.jsx.

## DETTE #95 — Collisions CSS globales `.search-bar` et `.inv-title` (famille #86/#87/#88)
**Statut** : partiellement réglée. Repérée 2026-06-13 (conv 55). Volet homepage scopé `.hero` le 2026-06-14 (conv 56, commit 68d221e). Reste : volet RecherchePage + `@media` mobile homepage non scopé.
**Constat** : mêmes mécaniques que #86/#87/#88 (classes globales non scopées dupliquées entre pages ; à spécificité égale, l'ordre du bundle tranche).
- `.search-bar` : défini dans HomePage.css (999px) ET RecherchePage.css:108 + @media:1969 (14px). RecherchePage chargé après → écrasait la pilule homepage. Contourné (conv 55) en scopant HomePage en `.hero .search-bar` (0,2,0 > 0,1,0) ; RecherchePage non touché. ⚠️ Le @media homepage (HomePage.css l.850, `.search-bar` non scopé) reste à spécificité égale avec le @media RecherchePage → la pilule mobile peut encore sauter ; à scoper aussi en `.hero .search-bar` si constaté.
- `.inv-title` : défini dans InvitationModal.css ET InvitationPage.css:217 (uppercase/orange). Contourné (conv 55) par spécificité renforcée `.inv-overlay .inv-panel .inv-title` (0,3,0). Préfixe `inv-` reste collision-prone (renommage `invmodal-*` évoqué, non fait).
**Fix racine (chantier dédié, cf #86)** : scoper/renommer ces familles (ou CSS Modules). Auditer toutes les pages partageant `.search-bar`, `.search-field`, `.search-btn` (probablement dupliquées Home/Recherche → la barre homepage hérite peut-être d'autres propriétés de RecherchePage).
**Priorité** : moyenne. Symptômes contournés ; le fond reste une source récurrente de bugs visuels.
**Réf** : HomePage.css (`.hero .search-bar`), RecherchePage.css:108/1969, InvitationModal.css, InvitationPage.css:217.
**MAJ 2026-06-14 (conv 56)** : la vraie cause de la barre homepage trop haute était `.search-field` et `.search-field input` NON scopés dans HomePage.css (perdaient contre RecherchePage.css, chargé après : `input: 48px` + 8px de padding vertical forcés ; les réductions de hauteur restaient sans effet). Fix : les 14 sélecteurs `.search-field`/`.search-btn` de HomePage.css sont désormais scopés `.hero` (0,2,0 > 0,1,0) → HomePage gagne. Volet homepage réglé (commit 68d221e). Restent ouverts : le `@media (max-width:768px)` homepage toujours en `.search-bar`/`.search-field` nus (pilule mobile à vérifier — point 3 du polish), et tout le côté RecherchePage (fix racine global non fait).

**MAJ 2026-06-14 (conv 56, suite) — commit 000a237** : volet homepage encore avancé. `.ville-suggestions`/`.ville-suggestion-item` scopées `.hero`. Nouveau cas de la même collision : `.search-field` était forcé en `position: relative` par la jumelle nue de RecherchePage.css (l.129) → forcé `.hero .search-field { position: static }` (0,2,0 > 0,1,0) pour ancrer la boîte de suggestions sur la barre entière. Toute la famille `.search-*` / `.ville-suggestion*` de HomePage doit rester scopée `.hero` tant que le fix racine global (RecherchePage + CSS Modules) n'est pas fait.

**MAJ 2026-06-15 (conv 60) — commits 3050611 + 2566f04** : volet RecherchePage DESKTOP refermé. Toutes les règles .search-bar/.search-field/.search-btn de RecherchePage.css scopées .recherche-hero (y compris @media) ; grep confirme plus aucune règle .search-* nue. Barre = clone pilule de la homepage + hero à la même hauteur. Reste ouvert : @media mobile (pilule mobile, #44) + fix racine global (CSS Modules/renommage).

**MAJ 2026-06-17 (conv 64) — volet dropdown villes /recherche fermé (commit fd37739).** Les classes `.ville-suggestions` / `.ville-suggestion-item` existent en **4 copies** dans le CSS chargé : `index.css` (GLOBAL, bave sur toutes les pages), `HomePage.css` (scopé `.hero`), `RecherchePage.css` (désormais scopé `.recherche-hero`), `InscriptionPartagerPage.css` (nu). **Cause racine = la copie nue de `src/index.css`** (radius 12px, item 11px/14px, + `:first-child`/`:last-child` radius 12px) chargée partout → écrasait les pages à règles nues selon l'ordre du bundle. Contournement appliqué (homepage conv 56 + /recherche conv 64) : scoper sous `.hero` / `.recherche-hero` (0,1,0 → 0,2,0). Sur /recherche aussi : `.search-field` repassé en `position: static` (inline JSX + CSS) pour que le dropdown s'ancre sur `.recherche-hero .search-bar` (toute la barre). **Reste (chantier séparé, RISQUÉ car global)** : supprimer la copie nue d'`index.css` + factoriser un composant `<VilleAutocomplete>` partagé. Ne pas toucher `index.css` sans auditer les pages qui en dépendent (InscriptionPartager, ModifierProfil au singulier, etc.).

## DETTE #96 — Code mort homepage : champs Type d'alternance / Rythme / Dates [RÉSOLUE]
**Statut** : ouverte, nettoyage chore. Repérée 2026-06-13 (conv 55).
**Constat** : la refonte « ville seule » (conv 55) a retiré le JSX des champs Type d'alternance, Rythme et Dates, mais conservé volontairement leurs états/handlers/constantes (alternanceType, selectAlternance, selectRythme + son navigate autonome, ALTERNANCE_OPTIONS/RYTHME_OPTIONS, dateDebut/dateFin, datePickerRef…) = code mort. Vérif anti-crash faite (datePickerRef lu uniquement par un useEffect null-safe).
**À faire** : commit chore supprimant ces états/handlers/constantes inutilisés dans HomePage.jsx, une fois la barre stabilisée.
**Priorité** : basse, non bloquant.
**Réf** : HomePage.jsx (section search-bar + states/handlers associés).
**MAJ 2026-06-18 — RÉSOLUE (commit chore fd134b2).** Code mort retiré de HomePage.jsx après audit lecture seule (0 occurrence dans le JSX ; ALTERNANCE_OPTIONS/RYTHME_OPTIONS non partagées hors fichier). Retrait : 2 constantes, 10 états/ref (alternanceType/Label/Open, rythmeValue/Label/Open, showDatePicker, dateDebut, dateFin, datePickerRef), 2 useEffect morts (« close dropdowns » + « close date picker »), 2 handlers (selectAlternance, selectRythme + navigate), 3 dérivées (showRythmeField, currentRythmeOptions, showDateField). La fonction rechercher ne fabrique plus que le param ville (cohérent conv 55). Aucun changement de comportement (valeurs toujours vides). Build vert, 0 orphelin ; imports useEffect/useRef conservés.

## DETTE #97 — Alertes (« Sois notifié ») à rebrancher sur les semaines réelles
**Statut** : ouverte. Repérée conv 59 (15 juin 2026), chantier 5b-1.
**Constat** : envoyerAlerte (RecherchePage) écrivait dans alertes.rythme un rythme abstrait issu du menu « Mon rythme » de la barre. Menu retiré en 5b-1 (fiction §29) → le champ part désormais toujours null. L'alerte ne porte plus aucun critère de rythme, elle ne filtre que sur la ville.
**À faire** : reconstruire la notification sur les vraies semaines déduites (rhythm_calendar croisé avec disponibilites_pattern) au lieu d'un rythme abstrait. Aligné recherche-à-la-semaine + matching partiel (#48) + multi-locataires (#93). Touche : RecherchePage (envoyerAlerte), table alertes, Edge Function send-alert-email.
**Décision Côme (conv 59)** : on garde le système d'alerte, rebranché plus tard sur les calendriers exacts.
**Note BDD** : alertes.rythme écrit en dur à null (transitoire, déjà le cas en pratique). ⚠️ Ne pas INSÉRER dans alertes en local (triggers HTTP → prod).
**Priorité** : basse, non bloquant.

## DETTE #98 — Tiroir « Filtres » de la recherche à repenser
**Statut** : ouverte, à revoir. Repérée conv 59 (15 juin 2026) après le retrait du rythme abstrait.
**Constat** : le tiroir Filtres de /recherche (Proximité, Budget & Surface, Type de logement, Équipements, bouton « Tout effacer ») n'a pas été repensé depuis le retrait du rythme. Demande Côme : revoir cette partie, notamment pour cohérence avec le futur modèle par semaines réelles.
**Priorité** : basse, non bloquant. **Réf** : RecherchePage.jsx (drawer Filtres, reinitialiserFiltres, activeFilterCount).

## DETTE #99 — Code couleur des calendriers incohérent entre les 6 surfaces
Audit conv 63 (lecture seule). 6 surfaces calendrier coexistent. Incohérences :
1. Orange #E8622A surchargé : « école » (inscription, RhythmCalendar, carrousel) ET « sélection / dispo choisie » (CreerAnnoncePage .selected, LogementPage .user-selected).
2. « Passé » rendu de 4 façons : diagonale grise #94A3B8 (RMB, Planche) ; dégradé gris (carrousel) ; texte gris clair #E2E8F0 (CreerAnnoncePage) ; opacité (LogementPage).
3. Entreprise/navy #1E293B rendu de 3 façons : plein (RMB) ; 15 % diaphane (RhythmCalendar) ; dégradé navy (carrousel).
4. Vert : planche #86EFAC (corrigé conv 63) vs vert succès maison #10B981/#22C55E ailleurs.
5. Trois « neutres » distincts pour des idées proches (indispo / hors-recherche / passé).
À unifier en chantier dédié (hors session planche). La planche conv 63 adopte déjà les bonnes conventions. Ne jamais toucher RhythmManualBuilder (RÈGLE Nº 1).

## DETTE #100 — Token Mapbox `pk.` en dur dans RecherchePage.jsx
**Statut** : ouverte, hygiène. Repérée 2026-06-18 (conv 65) au grep secrets pré-commit.
**Constat** : RecherchePage.jsx (≈ l.14) contient `const MAPBOX_TOKEN = 'pk....'` en dur. Token **publishable/public** (préfixe `pk.`), déjà visible dans le bundle client par nature → PAS un secret serveur, présence dans le repo non aggravante. MAIS sans restriction de domaine, un tiers peut consommer le quota Mapbox.
**À faire** (non bloquant) : (1) restreindre le token à tes domaines dans le dashboard Mapbox (Account → Tokens → URL restrictions) — la vraie protection ; (2) à terme, le passer en `import.meta.env.VITE_MAPBOX_TOKEN`. La rotation n'a de sens qu'AVEC la restriction.
**Priorité** : basse. **Réf** : RecherchePage.jsx (MAPBOX_TOKEN).

## DETTE #101 — Guard-rails /parametres & /profil : non-bug en prod (bypass DEV) + page /profil à recadrer
**Statut** : ouverte, basse priorité. Constat d'un audit lecture seule (18 juin 2026), aucun code modifié.
**Guard-rails — NON-bug en prod.** Les routes /parametres, /profil, /dashboard, /mon-calendrier sont protégées par le guard partagé DashboardLayout (route parente, App.jsx), qui redirige vers /connexion quand !user — SAUF en DEV (`&& !import.meta.env.DEV`, DashboardLayout.jsx:24). En production, un visiteur non connecté est déjà bien redirigé. La « page blanche /parametres » et le « chargement infini /profil » n'apparaissent QU'EN LOCAL (DEV), où le bypass laisse rendre la page avec user=null : ParametresPage rend null (ParametresPage.jsx:43 → blanc), ProfilPage reste bloquée sur « Chargement… ». Aucune correction de garde nécessaire pour la prod. Bypass DEV de la même famille que validateStep / skipStripeIdentity.
**Vrai sujet (produit) — page /profil.** ProfilPage est conçue pour afficher le profil d'un AUTRE utilisateur via ?user_id (ex. consultation d'un candidat). Un connecté qui ouvre /profil NU (sans param), non-admin, reçoit alert('Utilisateur non spécifié') + renvoi à / (ProfilPage.jsx:67) ; son propre user_id le redirige vers /profil/modifier. À cadrer : à quoi sert /profil exactement, et remplacer l'alerte brutale par une redirection silencieuse. VÉRIFIÉ (conv suivante) : /profil nu EST atteignable par un clic — entrée « Mon profil » du menu UserDropdown pour les rôles locataire (UserDropdown.jsx:90) et hôte (UserDropdown.jsx:107) → bug VISIBLE, pas théorique. Faille de bord aussi dans AvisPage.jsx:261 (`user_id=${targetUserId || ''}` → param vide possible).
**Repli gracieux (optionnel).** Modèle PlancheCouverturePage (coupe le chargement + écran de repli quand user=null, PlancheCouverturePage.jsx:46), réutilisable sur /parametres et /profil pour éviter blanc/spinner même en DEV.
**Priorité** : basse, non bloquant.
**Réf** : DashboardLayout.jsx:24, ParametresPage.jsx:43, ProfilPage.jsx:67, UserDropdown.jsx:90/107, AvisPage.jsx:261, PlancheCouverturePage.jsx:46.

## DETTE #102 — Lien « Connexion » de la landing sans safe-area iOS
**Statut** : ouverte, à corriger (priorité relevée depuis que viewport-fit=cover est live en prod). Repérée conv 68, contexte conv 69.
**Constat** : dans PasswordGate (vue landing), le lien « Connexion » est en `position:absolute, bottom:'24px'` (PasswordGate.jsx ~l.170) **sans** `env(safe-area-inset-bottom)`. Sur iOS Safari, la barre d'outils basse recouvre la zone ~bottom 0→80px → le lien passe dessous. Aggravé maintenant que **viewport-fit=cover est LIVE** (index.html) : le contenu s'étend sous les barres, donc le `bottom:24px` est mesuré jusqu'au bord physique → lien potentiellement trop bas/masqué.
**À faire** : `bottom: 'calc(24px + env(safe-area-inset-bottom))'` sur le bouton Connexion. Patch isolé, 1 ligne.
**Priorité** : moyenne. **Réf** : PasswordGate.jsx (bouton Connexion, ~l.170).

## DETTE #103 — viewport-fit=cover global → dashboards potentiellement sous l'encoche iOS
**Statut** : ouverte, à surveiller. Introduite conv 69 (commit 6a6df63, prod 49b7626).
**Constat** : `viewport-fit=cover` (index.html, meta viewport) est **GLOBAL** à toute l'app React, pas seulement la landing. Effet voulu sur la landing (fond étendu sous les barres iOS). Risque collatéral : sur les autres surfaces (dashboards équipe, en-têtes fixes), le contenu peut désormais passer **sous l'encoche / la barre de statut** (zones safe-area non compensées) → éléments hauts collés ou masqués.
**À faire** : tester les dashboards sur iPhone ; si collision, ajouter un `padding`/`padding-top: env(safe-area-inset-top)` (et `-bottom` au besoin) sur les en-têtes/conteneurs concernés. Ne PAS retirer viewport-fit=cover (nécessaire à la landing).
**Priorité** : basse à surveiller. **Réf** : index.html (meta viewport), surfaces dashboard.

## DETTE #104 — Clés Supabase legacy en voie de dépréciation (frontend à migrer)
Supabase déprécie les clés legacy (eyJ...). Constat conv 70 : le frontend LOCAL (VITE_SUPABASE_KEY) est une clé legacy, rejetée par la gateway Functions (UNAUTHORIZED_LEGACY_JWT au curl ; 500 sur fonctions en local). La PROD fonctionne (mail reçu) -> PAS un blocage prod actuel, mais à terme les legacy seront coupées. À faire (basse priorité) : vérifier la clé utilisée par la prod Vercel ; migrer VITE_SUPABASE_KEY (local + Vercel) vers sb_publishable_ ; vérifier tous les appels de fonctions. NB test manuel d'une Edge Function : clé publishable sb_publishable_ en header apikey + Authorization.

## DETTE #105 — RLS de `alertes` trop permissive (fuite lecture corrigée ; DELETE-any + inserts redondants ouverts)
**Constat (audit conv 72, 19 juin 2026)** : policies trop larges sur `alertes`.
- 🔴 Lecture (CORRIGÉ le 19/06) : 2 policies `SELECT … USING (true)` — `Lecture publique alertes` (anon+authenticated) et `alertes_select` (authenticated) — laissaient lire tous les emails via la clé anon publique. Supprimées en prod + migration `…_harden_alertes_rls.sql`. Restent `alertes_select_own` + `admin_select_all` (vérifié).
- 🟢 DELETE-any (FERMÉ le 19/06) : `alertes_delete` retirée en prod + migration `…_harden_alertes_part2.sql` ; reste `alertes_delete_own` (owner-only, vérifié — seul `desactiverAlerte`/dashboard supprime, sur des lignes own). Lignes visiteur/waitlist (user_id NULL) non supprimables côté client = voulu (effacement RGPD = côté admin). Companion optionnel NON fait : ajouter `.eq('user_id')` dans `desactiverAlerte` (défense en profondeur, la RLS l'impose déjà).
- 🟡 Inserts redondants (bruit) : 3 policies INSERT se recouvrent (`Permettre insertion anonyme`, `Anyone can insert alerts`, `alertes_insert`). Insert public voulu mais doublonné ; nettoyage non urgent.
⚠️ RGPD : si des emails réels ont été exposés en prod, la question « incident à notifier (CNIL) » relève du DPO — ne pas présumer, à poser au pro.

## DETTE #106 — Triggers `alertes` (`send-alert-on-insert`) : double-envoi potentiel + à ne pas répliquer sur waitlist
**Constat (audit conv 72)** : `alertes` porte `send-alert-on-insert` (`supabase_functions.http_request → send-alert-email`) + `on_new_alerte → handle_new_alerte()` (migration 20260421082830), malgré la « suppression » notée DETTE #18. Tout INSERT peut déclencher `send-alert-email` EN PLUS de l'appel front → l'inscription landing enverrait « Bienvenue » (front) + « Ton alerte est activée » (trigger). Statut prod à confirmer (`tgenabled`). Conséquences : (1) vérifier/neutraliser en prod ; (2) la future table `waitlist` ne doit PAS porter ce trigger.
**MAJ conv 72** : statut prod CONFIRMÉ → `pg_trigger` sur `alertes` = 0 ligne : AUCUN trigger en prod, donc PAS de double-envoi (DETTE #18 confirmée). Résidu : le snapshot 20260421082830 les recrée en LOCAL → `DROP TRIGGER IF EXISTS` ajouté à `…_harden_alertes_part2.sql` pour aligner. Rien à faire en prod ; ne pas répliquer sur waitlist.

## DETTE #107 — `toLowerCase()` manquant dans PasswordGate (normalisation email waitlist)
**Statut** : ouverte, basse priorité. Décidée conv 74.
**Constat** : la landing insère l'email tel quel (`from('waitlist').insert({ email: email.trim() })`). L'intégrité contre les doublons de casse est déjà assurée côté base par l'index unique `lower(email)` (conv 74 → un doublon de casse est rejeté, 409 « déjà inscrit »). Reste que l'email est stocké avec sa casse d'origine (`Jean@x` plutôt que `jean@x`) : « pas propre », pas un bug d'intégrité.
**À faire** : ajouter `.toLowerCase()` après `.trim()` dans PasswordGate avant l'insert, au prochain passage sur le code landing. Patch 1 ligne, à déployer via le pattern worktree.
**Priorité** : basse. **Réf** : PasswordGate.jsx (handleEmail, l.~49).

## DETTE #108 — Page « mot de passe oublié » : message de succès à tort + spinner infini
**Statut : RÉSOLUE (conv 77, 21 juin 2026 — commit 30dff1b sur feat).** Fix : `setLoading(false)` déplacé du `catch` vers un bloc `finally` (relâché succès ET erreur) + libellé bouton conditionnel (`emailDisabled ? 'Lien envoyé' : 'Envoyer le lien'`). Validé runtime local. ⚠️ NON déployé en prod (vit sur feat) → page reste buggée sur sterny.co jusqu'à un déploiement groupé (avec #107 + SEO).
**Constat (conv 76, 20 juin 2026, observé en LOCAL)** : sur /mot-de-passe-oublie, après soumission, la page affiche « Lien envoyé ! Vérifie ta boîte mail. » (vert) ALORS QUE le bouton garde son spinner. États incohérents : succès annoncé sans que l'action soit finie. (En local, l'email de reset part dans la boîte de test locale Inbucket/Mailpit, jamais dans un vrai Gmail — normal, distinct du bug d'affichage.)
**Hypothèses** : (a) message de succès affiché de façon optimiste avant résolution de l'appel ; (b) setLoading(false) manquant dans une branche → spinner jamais relâché. À confirmer en lisant le composant.
**Impact** : confusion UX, pas un bug de sécurité, non bloquant.
**À faire** : auditer le composant /mot-de-passe-oublie (état loading + ordre d'affichage du message), n'afficher le succès qu'après confirmation et relâcher loading dans tous les cas. **Priorité : basse.**

## DETTE #109 — Lien recovery (reset mot de passe) en prod ne menait pas à /reset-password
**Statut : RÉSOLUE (conv 79, 22 juin 2026).**
CAUSE RACINE PROUVÉE (via la requête réseau /auth/v1/recover) : l'app est servie sur www.sterny.co (Chrome masque le "www." dans la barre d'adresse, d'où l'illusion d'un non-www). window.location.origin = https://www.sterny.co → le code envoie redirectTo = https://www.sterny.co/reset-password. Or la Redirect Allow List ne contenait que https://sterny.co/** (non-www) → Supabase rejetait le redirect_to www → fallback sur la Site URL nue (https://sterny.co) → atterrissage racine → PasswordGate + OAuthHandler avalaient la session → /dashboard, jamais /reset-password.
PISTES ÉCARTÉES (toutes vérifiées) : route /reset-password absente du build prod (présente) ; redirectTo manquant côté code (présent dans le commit déployé 74d7c98) ; bundle Vercel périmé (Production = 74d7c98) ; Site URL incorrecte (OK) ; joker allow-list ne couvrant pas les chemins (il les couvre — l'OAuth fonctionne).
FIX APPLIQUÉ (Dashboard, config prod, PAS de commit) : ajout de https://www.sterny.co/** aux Redirect URLs. Additif (Site URL inchangée, rien retiré → OTP/proprio non affectés). VALIDÉ : le lien atterrit bien sur /reset-password.
SUITE : sur /reset-password, un 2e bug distinct rebascule vers /mot-de-passe-oublie après 3 s → DETTE #110.
DÉCISION GATED — TRANCHÉE (conv 81) : domaine canonique = sterny.co (non-www). Vercel reconfiguré (sterny.co servi en direct, www.sterny.co en redirection 308 permanente). Cause profonde éliminée. CLOS EN PROD : validé end-to-end sur sterny.co (conv 81).

## DETTE #110 — /reset-password rebascule vers /mot-de-passe-oublie après 3 s (session recovery non captée)
**Statut : RÉSOLUE (conv 80, 22 juin 2026).** Une fois le lien recovery arrivé sur /reset-password (#109 résolu), la page de saisie du nouveau mot de passe s'affichait ~3 s puis redirigeait vers /mot-de-passe-oublie.
CAUSE CONFIRMÉE (par la lecture du code) : ResetPasswordPage n'attendait QUE l'événement PASSWORD_RECOVERY (onAuthStateChange), or detectSessionInUrl:true (défaut du client, config/supabase.js sans options) consomme ET nettoie le hash AVANT que le listener ne soit abonné → événement raté + hash vidé → le timer de secours 3 s redirigeait.
FIX APPLIQUÉ (commit b4e8628, branche feat) : getSession() au montage lit la session déjà posée par detectSessionInUrl, sans dépendre de la capture temps-réel. onAuthStateChange élargi en secours (PASSWORD_RECOVERY OU session non-nulle). Le timer relit la vraie session avant de décider, ne redirige que si AUCUNE session après 3 s. Bouton submit désactivé tant que !sessionReady. Fix 100% local à la page — config/supabase.js (detectSessionInUrl global) NON touché → OTP / proprio / OAuth intacts.
VALIDÉ RUNTIME (Mailpit local, conv 80) : lien recovery → /reset-password sans rebascule → changement de mdp → redirection /connexion → reconnexion OK.
PARENTHÈSE CONFIG LOCALE (commit ca5d068) : le test a révélé que config.toml pointait encore sur le défaut Supabase (127.0.0.1:3000) au lieu du port Vite. Aligné sur localhost:5173 (+ allow-list /**). Config locale uniquement, sans impact prod.
COMPORTEMENT ASSUMÉ (signalé, non corrigé) : le fix accepte toute session active sur /reset-password (un utilisateur déjà connecté pourrait changer son mdp courant). Cohérent avec Supabase (une session recovery EST une session). Distinguer type=recovery serait fragile (l'info vit dans le hash consommé). Hors périmètre #110 ; à rouvrir en décision produit si une réauthentification avant changement de mdp est un jour exigée.
DÉPLOYÉ EN PROD (conv 81) : après la décision domaine canonique = sterny.co, b4e8628 a été re-piqué (56289dc) sur origin/main via worktree + cherry-pick + fast-forward. Validé end-to-end sur sterny.co réel : lien recovery → /reset-password sans rebascule → changement de mdp → reconnexion OK. #109 + #110 CLOS EN PROD.
LIEN : suite directe de #109. #109 était la redirection (config, résolu) ; #110 était la reconnaissance de session sur /reset-password (code, résolu).

## DETTE #111 — Message d'erreur générique sur /reset-password quand le nouveau mot de passe est identique à l'ancien
**Statut : OUVERTE (constatée conv 81, NON traitée).** Sur /reset-password en prod, soumettre comme nouveau mot de passe un mot de passe identique à l'ancien affiche un message générique « erreur survenue » au lieu d'un message clair type « choisis un mot de passe différent de l'ancien » (standard sur la plupart des sites).
IMPACT : UX dégradée, pas de blocage fonctionnel. L'utilisateur ne comprend pas pourquoi ça échoue.
À VÉRIFIER AVANT FIX (ne pas présumer) : déterminer si Supabase renvoie une erreur DISTINGUABLE pour ce cas (ex. code/message « same_password » ou équivalent) qu'on pourrait intercepter pour afficher un message dédié, OU si l'info n'est pas distinguable côté client. Lecture du code de ResetPasswordPage (gestion d'erreur du submit) + de la réponse réelle de l'API Supabase requise. Session dédiée, distinct de #109/#110 (qui portaient sur la session recovery, pas la gestion d'erreur du formulaire).

## DETTE #112 — Base sans données de rythme exploitables + comptes seed absents (constat conv 83, 23 juin 2026)
**Statut : LEVÉE 2026-06-24 (conv 84) — ce n'était PAS une dette de code.** Le parcours d'inscription actuel écrit bien le rythme (preuve ci-dessous). Le constat initial reflétait juste une base sans données fraîches (comptes d'amis créés avant la refonte calendrier + seed absents), pas un bug. Détail de la levée en fin d'entrée.
CONSTAT (vérifié par requêtes SQL lecture seule sur la base PRODUCTION) :
- Aucun compte locataire n'a de rhythm_calendar rempli : `select type_user, count(*), count(*) filter (where rhythm_calendar is not null and jsonb_array_length(rhythm_calendar) > 0)` → locataire 9 / 0 avec rythme ; proprietaire 3 / 0. Aucun compte hote ni les_deux présent.
- Les comptes seed `locataire@sterny.test` et `hote@sterny.test` n'existent PAS dans public.users (0 row sur `where email in (...)`).
CONSÉQUENCE : impossible de tester /recherche, /logement, le matching ou la couverture de bout en bout — il n'y a aucun rythme à croiser. Le code de couverture lui-même est SAIN (étape 1a validée côté logique : deduireRecherche + couvertureSemaines croisent correctement `dispo annonce: 4` avec les semaines cherchées ; renvoie 0 uniquement parce que semaines cherchées = 0, faute de rythme en base).
HYPOTHÈSE À VÉRIFIER EN PRIORITÉ (prochaine session, option b) : les comptes `*@sterny.test` existent-ils dans Supabase Auth (auth.users) mais SANS ligne profil dans public.users ? Si oui = bug d'inscription (compte Auth créé sans profil), qui expliquerait l'état partiel de la base. Requête de départ : comparer auth.users (par email) vs public.users.
SI au contraire les comptes sont juste absents (base resettée / seed non rejoué) : recréer un jeu de comptes de test propres (locataire + hote avec rythme) via le PARCOURS D'INSCRIPTION normal (qui écrit le rythme via la RPC), pas par UPDATE SQL en prod.
NE PAS faire d'UPDATE/INSERT sauvage en production pour "redonner un rythme" : passer par le flux d'inscription ou un seed maîtrisé.

**✅ LEVÉE 2026-06-24 (conv 84).** Recadrage : la vraie question n'était pas « y a-t-il des rythmes en prod » (les 9 locataires sont des comptes d'amis créés AVANT la refonte du parcours calendrier → rythme vide = historique mort, pas un bug) mais « le parcours d'inscription ACTUEL sait-il écrire un rythme ». Or ce parcours unifié (E-1→E-7) vit uniquement sur la branche feat/unification-inscription, donc en LOCAL, pas en prod — d'où l'absence de rythmes côté prod.
MÉTHODE : test de bout en bout en local (`npm run dev` → stack locale 127.0.0.1:54321 via .env.local), création d'UN compte locataire neuf avec saisie réelle du rythme en E-5.
PREUVE (SELECT lecture seule sur la base locale, psql 127.0.0.1:54322) : compte locataire neuf, `jsonb_array_length(rhythm_calendar)` = 61, première semaine `{"status":"school","week_start":"2026-06-29"}` (format VISION {week_start, status}, lundi ISO) ; dashboard affichait l'encart « TON RYTHME » peuplé.
CONCLUSIONS : (1) chemin E-5 → RPC `complete_inscription_alternant` → colonne `rhythm_calendar` SAIN, l'inscription écrit bien le rythme. (2) Hypothèse « compte Auth sans ligne public.users » (option b) ÉCARTÉE : le compte neuf a une ligne public.users complète (profil + type_user + rythme) en un seul passage. (3) Le « 0 de tes 0 » de l'étape 1a (conv 83) n'était NI un bug de code NI un bug d'inscription — juste une base sans données fraîches. (4) ACTION : une seule création de compte de test via le parcours normal ; AUCUN fix, AUCUN UPDATE/INSERT SQL, AUCUNE modif de repo.
SUITE (conv 84 suite) : hôte hote-test-01@sterny.test créé (rythme miroir, Rennes) ; CreerAnnoncePage auditée → DETTE #113 ; reste reprise 1a→1b + commit étape 1a.

## DETTE #113 — CreerAnnoncePage est pré-calendrier : disponibilites_pattern non conforme VISION (source dépréciée + format jours)
**Statut : OUVERTE (audit conv 84, 24 juin 2026). IMPORTANTE — page centrale (création de l'offre), à refondre.**
CONSTAT (audit lecture seule, CreerAnnoncePage.jsx 2699 l.) : la page écrit annonces.disponibilites_pattern mais dans un format et depuis une source incompatibles avec le système calendrier connecté (rhythm_calendar / lundis ISO).
- SOURCE : saisie manuelle (dates de bail) + cycle abstrait "X-Y" (generateRhythmDatesFromAnchor l.1244), piloté par les colonnes DÉPRÉCIÉES type_alternance/rythme_alternance (l.617-618). rhythm_calendar JAMAIS lu (0 occurrence dans le fichier).
- FORMAT : tableau de TOUTES les dates journalières (~7 par semaine dispo, l.1217-1220 mode clic et l.1265-1271 mode cycle), via toLocalISODate. PAS un tableau de lundis ISO comme l'exige la VISION.
- COLONNES DÉPRÉCIÉES ÉCRITES : type_alternance + rythme_pattern (l.1699-1700) — interdites par la VISION.
- VILLE : jamais croisée avec le rythme (aucune logique rythme×ville).
PIÈGE : le lundi de chaque semaine étant inclus parmi les 7 jours, couvertureSemaines (qui intersecte des lundis) peut renvoyer un compte non-nul PAR ACCIDENT → la couverture « s'afficherait » tout en étant fausse/gonflée/bruitée. Ne pas se fier à un affichage non-nul comme preuve.
IMPACT : /logement (couverture dérivée du rhythm_calendar, lundis) ne peut pas s'appuyer sur les annonces produites par cette page. Bloque le test 1a→1b sur données réelles via la page.
CONTOURNEMENT TEST (court terme) : seed maîtrisé d'une annonce avec disponibilites_pattern = lundis dérivés du rythme hôte, APRÈS lecture de couvertureSemaines/deduireRecherche (ne pas présumer le format). Jamais d'INSERT à la main sans avoir lu la règle.
FIX RÉEL (chantier refonte annonce, ULTÉRIEUR) : réécrire le calcul de disponibilites_pattern pour qu'il dérive du rhythm_calendar de l'hôte croisé avec la ville du logement, au format lundis ISO, et cesser d'écrire les colonnes dépréciées. Fait partie de la refonte globale de CreerAnnoncePage (cf DETTE #1-8 : 2600+ lignes, bypass DEV, bugs cropper/re-render). Page TRÈS IMPORTANTE à reprendre proprement.
MAJ conv 86 (24 juin 2026) : blast radius DOUBLE confirmé par audit lecture seule — `disponibilites_pattern` est écrit AUSSI par `ModifierAnnoncePage.jsx:1516` (même logique défectueuse, mêmes colonnes dépréciées l.1513-1514 ; réhydrate le pattern existant l.546-547). Le fix doit couvrir les 2 pages, sinon une annonce corrigée à la création serait re-cassée à la modification. Règle de dérivation actée en VISION (« libre = nature opposée », ancrage ville-profil) — voir VISION bloc conv 86.
MAJ conv 86 (clôture) : audit lecture seule a révélé une incohérence de modèle plus profonde que prévu — la page raisonne en `userType` proprio/locataire (écran de choix l.1911-1919), pas avec le modèle `hote`/`les_deux` + `ville_*`/`statut_ville_*`. Le `select` profil (l.583) ne charge ni `ville_*` ni `rhythm_calendar`. Garde d'accès commentée (l.1899) ; route /annonce/creer dupliquée dans App.jsx (l.116 Layout test + l.165 DashboardLayout). Décision actée en VISION (réalignement sur l'alternant-hôte). Brique pure livrée (commit e197475). ModifierAnnoncePage NON encore auditée pour la même incohérence — à faire en session dédiée.
MAJ conv 87 (24 juin 2026) : audit prix (step 5) + chantier entamé. PRIX : le prix hebdomadaire stocké (annonces.prix = loyer/2 /4.33 ×1.15) ne dépend PAS de selectedDates → robuste à la bascule lundis. SEUL point de casse prix = getSelectedWeeksCount (/7) → devient .length quand selectedDates = lundis ; propage à prixTotalSejour + bail_info.nb_semaines_presence/prix_total_sejour (écrits en base). Gardes prixTotalSejour/bailInfo accrochées à userType==='locataire' = l'HÔTE (à préserver, pas supprimer). FAIT (working tree, non commité) : Lots 1a (hostProfile chargé+persisté), 2a/2b/2c (retrait complet taxonomie proprio + parcours unique 0→5). RESTE : Lot 3 (dérivation step 4 + bascule selectedDates + retrait cycle abstrait/colonnes dépréciées), puis Lots 4-5 (consommateurs, payload), puis Lot 6 (miroir ModifierAnnoncePage). Changements de comportement à tracer : /annonce/creer?type= n'est plus lu (DETTE #10 : un CTA passe encore ?type=locataire, à vérifier) ; cas non reconnu → navigate('/dashboard').
MAJ conv 88 (24 juin 2026) : audit Lot 3 complet (3 passes lecture seule, AUCUN code touché). Le step 4 dispo = moteur de cycle abstrait ~250 l. intriqué avec cadrage de dates de bail (generateRhythmDatesFromAnchor ; processRhythmDates/finalizeBailDates/modale Dimanche ; enterCycleSelectionMode ; 2 useEffect dont la boucle DETTE #5 ; selectDate mode cycle + states cycle). selectedDates = jour-par-jour, 5 consommateurs (le rendu grille isSelected est le 5ᵉ, en plus des 4 connus). Décisions figées : ville←deduireOffre(hostProfile) (VISION §652) ; bail à la création supprimé (cohérent §145, bail_info conservé alimenté par selectedDates.length) ; exécution 3a (ancrage ville) → 3b (dérivation + bascule 5 consommateurs + grille semaine + retrait colonnes dépréciées) → 3c (retrait moteur + saisies bail/modale Dimanche). Page toujours never-stage (bypass DEV présents).
