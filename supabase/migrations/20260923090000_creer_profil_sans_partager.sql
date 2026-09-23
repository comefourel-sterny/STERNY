-- Retrait du parcours « Proposer un logement » du déclencheur d'inscription : DETTE #181.
-- La page /inscription/partager est supprimée (76cc888). Seul InscriptionProprietairePage
-- envoie sterny_parcours, avec la valeur 'proprietaire' ; main ne l'envoie jamais.
-- rythme_alternance et a_logement quittent l'insertion : pour un propriétaire, la fonction
-- y écrivait NULL et false, qui sont leurs valeurs par défaut (vérifiées le 23/09/2026).
-- Le déclencheur sterny_creer_profil_depuis_inscription n'est pas recréé : create or replace
-- conserve son lien avec la fonction.
-- Rejouable. Aucun begin ni commit dans ce fichier : en local, psql --single-transaction ;
-- en production, éditeur SQL.

-- Création de la ligne users à l'inscription par email du parcours propriétaire.
-- N'agit que si les métadonnées portent sterny_parcours = proprietaire.
-- Email pris dans le compte d'authentification, champs limités à une liste fermée,
-- parrain retrouvé depuis le jeton.
-- Droits de son auteur : le rôle qui crée les comptes n'ignore pas les règles d'accès.
-- Une erreur ici fait échouer toute l'inscription.

create or replace function public.creer_profil_depuis_inscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_prenom text := left(nullif(btrim(m->>'prenom'), ''), 100);
  v_nom text := left(nullif(btrim(m->>'nom'), ''), 100);
  v_jeton text := nullif(btrim(m->>'jeton_invitation'), '');
  v_parrain uuid;
begin
  if (m->>'sterny_parcours') is distinct from 'proprietaire' then
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
    telephone, ville, parrain_id
  ) values (
    new.id,
    new.email,
    'proprietaire',
    v_prenom,
    v_nom,
    left(nullif(btrim(m->>'telephone'), ''), 30),
    left(nullif(btrim(m->>'ville'), ''), 100),
    v_parrain
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.creer_profil_depuis_inscription() from public, anon, authenticated;
