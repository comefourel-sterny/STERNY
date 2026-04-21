-- Fix : Ajouter 'les_deux' au CHECK constraint sur users.type_user
--
-- BUG EXISTANT : la contrainte users_type_user_check n'autorisait que
-- ('locataire', 'hote', 'proprietaire'). Le frontend (ChoixInscriptionPage,
-- DashboardLocatairePage) écrit 'les_deux' pour les utilisateurs qui sont
-- à la fois locataire et hôte. L'INSERT/UPDATE échouait silencieusement
-- côté base (rejeté par le CHECK) — à vérifier si des users ont été créés
-- dans un état incohérent (type_user resté à 'locataire' alors que le
-- frontend pensait avoir écrit 'les_deux').
--
-- Contrainte actuelle (lue depuis pg_constraint) :
--   nom : users_type_user_check
--   def : CHECK ((type_user = ANY (ARRAY['locataire'::text, 'hote'::text, 'proprietaire'::text])))

BEGIN;

-- Supprimer l'ancien CHECK
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_type_user_check;

-- Recréer avec 'les_deux' inclus
ALTER TABLE public.users
  ADD CONSTRAINT users_type_user_check
  CHECK (type_user = ANY (ARRAY['locataire'::text, 'hote'::text, 'proprietaire'::text, 'les_deux'::text]));

COMMIT;
