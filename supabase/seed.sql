-- supabase/seed.sql
-- Données de départ pour les tests LOCAUX (étape 5 MVP : parcours candidature).
-- Rejoué automatiquement à chaque `supabase db reset` (config.toml [db.seed]).
-- 100% fictif (@sterny.test) — aucune vraie donnée perso (RGPD).
-- Mot de passe de tous les comptes de test : sterny-dev

DO $$
DECLARE
  v_host_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_tenant_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_lesdeux_id uuid := '44444444-4444-4444-4444-444444444444';
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
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', v_lesdeux_id, 'authenticated', 'authenticated',
   'lesdeux@sterny.test', crypt(v_pwd, gen_salt('bf')), now(),
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
   'email', now(), now(), now()),
  (gen_random_uuid(), v_lesdeux_id, v_lesdeux_id::text,
   jsonb_build_object('sub', v_lesdeux_id::text, 'email', 'lesdeux@sterny.test'),
   'email', now(), now(), now());

  -- 3) Profils publics (ON CONFLICT : robuste si un trigger handle_new_user a déjà créé la ligne)
  INSERT INTO public.users
    (id, email, prenom, nom, type_user, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar)
  VALUES
    (v_host_id, 'hote@sterny.test', 'Hugo', 'Hote', 'hote', 'Nantes', 'Rennes', 'recherche', 'hote',
     -- Rythme complet année 2026-2027 (52 sem., lundi 31/08/2026 → 23/08/2027), alternance 2 sem. école / 2 sem. entreprise.
     '[{"week_start":"2026-08-31","status":"school"},{"week_start":"2026-09-07","status":"school"},{"week_start":"2026-09-14","status":"company"},{"week_start":"2026-09-21","status":"company"},{"week_start":"2026-09-28","status":"school"},{"week_start":"2026-10-05","status":"school"},{"week_start":"2026-10-12","status":"company"},{"week_start":"2026-10-19","status":"company"},{"week_start":"2026-10-26","status":"school"},{"week_start":"2026-11-02","status":"school"},{"week_start":"2026-11-09","status":"company"},{"week_start":"2026-11-16","status":"company"},{"week_start":"2026-11-23","status":"school"},{"week_start":"2026-11-30","status":"school"},{"week_start":"2026-12-07","status":"company"},{"week_start":"2026-12-14","status":"company"},{"week_start":"2026-12-21","status":"school"},{"week_start":"2026-12-28","status":"school"},{"week_start":"2027-01-04","status":"company"},{"week_start":"2027-01-11","status":"company"},{"week_start":"2027-01-18","status":"school"},{"week_start":"2027-01-25","status":"school"},{"week_start":"2027-02-01","status":"company"},{"week_start":"2027-02-08","status":"company"},{"week_start":"2027-02-15","status":"school"},{"week_start":"2027-02-22","status":"school"},{"week_start":"2027-03-01","status":"company"},{"week_start":"2027-03-08","status":"company"},{"week_start":"2027-03-15","status":"school"},{"week_start":"2027-03-22","status":"school"},{"week_start":"2027-03-29","status":"company"},{"week_start":"2027-04-05","status":"company"},{"week_start":"2027-04-12","status":"school"},{"week_start":"2027-04-19","status":"school"},{"week_start":"2027-04-26","status":"company"},{"week_start":"2027-05-03","status":"company"},{"week_start":"2027-05-10","status":"school"},{"week_start":"2027-05-17","status":"school"},{"week_start":"2027-05-24","status":"company"},{"week_start":"2027-05-31","status":"company"},{"week_start":"2027-06-07","status":"school"},{"week_start":"2027-06-14","status":"school"},{"week_start":"2027-06-21","status":"company"},{"week_start":"2027-06-28","status":"company"},{"week_start":"2027-07-05","status":"school"},{"week_start":"2027-07-12","status":"school"},{"week_start":"2027-07-19","status":"company"},{"week_start":"2027-07-26","status":"company"},{"week_start":"2027-08-02","status":"school"},{"week_start":"2027-08-09","status":"school"},{"week_start":"2027-08-16","status":"company"},{"week_start":"2027-08-23","status":"company"}]'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    email=EXCLUDED.email, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, type_user=EXCLUDED.type_user,
    ville_ecole=EXCLUDED.ville_ecole, ville_entreprise=EXCLUDED.ville_entreprise,
    statut_ville_ecole=EXCLUDED.statut_ville_ecole, statut_ville_entreprise=EXCLUDED.statut_ville_entreprise, rhythm_calendar=EXCLUDED.rhythm_calendar;

  INSERT INTO public.users
    (id, email, prenom, nom, type_user, ville_ecole, statut_ville_ecole, rhythm_calendar)
  VALUES
    (v_tenant_id, 'locataire@sterny.test', 'Léa', 'Locataire', 'locataire', 'Rennes', 'recherche',
     -- Rythme complet année 2026-2027 (52 sem., lundi 31/08/2026 → 23/08/2027), alternance 2 sem. school /
     -- 2 sem. company DÉCALÉE d'1 semaine vs l'hôte : sur l'annonce Rennes, ça fait apparaître les 4 états
     -- du code couleur (13 semaines vertes / 13 rouges + neutre/orange), pas seulement vert+orange.
     '[{"week_start":"2026-08-31","status":"school"},{"week_start":"2026-09-07","status":"company"},{"week_start":"2026-09-14","status":"company"},{"week_start":"2026-09-21","status":"school"},{"week_start":"2026-09-28","status":"school"},{"week_start":"2026-10-05","status":"company"},{"week_start":"2026-10-12","status":"company"},{"week_start":"2026-10-19","status":"school"},{"week_start":"2026-10-26","status":"school"},{"week_start":"2026-11-02","status":"company"},{"week_start":"2026-11-09","status":"company"},{"week_start":"2026-11-16","status":"school"},{"week_start":"2026-11-23","status":"school"},{"week_start":"2026-11-30","status":"company"},{"week_start":"2026-12-07","status":"company"},{"week_start":"2026-12-14","status":"school"},{"week_start":"2026-12-21","status":"school"},{"week_start":"2026-12-28","status":"company"},{"week_start":"2027-01-04","status":"company"},{"week_start":"2027-01-11","status":"school"},{"week_start":"2027-01-18","status":"school"},{"week_start":"2027-01-25","status":"company"},{"week_start":"2027-02-01","status":"company"},{"week_start":"2027-02-08","status":"school"},{"week_start":"2027-02-15","status":"school"},{"week_start":"2027-02-22","status":"company"},{"week_start":"2027-03-01","status":"company"},{"week_start":"2027-03-08","status":"school"},{"week_start":"2027-03-15","status":"school"},{"week_start":"2027-03-22","status":"company"},{"week_start":"2027-03-29","status":"company"},{"week_start":"2027-04-05","status":"school"},{"week_start":"2027-04-12","status":"school"},{"week_start":"2027-04-19","status":"company"},{"week_start":"2027-04-26","status":"company"},{"week_start":"2027-05-03","status":"school"},{"week_start":"2027-05-10","status":"school"},{"week_start":"2027-05-17","status":"company"},{"week_start":"2027-05-24","status":"company"},{"week_start":"2027-05-31","status":"school"},{"week_start":"2027-06-07","status":"school"},{"week_start":"2027-06-14","status":"company"},{"week_start":"2027-06-21","status":"company"},{"week_start":"2027-06-28","status":"school"},{"week_start":"2027-07-05","status":"school"},{"week_start":"2027-07-12","status":"company"},{"week_start":"2027-07-19","status":"company"},{"week_start":"2027-07-26","status":"school"},{"week_start":"2027-08-02","status":"school"},{"week_start":"2027-08-09","status":"company"},{"week_start":"2027-08-16","status":"company"},{"week_start":"2027-08-23","status":"school"}]'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    email=EXCLUDED.email, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, type_user=EXCLUDED.type_user,
    ville_ecole=EXCLUDED.ville_ecole, statut_ville_ecole=EXCLUDED.statut_ville_ecole,
    rhythm_calendar=EXCLUDED.rhythm_calendar;

  -- 3bis) Profil les_deux (compte de test bascule ville active recherche↔hôte, ajouté conv suivante) :
  -- ville_ecole=Rennes en statut 'hote' (il y propose son logement), ville_entreprise=Nantes en statut
  -- 'recherche' (il y cherche un logement). 2 villes, 2 statuts remplis (contraste avec hote@ = ville muette
  -- DETTE #143). rhythm_calendar 52 sem. réutilisé du profil locataire (rythme valide, école/entreprise).
  INSERT INTO public.users
    (id, email, prenom, nom, type_user, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar)
  VALUES
    (v_lesdeux_id, 'lesdeux@sterny.test', 'Dorian', 'Deux', 'les_deux', 'Rennes', 'Nantes', 'hote', 'recherche',
     '[{"week_start":"2026-08-31","status":"school"},{"week_start":"2026-09-07","status":"company"},{"week_start":"2026-09-14","status":"company"},{"week_start":"2026-09-21","status":"school"},{"week_start":"2026-09-28","status":"school"},{"week_start":"2026-10-05","status":"company"},{"week_start":"2026-10-12","status":"company"},{"week_start":"2026-10-19","status":"school"},{"week_start":"2026-10-26","status":"school"},{"week_start":"2026-11-02","status":"company"},{"week_start":"2026-11-09","status":"company"},{"week_start":"2026-11-16","status":"school"},{"week_start":"2026-11-23","status":"school"},{"week_start":"2026-11-30","status":"company"},{"week_start":"2026-12-07","status":"company"},{"week_start":"2026-12-14","status":"school"},{"week_start":"2026-12-21","status":"school"},{"week_start":"2026-12-28","status":"company"},{"week_start":"2027-01-04","status":"company"},{"week_start":"2027-01-11","status":"school"},{"week_start":"2027-01-18","status":"school"},{"week_start":"2027-01-25","status":"company"},{"week_start":"2027-02-01","status":"company"},{"week_start":"2027-02-08","status":"school"},{"week_start":"2027-02-15","status":"school"},{"week_start":"2027-02-22","status":"company"},{"week_start":"2027-03-01","status":"company"},{"week_start":"2027-03-08","status":"school"},{"week_start":"2027-03-15","status":"school"},{"week_start":"2027-03-22","status":"company"},{"week_start":"2027-03-29","status":"company"},{"week_start":"2027-04-05","status":"school"},{"week_start":"2027-04-12","status":"school"},{"week_start":"2027-04-19","status":"company"},{"week_start":"2027-04-26","status":"company"},{"week_start":"2027-05-03","status":"school"},{"week_start":"2027-05-10","status":"school"},{"week_start":"2027-05-17","status":"company"},{"week_start":"2027-05-24","status":"company"},{"week_start":"2027-05-31","status":"school"},{"week_start":"2027-06-07","status":"school"},{"week_start":"2027-06-14","status":"company"},{"week_start":"2027-06-21","status":"company"},{"week_start":"2027-06-28","status":"school"},{"week_start":"2027-07-05","status":"school"},{"week_start":"2027-07-12","status":"company"},{"week_start":"2027-07-19","status":"company"},{"week_start":"2027-07-26","status":"school"},{"week_start":"2027-08-02","status":"school"},{"week_start":"2027-08-09","status":"company"},{"week_start":"2027-08-16","status":"company"},{"week_start":"2027-08-23","status":"school"}]'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    email=EXCLUDED.email, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, type_user=EXCLUDED.type_user,
    ville_ecole=EXCLUDED.ville_ecole, ville_entreprise=EXCLUDED.ville_entreprise,
    statut_ville_ecole=EXCLUDED.statut_ville_ecole, statut_ville_entreprise=EXCLUDED.statut_ville_entreprise,
    rhythm_calendar=EXCLUDED.rhythm_calendar;

  -- 4) Annonce de l'hôte, à Rennes (piège volontaire : ville_ecole de l'hôte = Nantes).
  -- disponibilites_pattern = semaines 'school' du rythme de l'hôte : Rennes est sa ville ENTREPRISE
  -- (pole='entreprise'), donc le logement est libre quand il est à l'école (Nantes). Dérivé du
  -- rhythm_calendar ci-dessus (26 semaines school, toutes futures vs 12/07/2026).
  INSERT INTO public.annonces
    (id, user_id, ville, pole, titre, type_logement, prix, disponibilites_pattern)
  VALUES
    (v_annonce_id, v_host_id, 'Rennes', 'entreprise', 'Studio test Rennes', 'studio', 450, '["2026-08-31","2026-09-07","2026-09-28","2026-10-05","2026-10-26","2026-11-02","2026-11-23","2026-11-30","2026-12-21","2026-12-28","2027-01-18","2027-01-25","2027-02-15","2027-02-22","2027-03-15","2027-03-22","2027-04-12","2027-04-19","2027-05-10","2027-05-17","2027-06-07","2027-06-14","2027-07-05","2027-07-12","2027-08-02","2027-08-09"]'::jsonb);

  -- 5) Candidature du locataire sur l'annonce, en attente (exerce le trigger fix #14)
  INSERT INTO public.candidatures (annonce_id, locataire_id, message, statut, semaines_demandees)
  VALUES (v_annonce_id, v_tenant_id, 'Candidature de test (seed local).', 'en_attente', '["2026-09-07","2026-10-05"]'::jsonb);
END $$;
