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

## Planification

Tous ces points sont **hors scope Phase 1**. Ils seront traités en **Phase 0bis — Stabilisation CreerAnnoncePage**, à faire après la Phase 1 complète.
