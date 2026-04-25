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

## Planification

Tous ces points sont **hors scope Phase 1**. Ils seront traités en **Phase 0bis — Stabilisation CreerAnnoncePage**, à faire après la Phase 1 complète.
