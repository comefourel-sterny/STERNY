-- ============================================================
-- STERNY — Script RLS (Row Level Security) pour Supabase
-- ============================================================
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ATTENTION : Ce script ACTIVE la RLS et SUPPRIME les anciennes policies
-- Teste d'abord sur un environnement de dev !
-- ============================================================

-- ────────────────────────────────────────────
-- 1. TABLE : users (profils utilisateurs)
-- ────────────────────────────────────────────
-- Chacun voit/modifie son propre profil
-- Tout le monde peut lire les profils (pour affichage propriétaire, etc.)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);
  -- Les profils sont lisibles par tous (nom, prénom, photo pour matchs/annonces)

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_delete_own" ON users;
CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);


-- ────────────────────────────────────────────
-- 2. TABLE : annonces
-- ────────────────────────────────────────────
-- Visibles par tous (recherche publique)
-- Modifiables/supprimables uniquement par le propriétaire

ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "annonces_select_all" ON annonces;
CREATE POLICY "annonces_select_all" ON annonces
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "annonces_insert_owner" ON annonces;
CREATE POLICY "annonces_insert_owner" ON annonces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "annonces_update_owner" ON annonces;
CREATE POLICY "annonces_update_owner" ON annonces
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "annonces_delete_owner" ON annonces;
CREATE POLICY "annonces_delete_owner" ON annonces
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────
-- 3. TABLE : candidatures
-- ────────────────────────────────────────────
-- Le locataire voit/crée ses candidatures
-- Le propriétaire de l'annonce voit les candidatures sur ses annonces

ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidatures_select" ON candidatures;
CREATE POLICY "candidatures_select" ON candidatures
  FOR SELECT USING (
    auth.uid() = locataire_id
    OR auth.uid() IN (
      SELECT user_id FROM annonces WHERE id = candidatures.annonce_id
    )
  );

DROP POLICY IF EXISTS "candidatures_insert_locataire" ON candidatures;
CREATE POLICY "candidatures_insert_locataire" ON candidatures
  FOR INSERT WITH CHECK (auth.uid() = locataire_id);

DROP POLICY IF EXISTS "candidatures_update" ON candidatures;
CREATE POLICY "candidatures_update" ON candidatures
  FOR UPDATE USING (
    auth.uid() = locataire_id
    OR auth.uid() IN (
      SELECT user_id FROM annonces WHERE id = candidatures.annonce_id
    )
  );

DROP POLICY IF EXISTS "candidatures_delete_locataire" ON candidatures;
CREATE POLICY "candidatures_delete_locataire" ON candidatures
  FOR DELETE USING (auth.uid() = locataire_id);


-- ────────────────────────────────────────────
-- 4. TABLE : messages
-- ────────────────────────────────────────────
-- Seuls l'expéditeur et le destinataire voient les messages

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    auth.uid() = expediteur_id OR auth.uid() = destinataire_id
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = expediteur_id);

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (auth.uid() = expediteur_id);


-- ────────────────────────────────────────────
-- 5. TABLE : alertes
-- ────────────────────────────────────────────
-- Chacun gère ses propres alertes

ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertes_select_own" ON alertes;
CREATE POLICY "alertes_select_own" ON alertes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertes_insert_own" ON alertes;
CREATE POLICY "alertes_insert_own" ON alertes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertes_update_own" ON alertes;
CREATE POLICY "alertes_update_own" ON alertes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertes_delete_own" ON alertes;
CREATE POLICY "alertes_delete_own" ON alertes
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────
-- 6. TABLE : favoris
-- ────────────────────────────────────────────
-- Chacun gère ses propres favoris

ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favoris_select_own" ON favoris;
CREATE POLICY "favoris_select_own" ON favoris
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favoris_insert_own" ON favoris;
CREATE POLICY "favoris_insert_own" ON favoris
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favoris_delete_own" ON favoris;
CREATE POLICY "favoris_delete_own" ON favoris
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────
-- 7. TABLE : contrats
-- ────────────────────────────────────────────
-- Visibles par le locataire et le propriétaire du contrat

ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrats_select" ON contrats;
CREATE POLICY "contrats_select" ON contrats
  FOR SELECT USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "contrats_insert" ON contrats;
CREATE POLICY "contrats_insert" ON contrats
  FOR INSERT WITH CHECK (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "contrats_update" ON contrats;
CREATE POLICY "contrats_update" ON contrats
  FOR UPDATE USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );


-- ────────────────────────────────────────────
-- 8. TABLE : mises_en_relation
-- ────────────────────────────────────────────
-- Visibles uniquement par l'utilisateur qui a créé la demande (user_id)
-- (pas de colonne locataire_id dans cette table)

ALTER TABLE mises_en_relation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mises_en_relation_select" ON mises_en_relation;
CREATE POLICY "mises_en_relation_select" ON mises_en_relation
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mises_en_relation_insert" ON mises_en_relation;
CREATE POLICY "mises_en_relation_insert" ON mises_en_relation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mises_en_relation_update" ON mises_en_relation;
CREATE POLICY "mises_en_relation_update" ON mises_en_relation
  FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────
-- 9. TABLE : documents
-- (Table documents supprimée — n'existe pas dans la base)


-- ────────────────────────────────────────────
-- 9. TABLE : etats_des_lieux
-- ────────────────────────────────────────────
-- Visibles par le locataire et le propriétaire concernés

ALTER TABLE etats_des_lieux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edl_select" ON etats_des_lieux;
CREATE POLICY "edl_select" ON etats_des_lieux
  FOR SELECT USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "edl_insert" ON etats_des_lieux;
CREATE POLICY "edl_insert" ON etats_des_lieux
  FOR INSERT WITH CHECK (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "edl_update" ON etats_des_lieux;
CREATE POLICY "edl_update" ON etats_des_lieux
  FOR UPDATE USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );


-- ────────────────────────────────────────────
-- 11. TABLE : paiements_loyer
-- ────────────────────────────────────────────
-- Pas de locataire_id/proprietaire_id dans cette table
-- On passe par contrat_id → contrats pour vérifier les droits

ALTER TABLE paiements_loyer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paiements_select" ON paiements_loyer;
CREATE POLICY "paiements_select" ON paiements_loyer
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contrats
      WHERE contrats.id = paiements_loyer.contrat_id
      AND (contrats.locataire_id = auth.uid() OR contrats.proprietaire_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "paiements_insert" ON paiements_loyer;
CREATE POLICY "paiements_insert" ON paiements_loyer
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contrats
      WHERE contrats.id = paiements_loyer.contrat_id
      AND (contrats.locataire_id = auth.uid() OR contrats.proprietaire_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "paiements_update" ON paiements_loyer;
CREATE POLICY "paiements_update" ON paiements_loyer
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contrats
      WHERE contrats.id = paiements_loyer.contrat_id
      AND (contrats.locataire_id = auth.uid() OR contrats.proprietaire_id = auth.uid())
    )
  );


-- ────────────────────────────────────────────
-- 12. TABLE : renouvellements
-- ────────────────────────────────────────────
-- Visibles par les deux parties

ALTER TABLE renouvellements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "renouvellements_select" ON renouvellements;
CREATE POLICY "renouvellements_select" ON renouvellements
  FOR SELECT USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "renouvellements_insert" ON renouvellements;
CREATE POLICY "renouvellements_insert" ON renouvellements
  FOR INSERT WITH CHECK (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );

DROP POLICY IF EXISTS "renouvellements_update" ON renouvellements;
CREATE POLICY "renouvellements_update" ON renouvellements
  FOR UPDATE USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
  );


-- (Tables avis et profils supprimées — n'existent pas dans la base)


-- ────────────────────────────────────────────
-- 14. TABLE : signatures_audit
-- ────────────────────────────────────────────
-- Lecture seule pour les parties concernées

ALTER TABLE signatures_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signatures_select" ON signatures_audit;
CREATE POLICY "signatures_select" ON signatures_audit
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "signatures_insert" ON signatures_audit;
CREATE POLICY "signatures_insert" ON signatures_audit
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- STORAGE : Policies pour les buckets de fichiers
-- ============================================================
-- Si tu utilises Supabase Storage pour les photos/documents,
-- ajoute aussi des policies sur les buckets.
-- Exemple pour un bucket "photos" :

-- DROP POLICY IF EXISTS "photos_select_all" ON storage.objects;
-- CREATE POLICY "photos_select_all" ON storage.objects
--   FOR SELECT USING (bucket_id = 'photos');

-- DROP POLICY IF EXISTS "photos_insert_own" ON storage.objects;
-- CREATE POLICY "photos_insert_own" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DROP POLICY IF EXISTS "photos_delete_own" ON storage.objects;
-- CREATE POLICY "photos_delete_own" ON storage.objects
--   FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- 16. ADMIN : accès complet en lecture (is_admin = true)
-- ============================================================
-- L'administrateur (come@sterny.co) peut voir TOUTES les données
-- pour naviguer librement sur la plateforme et corriger les pages.
-- On utilise une fonction helper pour vérifier is_admin.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- Admin SELECT sur toutes les tables protégées
DROP POLICY IF EXISTS "admin_select_all" ON candidatures;
CREATE POLICY "admin_select_all" ON candidatures
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON messages;
CREATE POLICY "admin_select_all" ON messages
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON contrats;
CREATE POLICY "admin_select_all" ON contrats
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON mises_en_relation;
CREATE POLICY "admin_select_all" ON mises_en_relation
  FOR SELECT USING (public.is_admin());

-- (documents supprimée — table inexistante)

DROP POLICY IF EXISTS "admin_select_all" ON etats_des_lieux;
CREATE POLICY "admin_select_all" ON etats_des_lieux
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON paiements_loyer;
CREATE POLICY "admin_select_all" ON paiements_loyer
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON renouvellements;
CREATE POLICY "admin_select_all" ON renouvellements
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON alertes;
CREATE POLICY "admin_select_all" ON alertes
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON favoris;
CREATE POLICY "admin_select_all" ON favoris
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_all" ON signatures_audit;
CREATE POLICY "admin_select_all" ON signatures_audit
  FOR SELECT USING (public.is_admin());

-- (restitutions_caution supprimée — table inexistante)


-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- Après exécution, vérifie que la RLS est bien activée :

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Toutes les tables devraient avoir rowsecurity = true
