-- Fermeture de la lecture de public.users : DETTE #171, phase A.
-- Conception validée le 21/09/2026 (VISION, « Accès à la table users »).
-- Rejouable : chaque objet est supprimé s'il existe, ou remplacé.
-- Aucun begin ni commit dans ce fichier : en local, psql --single-transaction ;
-- en production, éditeur SQL.
-- Hors périmètre : droits de table de anon et authenticated sur users (inchangés),
-- falsifiabilité des relations (phase A bis, DETTE #177), restriction des champs (phase B, DETTE #175).

-- 1. Index des colonnes de relation interrogées par la règle de lecture.

create index if not exists idx_candidatures_locataire on public.candidatures (locataire_id);
create index if not exists idx_candidatures_annonce on public.candidatures (annonce_id);
create index if not exists idx_contrats_locataire on public.contrats (locataire_id);
create index if not exists idx_contrats_proprietaire on public.contrats (proprietaire_id);

-- 2. Relation qui autorise la lecture de la ligne entière d'un autre compte.
--    Droits de son auteur : une règle sur users qui relirait users tournerait en boucle.

create or replace function public.peut_lire_user(p_cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and p_cible is not null
    and p_cible <> auth.uid()
    and (
      -- a. deux parties d'un même contrat
      exists (
        select 1 from public.contrats c
        where (c.locataire_id = auth.uid() and c.proprietaire_id = p_cible)
           or (c.proprietaire_id = auth.uid() and c.locataire_id = p_cible)
      )
      -- a. deux parties d'un même renouvellement
      or exists (
        select 1 from public.renouvellements r
        where (r.locataire_id = auth.uid() and r.proprietaire_id = p_cible)
           or (r.proprietaire_id = auth.uid() and r.locataire_id = p_cible)
      )
      -- b. la cible a candidaté à une annonce du lecteur, quel que soit le statut
      or exists (
        select 1 from public.candidatures ca
        join public.annonces a on a.id = ca.annonce_id
        where ca.locataire_id = p_cible
          and a.user_id = auth.uid()
      )
      -- c. le lecteur a candidaté à une annonce de la cible, candidature acceptée
      or exists (
        select 1 from public.candidatures ca
        join public.annonces a on a.id = ca.annonce_id
        where ca.locataire_id = auth.uid()
          and a.user_id = p_cible
          and ca.statut = 'acceptee'
      )
      -- d. l'un est le parrain de l'autre
      or exists (
        select 1 from public.users u
        where (u.id = p_cible and u.parrain_id = auth.uid())
           or (u.id = auth.uid() and u.parrain_id = p_cible)
      )
      -- e. la cible a une candidature acceptée sur une annonce dont l'auteur
      --    est lié au lecteur par parrainage, dans un sens ou dans l'autre
      or exists (
        select 1 from public.candidatures ca
        join public.annonces a on a.id = ca.annonce_id
        join public.users h on h.id = a.user_id
        where ca.locataire_id = p_cible
          and ca.statut = 'acceptee'
          and (
            h.parrain_id = auth.uid()
            or h.id = (select l.parrain_id from public.users l where l.id = auth.uid())
          )
      )
    ),
    false
  );
$$;

revoke all on function public.peut_lire_user(uuid) from public, anon, authenticated;
grant execute on function public.peut_lire_user(uuid) to authenticated;

-- 3. Règles d'accès de users : les onze règles existantes sont remplacées par six.

drop policy if exists "Anyone authenticated can read basic user info" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users lisibles par les utilisateurs authentifiés" on public.users;
drop policy if exists "Users modifiables par le propriétaire du profil" on public.users;
drop policy if exists users_delete_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_select_all on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_update_own_no_admin on public.users;

drop policy if exists users_lecture_soi on public.users;
drop policy if exists users_lecture_admin on public.users;
drop policy if exists users_lecture_relation on public.users;
drop policy if exists users_insertion_soi on public.users;
drop policy if exists users_modification_soi on public.users;
drop policy if exists users_suppression_soi on public.users;

create policy users_lecture_soi on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_lecture_admin on public.users
  for select to authenticated
  using (public.is_admin());

create policy users_lecture_relation on public.users
  for select to authenticated
  using (public.peut_lire_user(id));

create policy users_insertion_soi on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy users_modification_soi on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_suppression_soi on public.users
  for delete to authenticated
  using (id = auth.uid());

-- 4. Profil public, par lot, accessible sans connexion.
--    Jamais le téléphone, l'email, la date de naissance ni le rythme.

create or replace function public.profils_publics(p_ids uuid[])
returns table (
  id uuid,
  prenom text,
  nom text,
  photo_profil_url text,
  type_user text,
  ecole text,
  annee_etudes text,
  filiere text,
  bio text,
  ville text,
  ville_ecole text,
  ville_entreprise text,
  identite_verifiee boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id, u.prenom, u.nom, u.photo_profil_url, u.type_user,
    u.ecole, u.annee_etudes, u.filiere, u.bio,
    u.ville, u.ville_ecole, u.ville_entreprise,
    coalesce(u.identite_verifiee = 'verifiee', false)
  from public.users u
  where u.id = any (coalesce(p_ids, '{}'::uuid[]))
  limit 200;
$$;

revoke all on function public.profils_publics(uuid[]) from public, anon, authenticated;
grant execute on function public.profils_publics(uuid[]) to anon, authenticated;

-- 5. Identité du parrain à partir d'un jeton d'invitation, accessible sans connexion.

create or replace function public.parrain_par_jeton(p_jeton text)
returns table (id uuid, prenom text, nom text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.prenom, u.nom
  from public.users u
  where coalesce(p_jeton, '') <> ''
    and u.invitation_token = p_jeton
  limit 1;
$$;

revoke all on function public.parrain_par_jeton(text) from public, anon, authenticated;
grant execute on function public.parrain_par_jeton(text) to anon, authenticated;

-- 6. Rattachement du parrain pour une inscription Google ou Apple.
--    N'agit que si aucun parrain n'est encore enregistré. Rend vrai si le parrain est posé.

create or replace function public.rattacher_parrain(p_jeton text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_parrain uuid;
begin
  if v_uid is null then
    raise exception using
      errcode = '42501',
      message = 'Connexion requise.';
  end if;

  if coalesce(p_jeton, '') = '' then
    return false;
  end if;

  select u.id into v_parrain
  from public.users u
  where u.invitation_token = p_jeton;

  if v_parrain is null or v_parrain = v_uid then
    return false;
  end if;

  update public.users
  set parrain_id = v_parrain
  where id = v_uid
    and parrain_id is null;

  return found;
end;
$$;

revoke all on function public.rattacher_parrain(text) from public, anon, authenticated;
grant execute on function public.rattacher_parrain(text) to authenticated;

-- 7. Verrou d'écriture : parrain_id rejoint les colonnes réservées au serveur.
--    Corps identique à celui du 16/09, plus parrain_id en insertion et en modification.

create or replace function public.proteger_colonnes_sensibles_users()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false)
       or coalesce(new.identite_verifiee, 'non_verifiee') <> 'non_verifiee'
       or new.identite_verifiee_date is not null
       or new.stripe_identity_session_id is not null
       or new.doc_scolarite_statut is not null
       or new.doc_scolarite_motif_rejet is not null
       or new.doc_assurance_statut is not null
       or new.doc_assurance_motif_rejet is not null
       or new.doc_rib_statut is not null
       or new.doc_rib_motif_rejet is not null
       or new.doc_garant_id_statut is not null
       or new.doc_garant_id_motif_rejet is not null
       or new.doc_cautionnement_statut is not null
       or new.doc_cautionnement_motif_rejet is not null
       or new.parrain_id is not null
    then
      raise exception using
        errcode = '42501',
        message = 'Écriture refusée : colonne réservée au serveur.';
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin
     or new.identite_verifiee is distinct from old.identite_verifiee
     or new.identite_verifiee_date is distinct from old.identite_verifiee_date
     or new.stripe_identity_session_id is distinct from old.stripe_identity_session_id
     or new.doc_scolarite_statut is distinct from old.doc_scolarite_statut
     or new.doc_scolarite_motif_rejet is distinct from old.doc_scolarite_motif_rejet
     or new.doc_assurance_statut is distinct from old.doc_assurance_statut
     or new.doc_assurance_motif_rejet is distinct from old.doc_assurance_motif_rejet
     or new.doc_rib_statut is distinct from old.doc_rib_statut
     or new.doc_rib_motif_rejet is distinct from old.doc_rib_motif_rejet
     or new.doc_garant_id_statut is distinct from old.doc_garant_id_statut
     or new.doc_garant_id_motif_rejet is distinct from old.doc_garant_id_motif_rejet
     or new.doc_cautionnement_statut is distinct from old.doc_cautionnement_statut
     or new.doc_cautionnement_motif_rejet is distinct from old.doc_cautionnement_motif_rejet
     or new.parrain_id is distinct from old.parrain_id
  then
    raise exception using
      errcode = '42501',
      message = 'Écriture refusée : colonne réservée au serveur.';
  end if;
  return new;
end;
$function$;

-- 8. Création de la ligne users à l'inscription par email des parcours
--    propriétaire et « Proposer un logement ».
--    N'agit que si les métadonnées portent sterny_parcours = proprietaire ou partager.
--    Type déduit du parcours, email pris dans le compte d'authentification,
--    champs limités à une liste fermée, parrain retrouvé depuis le jeton.
--    Droits de son auteur : le rôle qui crée les comptes n'ignore pas les règles d'accès.
--    Une erreur ici fait échouer toute l'inscription.

create or replace function public.creer_profil_depuis_inscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_parcours text := m->>'sterny_parcours';
  v_type text;
  v_prenom text := left(nullif(btrim(m->>'prenom'), ''), 100);
  v_nom text := left(nullif(btrim(m->>'nom'), ''), 100);
  v_jeton text := nullif(btrim(m->>'jeton_invitation'), '');
  v_parrain uuid;
begin
  if v_parcours = 'proprietaire' then
    v_type := 'proprietaire';
  elsif v_parcours = 'partager' then
    v_type := 'hote';
  else
    return new;
  end if;

  if v_prenom is null or v_nom is null then
    raise exception using
      errcode = '22023',
      message = 'Inscription refusée : prénom et nom obligatoires.';
  end if;

  if v_jeton is not null then
    select u.id into v_parrain
    from public.users u
    where u.invitation_token = v_jeton;
  end if;

  insert into public.users (
    id, email, type_user, prenom, nom,
    telephone, ville, rythme_alternance, a_logement, parrain_id
  ) values (
    new.id,
    new.email,
    v_type,
    v_prenom,
    v_nom,
    left(nullif(btrim(m->>'telephone'), ''), 30),
    left(nullif(btrim(m->>'ville'), ''), 100),
    case when v_parcours = 'partager' then left(nullif(btrim(m->>'rythme'), ''), 50) end,
    v_parcours = 'partager',
    v_parrain
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.creer_profil_depuis_inscription() from public, anon, authenticated;

drop trigger if exists sterny_creer_profil_depuis_inscription on auth.users;
create trigger sterny_creer_profil_depuis_inscription
  after insert on auth.users
  for each row
  execute function public.creer_profil_depuis_inscription();
