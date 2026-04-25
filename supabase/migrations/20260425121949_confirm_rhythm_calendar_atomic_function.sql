-- =============================================================================
-- Migration : confirm_rhythm_calendar atomic function
-- =============================================================================
-- Crée une fonction RPC qui encapsule la transition status='parsed' → 'confirmed'
-- d'une ligne rhythm_imports en une transaction atomique.
--
-- Côté frontend, appelée via :
--   supabase.rpc('confirm_rhythm_calendar', {
--     p_import_id: '<uuid>',
--     p_group_id: '<group_id du groupe choisi par l utilisateur>'
--   })
--
-- Effets en transaction (tout ou rien) :
--   1. UPDATE rhythm_imports SET selected_group_id, status='confirmed' WHERE id=p_import_id
--   2. UPDATE users SET rhythm_calendar (semaines du groupe), rhythm_start_date,
--                       rhythm_end_date, rhythm_source='document_import',
--                       rhythm_import_id WHERE id=auth.uid()
--
-- Sécurité : SECURITY INVOKER, RLS s'applique, l'utilisateur ne peut confirmer
-- que ses propres imports. Aucune escalade de privilèges possible.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirm_rhythm_calendar(
  p_import_id uuid,
  p_group_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_parsed_groups  jsonb;
  v_status         text;
  v_selected_group jsonb;
  v_weeks          jsonb;
  v_start_date     date;
  v_end_date       date;
BEGIN
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Récupérer la ligne rhythm_imports (RLS filtre déjà : user ne voit que les siennes)
  SELECT parsed_groups, status
    INTO v_parsed_groups, v_status
    FROM public.rhythm_imports
   WHERE id = p_import_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rhythm import not found or access denied'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status = 'failed' THEN
    RAISE EXCEPTION 'Cannot confirm a failed parsing'
      USING ERRCODE = '22023';
  END IF;

  IF v_parsed_groups IS NULL THEN
    RAISE EXCEPTION 'No parsed data available for this import'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Trouver le groupe sélectionné dans parsed_groups.groups[]
  SELECT g
    INTO v_selected_group
    FROM jsonb_array_elements(v_parsed_groups -> 'groups') AS g
   WHERE g ->> 'group_id' = p_group_id
   LIMIT 1;

  IF v_selected_group IS NULL THEN
    RAISE EXCEPTION 'Group % not found in parsed_groups', p_group_id
      USING ERRCODE = '22023';
  END IF;

  -- 4. Extraire les semaines du groupe sélectionné
  v_weeks := v_selected_group -> 'weeks';

  IF v_weeks IS NULL OR jsonb_array_length(v_weeks) = 0 THEN
    RAISE EXCEPTION 'Selected group has no weeks data'
      USING ERRCODE = '22023';
  END IF;

  -- 5. Calculer dates min/max (week_start est la date ISO du lundi)
  SELECT
    MIN((w ->> 'week_start')::date),
    MAX((w ->> 'week_start')::date)
    INTO v_start_date, v_end_date
    FROM jsonb_array_elements(v_weeks) AS w;

  -- 6. UPDATE 1/2 : marquer rhythm_imports comme confirmé
  UPDATE public.rhythm_imports
     SET selected_group_id = p_group_id,
         status            = 'confirmed'
   WHERE id = p_import_id;

  -- 7. UPDATE 2/2 : matérialiser les semaines dans users.rhythm_calendar
  --    et pointer rhythm_import_id vers cette ligne
  UPDATE public.users
     SET rhythm_calendar    = v_weeks,
         rhythm_start_date  = v_start_date,
         rhythm_end_date    = v_end_date,
         rhythm_source      = 'document_import',
         rhythm_import_id   = p_import_id
   WHERE id = v_user_id;

  -- 8. Récap pour le frontend
  RETURN jsonb_build_object(
    'import_id',         p_import_id,
    'selected_group_id', p_group_id,
    'weeks_count',       jsonb_array_length(v_weeks),
    'rhythm_start_date', v_start_date,
    'rhythm_end_date',   v_end_date,
    'status',            'confirmed'
  );
END;
$$;

-- Donner le droit d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.confirm_rhythm_calendar(uuid, text) TO authenticated;

-- Documentation pour le dashboard Supabase
COMMENT ON FUNCTION public.confirm_rhythm_calendar(uuid, text) IS
  'Transition atomique status=parsed -> confirmed sur une ligne rhythm_imports + matérialisation des semaines du groupe choisi dans users.rhythm_calendar. Appelée par le frontend après validation visuelle de l utilisateur. SECURITY INVOKER : RLS s applique.';
