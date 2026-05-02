-- ============================================================================
-- Migration : confirm_rhythm_calendar_manual atomic function
-- ============================================================================
-- Date de création : 2 mai 2026
--
-- But : RPC atomique pour la transition « calendrier saisi manuellement →
-- confirmé » dans le cadre du chemin 3 de la stratégie discriminante par
-- format source (VISION-ARCHITECTURE.md §5). Couvre le parcours d'un
-- utilisateur qui construit son rythme d'alternance via le composant
-- RhythmManualBuilder, sans uploader de fichier de planning.
--
-- RPC sœur : public.confirm_rhythm_calendar(uuid, text) — commit 65d81ca,
-- migration supabase/migrations/20260425121949_confirm_rhythm_calendar_atomic_function.sql.
-- Cette RPC sœur gère le flux `document_import` (parser LLM → utilisateur
-- valide un groupe choisi parmi ceux extraits du fichier).
--
-- Pourquoi une RPC séparée plutôt qu'une RPC unique paramétrée :
--   1. La RPC sœur hardcode `users.rhythm_source = 'document_import'`,
--      incompatible avec une saisie manuelle qui doit écrire `'manual'`.
--   2. La RPC sœur valide `p_group_id` contre `parsed_groups.groups[]`,
--      ce paramètre n'a pas de sens en saisie manuelle (l'utilisateur
--      construit lui-même un seul calendrier, pas de choix de groupe).
--   3. Les flux d'erreur sont fondamentalement différents (parser LLM
--      peut échouer à extraire du contenu, saisie manuelle peut échouer
--      sur des règles de format simples).
--
-- Convention « RPC dédiée par cas d'usage » plutôt que « RPC unique
-- paramétrée » : décision actée le 2 mai 2026. Préserve la lisibilité de
-- chaque fonction et les contrats d'erreur distincts sans alourdir une
-- signature unique de paramètres conditionnels.
--
-- Côté frontend, appelée via :
--   supabase.rpc('confirm_rhythm_calendar_manual', {
--     p_calendar: [
--       { week_start: '2026-08-31', status: 'school' },
--       { week_start: '2026-09-07', status: 'company' },
--       ...
--     ]
--   })
--
-- Effets en transaction (tout ou rien) :
--   1. INSERT public.rhythm_imports
--        (user_id, parsed_groups synthétique, selected_group_id='manual',
--         status='confirmed', source='manual_input', 4 colonnes parser à NULL)
--   2. UPDATE public.users SET rhythm_calendar=p_calendar,
--        rhythm_start_date, rhythm_end_date, rhythm_source='manual',
--        rhythm_import_id=<id de la ligne insérée>
--
-- Note de nomenclature : `users.rhythm_source = 'manual'` (CHECK users
-- autorise 'manual' et 'document_import') vs `rhythm_imports.source =
-- 'manual_input'` (CHECK rhythm_imports autorise 4 valeurs). Les 2 colonnes
-- ont des valeurs différentes par construction historique du schéma.
--
-- Sécurité : SECURITY INVOKER, RLS s'applique, l'utilisateur ne peut
-- écrire que ses propres lignes (RLS rhythm_imports_insert_own +
-- users_update_own). Aucune escalade de privilèges possible.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.confirm_rhythm_calendar_manual(
  p_calendar jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_import_id  uuid;
  v_start_date date;
  v_end_date   date;
BEGIN
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Calendrier non vide et de type tableau
  IF p_calendar IS NULL
     OR jsonb_typeof(p_calendar) <> 'array'
     OR jsonb_array_length(p_calendar) = 0 THEN
    RAISE EXCEPTION 'Calendar is empty or not an array'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Toutes les entrées ont week_start ET status
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_calendar) AS w
     WHERE w->>'week_start' IS NULL
        OR w->>'status' IS NULL
  ) THEN
    RAISE EXCEPTION 'Calendar entry missing week_start or status'
      USING ERRCODE = '22023';
  END IF;

  -- 4. Toutes les entrées ont status dans ('school', 'company')
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_calendar) AS w
     WHERE w->>'status' NOT IN ('school', 'company')
  ) THEN
    RAISE EXCEPTION 'Invalid status in calendar (must be school or company)'
      USING ERRCODE = '22023';
  END IF;

  -- 5. Toutes les week_start tombent un lundi (ISO 8601, ISODOW = 1)
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_calendar) AS w
     WHERE EXTRACT(ISODOW FROM (w->>'week_start')::date) <> 1
  ) THEN
    RAISE EXCEPTION 'week_start must be a Monday (ISO 8601)'
      USING ERRCODE = '22023';
  END IF;

  -- 6. Pas de doublon de week_start dans le tableau
  IF (
    SELECT COUNT(DISTINCT w->>'week_start')
      FROM jsonb_array_elements(p_calendar) AS w
  ) < jsonb_array_length(p_calendar) THEN
    RAISE EXCEPTION 'Duplicate week_start in calendar'
      USING ERRCODE = '22023';
  END IF;

  -- 7. Calcul des dates min/max (week_start est la date ISO du lundi)
  SELECT
    MIN((w->>'week_start')::date),
    MAX((w->>'week_start')::date)
    INTO v_start_date, v_end_date
    FROM jsonb_array_elements(p_calendar) AS w;

  -- 8. INSERT 1/2 : créer la ligne rhythm_imports source='manual_input',
  --    statut directement 'confirmed' (pas d'étape parsed intermédiaire en
  --    saisie manuelle). Les 4 colonnes parser sont laissées à NULL,
  --    autorisé par la CHECK rhythm_imports_parser_llm_columns_required
  --    (qui n'exige les colonnes parser que si source = 'parser_llm').
  --    parser_version est laissé au DEFAULT 'v1' défini en migration
  --    20260421090000 (pas de signification métier en saisie manuelle).
  INSERT INTO public.rhythm_imports (
    user_id,
    source_file_path,
    source_file_type,
    source_file_size_bytes,
    llm_provider,
    llm_model,
    raw_response,
    parsed_groups,
    selected_group_id,
    status,
    error_message,
    source
  ) VALUES (
    v_user_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'groups', jsonb_build_array(
        jsonb_build_object(
          'id',    'manual',
          'label', 'Saisie manuelle',
          'weeks', p_calendar
        )
      )
    ),
    'manual',
    'confirmed',
    NULL,
    'manual_input'
  )
  RETURNING id INTO v_import_id;

  -- 9. UPDATE 2/2 : matérialiser le calendrier dans le profil utilisateur
  --    et pointer rhythm_import_id vers la ligne qu'on vient de créer.
  --    rhythm_source = 'manual' (CHECK users_rhythm_source_check autorise
  --    'manual' et 'document_import' — pas 'manual_input').
  UPDATE public.users
     SET rhythm_calendar   = p_calendar,
         rhythm_start_date = v_start_date,
         rhythm_end_date   = v_end_date,
         rhythm_source     = 'manual',
         rhythm_import_id  = v_import_id
   WHERE id = v_user_id;

  -- 10. Récap pour le frontend
  RETURN jsonb_build_object(
    'import_id',         v_import_id,
    'weeks_count',       jsonb_array_length(p_calendar),
    'rhythm_start_date', v_start_date,
    'rhythm_end_date',   v_end_date,
    'status',            'confirmed',
    'source',            'manual_input'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_rhythm_calendar_manual(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_rhythm_calendar_manual(jsonb) TO authenticated;

COMMENT ON FUNCTION public.confirm_rhythm_calendar_manual(jsonb) IS
  'Transition atomique « calendrier saisi manuellement -> confirmé » (chemin 3 VISION §5). '
  'Entrée : p_calendar tableau JSON [{week_start: YYYY-MM-DD lundi, status: school|company}, ...]. '
  'Effets atomiques : INSERT rhythm_imports (source=manual_input, status=confirmed, 4 colonnes parser NULL) + UPDATE users (rhythm_calendar, rhythm_start_date, rhythm_end_date, rhythm_source=manual, rhythm_import_id). '
  'Erreurs : 28000 non authentifié ; 22023 calendrier invalide (vide ou non-tableau, week_start/status manquant, status hors school/company, week_start non-lundi ISO, doublon de week_start). '
  'RPC sœur de confirm_rhythm_calendar(uuid, text) qui gère le flux document_import (parser LLM + choix de groupe).';

COMMIT;
