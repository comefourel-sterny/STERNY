-- Durcissement RLS de public.alertes (conv 72, 2026-06-19)
-- Contexte : 2 policies SELECT permissives (USING true) laissaient anon+authenticated
-- lire TOUS les emails collectes via la cle anon publique. Fuite de donnees personnelles.
-- Applique d'abord directement en prod (SQL editor) car le deploiement via `db push` est
-- impossible (branche feat != main). Ce fichier enregistre le changement pour l'historique
-- et la coherence d'un futur `supabase db reset` local.
-- Restent apres ce DROP : alertes_select_own (auth.uid() = user_id) + admin_select_all (is_admin()).

DROP POLICY IF EXISTS "Lecture publique alertes" ON public.alertes;
DROP POLICY IF EXISTS "alertes_select" ON public.alertes;

-- Rollback (urgence uniquement, re-ouvrirait la fuite) :
--   CREATE POLICY "Lecture publique alertes" ON public.alertes FOR SELECT TO anon, authenticated USING (true);
--   CREATE POLICY "alertes_select" ON public.alertes FOR SELECT TO authenticated USING (true);
