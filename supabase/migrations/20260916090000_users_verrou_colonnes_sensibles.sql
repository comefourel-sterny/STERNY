-- Verrou d'écriture des colonnes sensibles de public.users.
-- Origine : session du 16/09/2026, patch 4a suspendu. Les règles d'accès de users
-- laissent un utilisateur modifier toute colonne de sa propre ligne, dont is_admin
-- (lue par is_admin(), qui ouvre le bucket documents) et les statuts de vérification.
-- Ce déclencheur refuse ces écritures quand elles viennent d'un client (rôles anon et
-- authenticated). Le serveur (service_role) et les accès directs (postgres) restent libres.
-- Écriture rejouable : appliquée à la main sur les deux bases.

create or replace function public.proteger_colonnes_sensibles_users()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
  then
    raise exception using
      errcode = '42501',
      message = 'Écriture refusée : colonne réservée au serveur.';
  end if;
  return new;
end;
$$;

drop trigger if exists users_proteger_colonnes_sensibles on public.users;

create trigger users_proteger_colonnes_sensibles
  before insert or update on public.users
  for each row
  execute function public.proteger_colonnes_sensibles_users();
