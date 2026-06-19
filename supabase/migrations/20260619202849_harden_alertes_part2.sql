-- Durcissement RLS de public.alertes - PART 2 (conv 72, 2026-06-19)
-- Suite de ..._harden_alertes_rls.sql (part 1 = fuite de lecture).
-- 1) Retire la policy DELETE permissive alertes_delete (USING true) qui laissait tout
--    user connecte supprimer n'importe quelle ligne. Reste alertes_delete_own (owner-only).
--    Verifie : seul desactiverAlerte (dashboard) supprime, sur des lignes own -> couvert.
-- 2) DROP des 2 triggers herites du snapshot (deja ABSENTS en prod depuis le 24 avril) pour
--    aligner le local : un `db reset` ne doit plus recreer un trigger HTTP qui tape la prod.
-- Applique d'abord en prod (SQL editor) car db push impossible (feat != main).

DROP POLICY IF EXISTS "alertes_delete" ON public.alertes;
DROP TRIGGER IF EXISTS "send-alert-on-insert" ON public.alertes;
DROP TRIGGER IF EXISTS "on_new_alerte" ON public.alertes;

-- Rollback policy (urgence uniquement) :
--   CREATE POLICY "alertes_delete" ON public.alertes FOR DELETE TO authenticated USING (true);
-- (Pas de rollback trigger : re-creer un trigger http_request vers prod est indesirable.)
