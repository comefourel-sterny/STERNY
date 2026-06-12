-- supabase/seed.sql
-- Données de départ pour les tests LOCAUX (étape 5 MVP : parcours candidature).
-- Rejoué automatiquement à chaque `supabase db reset` (config.toml [db.seed]).
-- 100% fictif (@sterny.test) — aucune vraie donnée perso (RGPD).
-- Mot de passe de tous les comptes de test : sterny-dev

DO $$
DECLARE
  v_host_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_tenant_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_annonce_id uuid := '33333333-3333-3333-3333-333333333333';
  v_pwd        text := 'sterny-dev';
BEGIN
  -- 1) Comptes d'authentification
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
  ('00000000-0000-0000-0000-000000000000', v_host_id, 'authenticated', 'authenticated',
   'hote@sterny.test', crypt(v_pwd, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', v_tenant_id, 'authenticated', 'authenticated',
   'locataire@sterny.test', crypt(v_pwd, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
   '', '', '', '');

  -- 2) Identités (relie chaque compte au provider "email" — sans cette ligne, connexion KO)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES
  (gen_random_uuid(), v_host_id, v_host_id::text,
   jsonb_build_object('sub', v_host_id::text, 'email', 'hote@sterny.test'),
   'email', now(), now(), now()),
  (gen_random_uuid(), v_tenant_id, v_tenant_id::text,
   jsonb_build_object('sub', v_tenant_id::text, 'email', 'locataire@sterny.test'),
   'email', now(), now(), now());

  -- 3) Profils publics (ON CONFLICT : robuste si un trigger handle_new_user a déjà créé la ligne)
  INSERT INTO public.users
    (id, email, prenom, nom, type_user, ville_ecole, ville_entreprise, statut_ville_entreprise)
  VALUES
    (v_host_id, 'hote@sterny.test', 'Hugo', 'Hote', 'hote', 'Nantes', 'Rennes', 'hote')
  ON CONFLICT (id) DO UPDATE SET
    email=EXCLUDED.email, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, type_user=EXCLUDED.type_user,
    ville_ecole=EXCLUDED.ville_ecole, ville_entreprise=EXCLUDED.ville_entreprise,
    statut_ville_entreprise=EXCLUDED.statut_ville_entreprise;

  INSERT INTO public.users
    (id, email, prenom, nom, type_user, ville_ecole, statut_ville_ecole)
  VALUES
    (v_tenant_id, 'locataire@sterny.test', 'Léa', 'Locataire', 'locataire', 'Rennes', 'recherche')
  ON CONFLICT (id) DO UPDATE SET
    email=EXCLUDED.email, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, type_user=EXCLUDED.type_user,
    ville_ecole=EXCLUDED.ville_ecole, statut_ville_ecole=EXCLUDED.statut_ville_ecole;

  -- 4) Annonce de l'hôte, à Rennes (piège volontaire : ville_ecole de l'hôte = Nantes)
  INSERT INTO public.annonces
    (id, user_id, ville, titre, type_logement, prix, disponibilites_pattern)
  VALUES
    (v_annonce_id, v_host_id, 'Rennes', 'Studio test Rennes', 'studio', 450, '["2026-09-07","2026-09-21","2026-10-05","2026-10-19"]'::jsonb);

  -- 5) Candidature du locataire sur l'annonce, en attente (exerce le trigger fix #14)
  INSERT INTO public.candidatures (annonce_id, locataire_id, message, statut, semaines_demandees)
  VALUES (v_annonce_id, v_tenant_id, 'Candidature de test (seed local).', 'en_attente', '["2026-09-07","2026-10-05"]'::jsonb);
END $$;
