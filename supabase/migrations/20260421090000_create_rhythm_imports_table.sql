-- Migration B : Table rhythm_imports
-- Stocke les documents école parsés par l'IA avec audit trail
-- Doit être exécutée AVANT la migration users (FK rhythm_import_id → rhythm_imports.id)
--
-- Structure de parsed_groups (jsonb) :
-- {
--   "document_meta": {
--     "school_name": "ESCP Business School",
--     "program_name": "Master Grande École",
--     "academic_year": "2025-2026",
--     "detected_locale": "fr"
--   },
--   "groups": [
--     {
--       "group_id": "G1",
--       "group_label": "FA CG2P",
--       "weeks": [
--         { "week_start": "2025-09-01", "status": "school" },
--         { "week_start": "2025-09-08", "status": "company" }
--       ]
--     }
--   ]
-- }

CREATE TABLE IF NOT EXISTS public.rhythm_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Document source
  source_file_path text NOT NULL,
  source_file_type text NOT NULL CHECK (source_file_type IN ('image/jpeg', 'image/png', 'image/heic', 'application/pdf')),
  source_file_size_bytes int4,

  -- Parser metadata
  parser_version text NOT NULL DEFAULT 'v1',
  llm_provider text NOT NULL,
  llm_model text NOT NULL,

  -- Résultats
  raw_response jsonb,
  parsed_groups jsonb,
  selected_group_id text,

  -- Statut
  status text NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed', 'confirmed', 'failed')),
  error_message text,

  -- parsed_groups obligatoire sauf si status = 'failed'
  CONSTRAINT rhythm_imports_parsed_groups_required CHECK (
    (status IN ('parsed', 'confirmed') AND parsed_groups IS NOT NULL)
    OR (status = 'failed')
  )
);

-- Index
CREATE INDEX idx_rhythm_imports_user_id ON public.rhythm_imports(user_id);
CREATE INDEX idx_rhythm_imports_created_at ON public.rhythm_imports(created_at DESC);

-- RLS
ALTER TABLE public.rhythm_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rhythm_imports_select_own"
  ON public.rhythm_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "rhythm_imports_insert_own"
  ON public.rhythm_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rhythm_imports_update_own"
  ON public.rhythm_imports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_select_all"
  ON public.rhythm_imports FOR SELECT
  USING (public.is_admin());
