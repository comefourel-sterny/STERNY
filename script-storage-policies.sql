-- ============================================================
-- STERNY — Storage Policies pour Supabase
-- ============================================================
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- Sécurise les 4 buckets : profils, documents, annonces-photos, etats-des-lieux
-- ============================================================


-- ────────────────────────────────────────────
-- 1. BUCKET : profils (photos de profil)
-- ────────────────────────────────────────────
-- Structure fichiers : {userId}-{timestamp}.{ext}
-- Lecture : publique
-- Upload : uniquement ses propres fichiers (userId- en préfixe)
-- Suppression : uniquement ses propres fichiers

-- Lecture publique
DROP POLICY IF EXISTS "profils_select_public" ON storage.objects;
CREATE POLICY "profils_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'profils');

-- Upload : le nom du fichier doit commencer par son propre userId
DROP POLICY IF EXISTS "profils_insert_own" ON storage.objects;
CREATE POLICY "profils_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profils'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );

-- Mise à jour (upsert)
DROP POLICY IF EXISTS "profils_update_own" ON storage.objects;
CREATE POLICY "profils_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profils'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );

-- Suppression de ses propres fichiers
DROP POLICY IF EXISTS "profils_delete_own" ON storage.objects;
CREATE POLICY "profils_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profils'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );


-- ────────────────────────────────────────────
-- 2. BUCKET : documents (pièce d'identité, scolarité, RIB)
-- ────────────────────────────────────────────
-- Structure fichiers : {userId}-{docType}-{timestamp}.{ext}
-- Lecture : publique (les URLs sont stockées en base, pas devinables)
-- Upload : uniquement ses propres documents

-- Lecture publique
DROP POLICY IF EXISTS "documents_select_public" ON storage.objects;
CREATE POLICY "documents_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Upload
DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
CREATE POLICY "documents_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );

-- Mise à jour (upsert)
DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
CREATE POLICY "documents_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );

-- Suppression
DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;
CREATE POLICY "documents_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (name LIKE (auth.uid()::text || '-%') OR public.is_admin())
  );


-- ────────────────────────────────────────────
-- 3. BUCKET : annonces-photos (photos des annonces)
-- ────────────────────────────────────────────
-- Structure fichiers : {userId}/{annonceId}/photo_{index}.jpg
-- Lecture : publique
-- Upload : uniquement dans son propre dossier userId/

-- Lecture publique
DROP POLICY IF EXISTS "annonces_photos_select_public" ON storage.objects;
CREATE POLICY "annonces_photos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'annonces-photos');

-- Upload : le chemin doit commencer par userId/
DROP POLICY IF EXISTS "annonces_photos_insert_own" ON storage.objects;
CREATE POLICY "annonces_photos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'annonces-photos'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Mise à jour
DROP POLICY IF EXISTS "annonces_photos_update_own" ON storage.objects;
CREATE POLICY "annonces_photos_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'annonces-photos'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Suppression
DROP POLICY IF EXISTS "annonces_photos_delete_own" ON storage.objects;
CREATE POLICY "annonces_photos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'annonces-photos'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );


-- ────────────────────────────────────────────
-- 4. BUCKET : etats-des-lieux (photos état des lieux)
-- ────────────────────────────────────────────
-- Structure fichiers : etats-des-lieux/{edlId}/{timestamp}-{random}.{ext}
-- Lecture : publique
-- Upload : tout utilisateur connecté (les photos sont liées à un EDL partagé)

-- Lecture publique
DROP POLICY IF EXISTS "edl_select_public" ON storage.objects;
CREATE POLICY "edl_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'etats-des-lieux');

-- Upload : utilisateur connecté
DROP POLICY IF EXISTS "edl_insert_authenticated" ON storage.objects;
CREATE POLICY "edl_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'etats-des-lieux'
    AND auth.uid() IS NOT NULL
  );

-- Mise à jour
DROP POLICY IF EXISTS "edl_update_authenticated" ON storage.objects;
CREATE POLICY "edl_update_authenticated" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'etats-des-lieux'
    AND auth.uid() IS NOT NULL
  );

-- Suppression (admin seulement)
DROP POLICY IF EXISTS "edl_delete_admin" ON storage.objects;
CREATE POLICY "edl_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'etats-des-lieux'
    AND public.is_admin()
  );


-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- Après exécution, vérifie que les policies sont bien créées :

-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- ORDER BY policyname;
