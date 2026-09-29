-- Relations infalsifiables : DETTE #177, phase A bis, lot 1.
-- Conception validée le 29/09/2026 (ETAT, entrée du 29/09 suite 2), avec deux décisions
-- du même jour : le parcours de renouvellement cesse de fonctionner dans le navigateur
-- (repris avec le lot 2) ; la clé étrangère de annonces.user_id bloque la suppression
-- d'un compte qui a encore une annonce.
-- Rejouable : chaque objet est supprimé s'il existe, ou remplacé.
-- Aucun begin ni commit dans ce fichier : en local, psql --single-transaction ;
-- en production, éditeur SQL. Le contrôle final (section 7) annule tout en cas d'écart.
-- Hors périmètre : signatures, statuts des contrats et des renouvellements,
-- règles en double (lot 2).
-- Les déclencheurs s'exécutent avec les droits de l'appelant, comme le verrou de users :
-- ils laissent passer tout ce qui ne vient pas du navigateur (fonctions serveur,
-- éditeur SQL), et lisent les autres tables sous les règles d'accès de l'utilisateur.
-- Une ligne invisible pour lui vaut donc refus.

-- 1. Suppression des huit règles ouvertes.

drop policy if exists "Insertion annonces" on public.annonces;
drop policy if exists "Candidatures lisibles par les utilisateurs authentifiés" on public.candidatures;
drop policy if exists "Candidatures visibles par tous" on public.candidatures;
drop policy if exists "Candidatures modifiables par les utilisateurs authentifiés" on public.candidatures;
drop policy if exists "Propriétaire peut modifier le statut" on public.candidatures;
drop policy if exists "Contrats insérables par les utilisateurs authentifiés" on public.contrats;
drop policy if exists "Contrats lisibles par les utilisateurs authentifiés" on public.contrats;
drop policy if exists "Contrats modifiables par les utilisateurs authentifiés" on public.contrats;

-- 2. Lecture par le parrainage (cas e) : candidatures acceptées sur l'annonce
--    d'un hôte lié au lecteur par parrainage, dans un sens ou dans l'autre.
--    Droits de son auteur : la règle ne doit pas dépendre des règles de users.

create or replace function public.auteur_annonce_lie_par_parrainage(p_annonce_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and p_annonce_id is not null
    and exists (
      select 1
      from public.annonces a
      join public.users h on h.id = a.user_id
      where a.id = p_annonce_id
        and h.id <> auth.uid()
        and (
          h.parrain_id = auth.uid()
          or h.id = (select l.parrain_id from public.users l where l.id = auth.uid())
        )
    ),
    false
  );
$$;

revoke all on function public.auteur_annonce_lie_par_parrainage(uuid) from public, anon, authenticated;
grant execute on function public.auteur_annonce_lie_par_parrainage(uuid) to authenticated;

drop policy if exists candidatures_lecture_parrainage on public.candidatures;
create policy candidatures_lecture_parrainage on public.candidatures
  for select to authenticated
  using (statut = 'acceptee' and public.auteur_annonce_lie_par_parrainage(annonce_id));

-- 3. Candidatures : création en attente seulement ; locataire, annonce et champs de
--    renouvellement figés ; statut décidé par l'auteur de l'annonce seul.

create or replace function public.proteger_relations_candidatures()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_auteur uuid;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.statut is distinct from 'en_attente' then
      raise exception using
        errcode = '42501',
        message = 'Écriture refusée : une candidature est créée en attente.';
    end if;
    return new;
  end if;

  if new.locataire_id is distinct from old.locataire_id
     or new.annonce_id is distinct from old.annonce_id
     or new.est_renouvellement is distinct from old.est_renouvellement
     or new.renouvellement_id is distinct from old.renouvellement_id
  then
    raise exception using
      errcode = '42501',
      message = 'Écriture refusée : locataire, annonce et renouvellement d''une candidature ne changent pas.';
  end if;

  if new.statut is distinct from old.statut then
    select a.user_id into v_auteur
    from public.annonces a
    where a.id = old.annonce_id;

    if v_auteur is null or v_auteur is distinct from auth.uid() then
      raise exception using
        errcode = '42501',
        message = 'Écriture refusée : seul l''auteur de l''annonce décide d''une candidature.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_relations_candidatures() from public, anon, authenticated;

drop trigger if exists sterny_proteger_relations_candidatures on public.candidatures;
create trigger sterny_proteger_relations_candidatures
  before insert or update on public.candidatures
  for each row
  execute function public.proteger_relations_candidatures();

-- 4. Contrats : création liée à une candidature acceptée (même locataire, même annonce,
--    propriétaire égal à l'auteur de l'annonce), par l'une de ces deux personnes ;
--    parties, annonce et candidature figées ensuite.

create or replace function public.proteger_relations_contrats()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_locataire uuid;
  v_annonce uuid;
  v_statut text;
  v_auteur uuid;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select ca.locataire_id, ca.annonce_id, ca.statut, a.user_id
      into v_locataire, v_annonce, v_statut, v_auteur
    from public.candidatures ca
    join public.annonces a on a.id = ca.annonce_id
    where ca.id = new.candidature_id;

    if v_locataire is null
       or v_statut is distinct from 'acceptee'
       or new.locataire_id is distinct from v_locataire
       or new.annonce_id is distinct from v_annonce
       or new.proprietaire_id is distinct from v_auteur
       or auth.uid() is null
       or (auth.uid() is distinct from v_locataire and auth.uid() is distinct from v_auteur)
    then
      raise exception using
        errcode = '42501',
        message = 'Écriture refusée : un contrat reprend une candidature acceptée, par l''une de ses deux parties.';
    end if;
    return new;
  end if;

  if new.locataire_id is distinct from old.locataire_id
     or new.proprietaire_id is distinct from old.proprietaire_id
     or new.annonce_id is distinct from old.annonce_id
     or new.candidature_id is distinct from old.candidature_id
  then
    raise exception using
      errcode = '42501',
      message = 'Écriture refusée : parties, annonce et candidature d''un contrat ne changent pas.';
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_relations_contrats() from public, anon, authenticated;

drop trigger if exists sterny_proteger_relations_contrats on public.contrats;
create trigger sterny_proteger_relations_contrats
  before insert or update on public.contrats
  for each row
  execute function public.proteger_relations_contrats();

-- 5. Renouvellements : création par le locataire du contrat d'origine seulement,
--    parties et annonce identiques à ce contrat ; figées ensuite.

create or replace function public.proteger_relations_renouvellements()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_locataire uuid;
  v_proprietaire uuid;
  v_annonce uuid;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select c.locataire_id, c.proprietaire_id, c.annonce_id
      into v_locataire, v_proprietaire, v_annonce
    from public.contrats c
    where c.id = new.contrat_original_id;

    if v_locataire is null
       or auth.uid() is null
       or auth.uid() is distinct from v_locataire
       or new.locataire_id is distinct from v_locataire
       or new.proprietaire_id is distinct from v_proprietaire
       or new.annonce_id is distinct from v_annonce
    then
      raise exception using
        errcode = '42501',
        message = 'Écriture refusée : un renouvellement est demandé par le locataire du contrat d''origine, avec les mêmes parties et la même annonce.';
    end if;
    return new;
  end if;

  if new.contrat_original_id is distinct from old.contrat_original_id
     or new.locataire_id is distinct from old.locataire_id
     or new.proprietaire_id is distinct from old.proprietaire_id
     or new.annonce_id is distinct from old.annonce_id
  then
    raise exception using
      errcode = '42501',
      message = 'Écriture refusée : contrat d''origine, parties et annonce d''un renouvellement ne changent pas.';
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_relations_renouvellements() from public, anon, authenticated;

drop trigger if exists sterny_proteger_relations_renouvellements on public.renouvellements;
create trigger sterny_proteger_relations_renouvellements
  before insert or update on public.renouvellements
  for each row
  execute function public.proteger_relations_renouvellements();

-- 6. Une annonce appartient à un compte existant. Suppression du compte bloquée
--    tant qu'une annonce existe (comportement par défaut, comme contrats et renouvellements).

alter table public.annonces drop constraint if exists annonces_user_id_fkey;
alter table public.annonces
  add constraint annonces_user_id_fkey
  foreign key (user_id) references public.users (id);

-- 7. Contrôle final : aucune règle à condition vraie hors lecture des annonces,
--    et 25 règles sur les quatre tables. Toute différence annule la migration entière.

do $$
declare
  v_ouvertes integer;
  v_total integer;
begin
  select count(*) into v_ouvertes
  from pg_policies
  where schemaname = 'public'
    and tablename in ('annonces', 'candidatures', 'contrats', 'renouvellements')
    and not (tablename = 'annonces' and cmd = 'SELECT')
    and (qual = 'true' or with_check = 'true');

  select count(*) into v_total
  from pg_policies
  where schemaname = 'public'
    and tablename in ('annonces', 'candidatures', 'contrats', 'renouvellements');

  if v_ouvertes <> 0 or v_total <> 25 then
    raise exception 'Contrôle final en échec : % règle(s) ouverte(s), % règles au total (25 attendues).', v_ouvertes, v_total;
  end if;
end;
$$;
