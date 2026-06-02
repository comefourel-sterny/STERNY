BEGIN;

CREATE OR REPLACE FUNCTION public.complete_inscription_alternant(
  p_profile         jsonb,
  p_rhythm_calendar jsonb,
  p_rhythm_source   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_start_date date;
  v_end_date   date;
BEGIN
  -- 1. Authentification : identité tirée du JWT, jamais d'un paramètre
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Champs profil obligatoires (NOT NULL en base : prenom, nom, email, type_user)
  IF coalesce(p_profile->>'prenom', '') = ''
     OR coalesce(p_profile->>'nom', '') = ''
     OR coalesce(p_profile->>'email', '') = ''
     OR coalesce(p_profile->>'type_user', '') = '' THEN
    RAISE EXCEPTION 'Missing required profile field (prenom, nom, email, type_user)'
      USING ERRCODE = '22023';
  END IF;

  -- 3. type_user limité aux profils alternant (ce wizard n'inscrit pas de proprietaire)
  IF p_profile->>'type_user' NOT IN ('locataire', 'hote', 'les_deux') THEN
    RAISE EXCEPTION 'Invalid type_user for alternant wizard (expected locataire, hote or les_deux)'
      USING ERRCODE = '22023';
  END IF;

  -- 4. rhythm_source valide (doit satisfaire users_rhythm_source_check)
  IF coalesce(p_rhythm_source, '') NOT IN ('manual', 'document_import') THEN
    RAISE EXCEPTION 'Invalid rhythm_source (expected manual or document_import)'
      USING ERRCODE = '22023';
  END IF;

  -- 5. Calendrier non vide et de type tableau
  IF p_rhythm_calendar IS NULL
     OR jsonb_typeof(p_rhythm_calendar) <> 'array'
     OR jsonb_array_length(p_rhythm_calendar) = 0 THEN
    RAISE EXCEPTION 'Calendar is empty or not an array'
      USING ERRCODE = '22023';
  END IF;

  -- 6. Toutes les entrées ont week_start ET status
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rhythm_calendar) AS w
     WHERE w->>'week_start' IS NULL OR w->>'status' IS NULL
  ) THEN
    RAISE EXCEPTION 'Calendar entry missing week_start or status'
      USING ERRCODE = '22023';
  END IF;

  -- 7. status dans ('school','company')
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rhythm_calendar) AS w
     WHERE w->>'status' NOT IN ('school', 'company')
  ) THEN
    RAISE EXCEPTION 'Invalid status in calendar (must be school or company)'
      USING ERRCODE = '22023';
  END IF;

  -- 8. week_start tombe un lundi (ISO 8601, ISODOW = 1)
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rhythm_calendar) AS w
     WHERE EXTRACT(ISODOW FROM (w->>'week_start')::date) <> 1
  ) THEN
    RAISE EXCEPTION 'week_start must be a Monday (ISO 8601)'
      USING ERRCODE = '22023';
  END IF;

  -- 9. Pas de doublon de week_start
  IF (
    SELECT COUNT(DISTINCT w->>'week_start') FROM jsonb_array_elements(p_rhythm_calendar) AS w
  ) < jsonb_array_length(p_rhythm_calendar) THEN
    RAISE EXCEPTION 'Duplicate week_start in calendar'
      USING ERRCODE = '22023';
  END IF;

  -- 10. Dates min/max (week_start = date ISO du lundi)
  SELECT MIN((w->>'week_start')::date), MAX((w->>'week_start')::date)
    INTO v_start_date, v_end_date
    FROM jsonb_array_elements(p_rhythm_calendar) AS w;

  -- 11. Écriture du profil en une passe, idempotente.
  --      date_naissance STOCKÉE telle quelle, AUCUN contrôle d'âge (>=18 parqué, Q-AVO-001/Q-DPO-002).
  --      photo_profil_url et bio NON écrites (retirées du wizard, conv 26).
  --      Les valeurs ville/statut sont écrites telles que fournies par le client
  --      (dérivation selon la convention VISION §3 = responsabilité du client).
  INSERT INTO public.users (
    id, prenom, nom, email, telephone, type_user,
    ecole, annee_etudes, filiere,
    ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise,
    date_naissance, sexe,
    rhythm_calendar, rhythm_start_date, rhythm_end_date, rhythm_source, rhythm_import_id,
    profil_complet
  ) VALUES (
    v_user_id,
    p_profile->>'prenom',
    p_profile->>'nom',
    p_profile->>'email',
    NULLIF(p_profile->>'telephone', ''),
    p_profile->>'type_user',
    NULLIF(p_profile->>'ecole', ''),
    NULLIF(p_profile->>'annee_etudes', ''),
    NULLIF(p_profile->>'filiere', ''),
    NULLIF(p_profile->>'ville_ecole', ''),
    NULLIF(p_profile->>'ville_entreprise', ''),
    NULLIF(p_profile->>'statut_ville_ecole', ''),
    NULLIF(p_profile->>'statut_ville_entreprise', ''),
    NULLIF(p_profile->>'date_naissance', ''),
    NULLIF(p_profile->>'sexe', ''),
    p_rhythm_calendar,
    v_start_date,
    v_end_date,
    p_rhythm_source,
    NULL,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    prenom                  = EXCLUDED.prenom,
    nom                     = EXCLUDED.nom,
    email                   = EXCLUDED.email,
    telephone               = EXCLUDED.telephone,
    type_user               = EXCLUDED.type_user,
    ecole                   = EXCLUDED.ecole,
    annee_etudes            = EXCLUDED.annee_etudes,
    filiere                 = EXCLUDED.filiere,
    ville_ecole             = EXCLUDED.ville_ecole,
    ville_entreprise        = EXCLUDED.ville_entreprise,
    statut_ville_ecole      = EXCLUDED.statut_ville_ecole,
    statut_ville_entreprise = EXCLUDED.statut_ville_entreprise,
    date_naissance          = EXCLUDED.date_naissance,
    sexe                    = EXCLUDED.sexe,
    rhythm_calendar         = EXCLUDED.rhythm_calendar,
    rhythm_start_date       = EXCLUDED.rhythm_start_date,
    rhythm_end_date         = EXCLUDED.rhythm_end_date,
    rhythm_source           = EXCLUDED.rhythm_source,
    rhythm_import_id        = EXCLUDED.rhythm_import_id,
    profil_complet          = EXCLUDED.profil_complet;

  -- 12. Récap pour le frontend
  RETURN jsonb_build_object(
    'user_id',           v_user_id,
    'profil_complet',    true,
    'weeks_count',       jsonb_array_length(p_rhythm_calendar),
    'rhythm_start_date', v_start_date,
    'rhythm_end_date',   v_end_date,
    'rhythm_source',     p_rhythm_source
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_inscription_alternant(jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_inscription_alternant(jsonb, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.complete_inscription_alternant(jsonb, jsonb, text) IS
  'Écriture finale one-pass de l''inscription alternant (E-7). '
  'Identité tirée de auth.uid() (jamais d''un paramètre). INSERT idempotent ON CONFLICT (id) DO UPDATE. '
  'p_profile : {prenom, nom, email, telephone, type_user, ecole, annee_etudes, filiere, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, date_naissance, sexe}. '
  'p_rhythm_calendar : tableau [{week_start: YYYY-MM-DD lundi, status: school|company}]. p_rhythm_source : manual|document_import. '
  'N''insère AUCUNE ligne rhythm_imports et laisse rhythm_import_id = NULL (différence avec confirm_rhythm_calendar_manual). '
  'profil_complet = true. date_naissance stockée sans contrôle d''âge (>=18 parqué, Q-AVO-001/Q-DPO-002). photo_profil_url et bio non écrites (retirées du wizard, conv 26). '
  'Erreurs : 28000 non authentifié ; 22023 profil/calendrier/source invalide. SECURITY INVOKER : RLS users s''applique.';

COMMIT;
