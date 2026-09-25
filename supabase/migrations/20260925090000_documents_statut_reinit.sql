-- Remise à zéro du statut de vérification des documents, et cohérence statut / motif.
-- Origine : patch 4a-2, session du 25/09/2026.
--
-- 1. La fonction du verrou (définie le 16/09, redéfinie le 22/09) garde ses contrôles
--    réservés au client À L'IDENTIQUE. On y ajoute, APRÈS ces contrôles et pour tout
--    rôle, la remise à zéro : quand le chemin d'un document change (remplacement ou
--    retrait), son statut et son motif repassent à null. Placée après les contrôles,
--    elle n'est jamais vue par le verrou comme une écriture interdite du client.
--    Conséquence assumée : une écriture qui change un chemin ET pose un statut dans la
--    même requête perd le statut. Le serveur n'écrit jamais les deux ensemble.
-- 2. Une contrainte par document : statut null sans motif, 'verifie' sans motif, ou
--    'rejete' avec un motif non vide. « En cours » n'est jamais stocké. Écrite en CASE
--    pour ne jamais s'évaluer à NULL : une contrainte à NULL est considérée comme
--    respectée, ce qui laisserait passer un motif sans statut.
-- Écriture rejouable : appliquée à la main sur les deux bases.

create or replace function public.proteger_colonnes_sensibles_users()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- 1. Contrôles réservés au client, inchangés.
  if current_user in ('anon', 'authenticated') then
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
  end if;

  -- 2. Remise à zéro, pour tout rôle, quand le chemin d'un document change.
  if tg_op = 'UPDATE' then
    if new.doc_scolarite_url is distinct from old.doc_scolarite_url then
      new.doc_scolarite_statut := null;
      new.doc_scolarite_motif_rejet := null;
    end if;
    if new.doc_assurance_url is distinct from old.doc_assurance_url then
      new.doc_assurance_statut := null;
      new.doc_assurance_motif_rejet := null;
    end if;
    if new.doc_rib_url is distinct from old.doc_rib_url then
      new.doc_rib_statut := null;
      new.doc_rib_motif_rejet := null;
    end if;
    if new.doc_garant_id_url is distinct from old.doc_garant_id_url then
      new.doc_garant_id_statut := null;
      new.doc_garant_id_motif_rejet := null;
    end if;
    if new.doc_cautionnement_url is distinct from old.doc_cautionnement_url then
      new.doc_cautionnement_statut := null;
      new.doc_cautionnement_motif_rejet := null;
    end if;
  end if;

  return new;
end;
$$;

-- Le déclencheur users_proteger_colonnes_sensibles n'est pas recréé : il appelle déjà
-- cette fonction.

alter table public.users drop constraint if exists users_doc_scolarite_statut_coherent;
alter table public.users add constraint users_doc_scolarite_statut_coherent check (
  case
    when doc_scolarite_statut is null then doc_scolarite_motif_rejet is null
    when doc_scolarite_statut = 'verifie' then doc_scolarite_motif_rejet is null
    when doc_scolarite_statut = 'rejete' then length(trim(coalesce(doc_scolarite_motif_rejet, ''))) > 0
    else false
  end
);

alter table public.users drop constraint if exists users_doc_assurance_statut_coherent;
alter table public.users add constraint users_doc_assurance_statut_coherent check (
  case
    when doc_assurance_statut is null then doc_assurance_motif_rejet is null
    when doc_assurance_statut = 'verifie' then doc_assurance_motif_rejet is null
    when doc_assurance_statut = 'rejete' then length(trim(coalesce(doc_assurance_motif_rejet, ''))) > 0
    else false
  end
);

alter table public.users drop constraint if exists users_doc_rib_statut_coherent;
alter table public.users add constraint users_doc_rib_statut_coherent check (
  case
    when doc_rib_statut is null then doc_rib_motif_rejet is null
    when doc_rib_statut = 'verifie' then doc_rib_motif_rejet is null
    when doc_rib_statut = 'rejete' then length(trim(coalesce(doc_rib_motif_rejet, ''))) > 0
    else false
  end
);

alter table public.users drop constraint if exists users_doc_garant_id_statut_coherent;
alter table public.users add constraint users_doc_garant_id_statut_coherent check (
  case
    when doc_garant_id_statut is null then doc_garant_id_motif_rejet is null
    when doc_garant_id_statut = 'verifie' then doc_garant_id_motif_rejet is null
    when doc_garant_id_statut = 'rejete' then length(trim(coalesce(doc_garant_id_motif_rejet, ''))) > 0
    else false
  end
);

alter table public.users drop constraint if exists users_doc_cautionnement_statut_coherent;
alter table public.users add constraint users_doc_cautionnement_statut_coherent check (
  case
    when doc_cautionnement_statut is null then doc_cautionnement_motif_rejet is null
    when doc_cautionnement_statut = 'verifie' then doc_cautionnement_motif_rejet is null
    when doc_cautionnement_statut = 'rejete' then length(trim(coalesce(doc_cautionnement_motif_rejet, ''))) > 0
    else false
  end
);
