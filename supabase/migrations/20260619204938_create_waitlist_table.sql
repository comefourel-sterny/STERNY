-- Table waitlist : inscriptions de la page d'attente (visiteurs non connectés).
-- Appliquee en prod le 2026-06-19 via editeur SQL (db push impossible depuis feat ; pattern conv 72).
-- Reversible : rollback = drop table public.waitlist;

create table public.waitlist (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null unique,
  created_at      timestamptz not null default now(),
  consentement_at timestamptz   -- RGPD : NULL tant qu'un consentement explicite (valide DPO) n'est pas capte
);

alter table public.waitlist enable row level security;

create policy "waitlist_insert_public"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

create policy "waitlist_select_admin"
  on public.waitlist for select
  to authenticated
  using (is_admin());

create policy "waitlist_delete_admin"
  on public.waitlist for delete
  to authenticated
  using (is_admin());

grant insert on public.waitlist to anon, authenticated;
grant select, delete on public.waitlist to authenticated;
