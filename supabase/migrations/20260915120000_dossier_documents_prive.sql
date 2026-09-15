-- Patch 4 /compte : socle de données du dossier (15/09/2026).
-- Migration rejouable : appliquée à la main sur la base locale et en production (db push impossible depuis une branche feat).

-- 1. Colonnes lues ou écrites par le code, absentes des deux bases.
alter table public.users add column if not exists doc_garant_id_url text;
alter table public.users add column if not exists doc_cautionnement_url text;
alter table public.users add column if not exists stripe_identity_session_id text;
alter table public.users add column if not exists identite_verifiee_date timestamptz;

-- 2. Bucket documents : privé, 5 Mo, PDF / JPEG / PNG. Absent des deux bases au 15/09/2026.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Suppression des accès ouverts à tout utilisateur connecté et de la lecture publique.
drop policy if exists "Lecture documents autorisée" on storage.objects;
drop policy if exists "Update documents autorisé" on storage.objects;
drop policy if exists "Upload documents autorisé" on storage.objects;
drop policy if exists "documents_select_public" on storage.objects;

-- 4. Accès réservé au propriétaire du fichier (nom préfixé par son identifiant) et à l'admin.
drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own" on storage.objects for select to public
  using (bucket_id = 'documents' and auth.uid() is not null and (name like (auth.uid()::text || '-%') or public.is_admin()));

drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own" on storage.objects for insert to public
  with check (bucket_id = 'documents' and auth.uid() is not null and (name like (auth.uid()::text || '-%') or public.is_admin()));

drop policy if exists "documents_update_own" on storage.objects;
create policy "documents_update_own" on storage.objects for update to public
  using (bucket_id = 'documents' and auth.uid() is not null and (name like (auth.uid()::text || '-%') or public.is_admin()))
  with check (bucket_id = 'documents' and auth.uid() is not null and (name like (auth.uid()::text || '-%') or public.is_admin()));

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own" on storage.objects for delete to public
  using (bucket_id = 'documents' and auth.uid() is not null and (name like (auth.uid()::text || '-%') or public.is_admin()));
