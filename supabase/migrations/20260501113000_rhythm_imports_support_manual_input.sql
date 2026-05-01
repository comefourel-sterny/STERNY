-- ============================================================================
-- NOTE HISTORIQUE — Migration NON APPLIQUÉE le 1er mai 2026
-- ============================================================================
--
-- Cette migration a été tentée dans Supabase Dashboard SQL Editor le 1er mai 2026
-- à 11h30. Erreur retournée :
--   ERROR: 42701: column "source" of relation "rhythm_imports" already exists
--
-- Diagnostic effectué le même jour dans le SQL Editor :
--   1. information_schema.columns sur rhythm_imports : 4 colonnes parser
--      (source_file_path, source_file_type, llm_provider, llm_model) sont déjà
--      nullable. Colonne `source` présente, default 'parser_llm'.
--   2. pg_constraint sur rhythm_imports : les 2 CHECK attendus sont déjà en
--      place — `rhythm_imports_source_file_type_check` (version avec IS NULL
--      OR ...), `rhythm_imports_parser_llm_columns_required`, et la CHECK
--      anonyme `rhythm_imports_source_check` générée par ADD COLUMN.
--
-- Conclusion : la BDD était déjà dans l'état cible avant cette tentative.
-- Une migration équivalente a été appliquée à un moment antérieur sans être
-- tracée dans `supabase/migrations/`. Cause probable : script ad-hoc lancé
-- directement dans le Dashboard, ou migration créée en parallèle dans une
-- autre conversation. Lié à DETTE #15 (migrations désynchronisées de la prod).
--
-- Fichier conservé pour traçabilité. Ne PAS rejouer ce SQL — il plantera
-- à nouveau sur le ADD COLUMN source. Si jamais on veut formellement
-- réenregistrer cet état dans l'historique des migrations Supabase, utiliser
-- `supabase migration repair` (commande Supabase CLI dédiée à ce cas).
--
-- ============================================================================

-- Migration : ouvrir rhythm_imports à la saisie manuelle (chemin 3 VISION §5)
--
-- Contexte : la table rhythm_imports a été créée pour le parser LLM uniquement.
-- 4 colonnes NOT NULL (source_file_path, source_file_type, llm_provider, llm_model)
-- et 1 CHECK contraignant source_file_type aux MIME types image/PDF empêchent
-- l'écriture d'une ligne issue d'une saisie manuelle. Cette migration ouvre la
-- table à 4 origines distinctes via une nouvelle colonne `source`, et autorise
-- les 4 colonnes parser à être NULL pour les origines non-LLM.
--
-- Stratégie validée : Stratégie 2 (ETAT-COURANT.md, session 2026-04-30 soir bis,
-- Bloc 3). Risque de régression sur les lignes existantes : nul (les 4 colonnes
-- restent renseignées pour les lignes issues du parser LLM, et la valeur par
-- défaut 'parser_llm' de la nouvelle colonne `source` rétro-classe correctement
-- les lignes existantes en BDD).
--
-- Revue technique : auditée le 1er mai 2026, verdict OK sans correction.

BEGIN;

ALTER TABLE public.rhythm_imports ALTER COLUMN source_file_path DROP NOT NULL;
ALTER TABLE public.rhythm_imports ALTER COLUMN source_file_type DROP NOT NULL;
ALTER TABLE public.rhythm_imports ALTER COLUMN llm_provider     DROP NOT NULL;
ALTER TABLE public.rhythm_imports ALTER COLUMN llm_model        DROP NOT NULL;

ALTER TABLE public.rhythm_imports
  DROP CONSTRAINT IF EXISTS rhythm_imports_source_file_type_check;

ALTER TABLE public.rhythm_imports
  ADD CONSTRAINT rhythm_imports_source_file_type_check
  CHECK (
    source_file_type IS NULL
    OR source_file_type IN ('image/jpeg', 'image/png', 'image/heic', 'application/pdf')
  );

ALTER TABLE public.rhythm_imports
  ADD COLUMN source text NOT NULL DEFAULT 'parser_llm'
  CHECK (source IN ('parser_llm', 'manual_input', 'parser_pdfjs', 'parser_imagedata'));

ALTER TABLE public.rhythm_imports
  ADD CONSTRAINT rhythm_imports_parser_llm_columns_required
  CHECK (
    source <> 'parser_llm'
    OR (
      source_file_path IS NOT NULL
      AND source_file_type IS NOT NULL
      AND llm_provider IS NOT NULL
      AND llm_model IS NOT NULL
    )
  );

COMMENT ON COLUMN public.rhythm_imports.source IS
  'Origine de la ligne. parser_llm = parser Claude Sonnet (legacy). manual_input = saisie manuelle utilisateur (chemin 3 VISION §5). parser_pdfjs = parser PDF vectoriel via pdf.js (chemin 1, futur). parser_imagedata = parser image raster via algo manuel ImageData (chemin 2, futur).';

COMMIT;
