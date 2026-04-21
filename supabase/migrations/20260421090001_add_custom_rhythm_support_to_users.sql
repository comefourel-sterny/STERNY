-- Migration A : Ajout colonnes rythme calendrier sur users
-- Permet de stocker un vrai calendrier de rythme (pas juste un pattern "2-1")
-- Les colonnes existantes type_alternance et rythme_alternance sont CONSERVÉES
-- pour compatibilité ascendante (V2 les dépréciera)
--
-- Structure de rhythm_calendar (jsonb) :
-- [
--   { "week_start": "2025-09-01", "status": "school" },
--   { "week_start": "2025-09-08", "status": "company" },
--   ...
-- ]

-- Calendrier structuré
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rhythm_calendar jsonb;

-- Bornes du calendrier
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rhythm_start_date date;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rhythm_end_date date;

-- Source du rythme : saisie manuelle ou import document
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rhythm_source text CHECK (rhythm_source IN ('manual', 'document_import'));

-- Lien vers l'import document (si source = document_import)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rhythm_import_id uuid REFERENCES public.rhythm_imports(id) ON DELETE SET NULL;

-- Index sur rhythm_import_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_users_rhythm_import_id ON public.users(rhythm_import_id);

-- Commentaires pour documentation
COMMENT ON COLUMN public.users.rhythm_calendar IS 'Calendrier de rythme structuré : [{ week_start: "YYYY-MM-DD", status: "school"|"company" }]';
COMMENT ON COLUMN public.users.rhythm_source IS 'Source du rythme : manual (saisie) ou document_import (parsing IA)';
COMMENT ON COLUMN public.users.rhythm_import_id IS 'FK vers rhythm_imports si le rythme a été importé depuis un document';
