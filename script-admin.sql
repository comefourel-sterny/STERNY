-- ============================================================
-- STERNY — Configuration Admin
-- ============================================================
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Ajouter la colonne is_admin à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Créer une policy pour que les admins puissent tout voir
-- (en complément des policies existantes)

-- Admin peut lire toutes les candidatures
DROP POLICY IF EXISTS "admin_candidatures_select" ON candidatures;
CREATE POLICY "admin_candidatures_select" ON candidatures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut lire tous les messages
DROP POLICY IF EXISTS "admin_messages_select" ON messages;
CREATE POLICY "admin_messages_select" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut lire tous les contrats
DROP POLICY IF EXISTS "admin_contrats_select" ON contrats;
CREATE POLICY "admin_contrats_select" ON contrats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut lire/modifier tous les signalements
DROP POLICY IF EXISTS "admin_signalements_select" ON signalements;
CREATE POLICY "admin_signalements_select" ON signalements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_signalements_update" ON signalements;
CREATE POLICY "admin_signalements_update" ON signalements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut lire/modifier tous les litiges
DROP POLICY IF EXISTS "admin_litiges_select" ON litiges;
CREATE POLICY "admin_litiges_select" ON litiges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_litiges_update" ON litiges;
CREATE POLICY "admin_litiges_update" ON litiges
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut lire toutes les restitutions
DROP POLICY IF EXISTS "admin_restitutions_select" ON restitutions_caution;
CREATE POLICY "admin_restitutions_select" ON restitutions_caution
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin peut modifier les utilisateurs (bannir, etc.)
DROP POLICY IF EXISTS "admin_users_update" ON users;
CREATE POLICY "admin_users_update" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Pour définir un utilisateur comme admin (à exécuter manuellement) :
-- UPDATE users SET is_admin = true WHERE email = 'votre-email@sterny.fr';

-- 4. Vue statistiques pour le dashboard admin
CREATE OR REPLACE VIEW admin_stats AS
SELECT
    (SELECT count(*) FROM users) AS total_users,
    (SELECT count(*) FROM users WHERE type_user = 'locataire') AS total_locataires,
    (SELECT count(*) FROM users WHERE type_user = 'proprietaire') AS total_proprietaires,
    (SELECT count(*) FROM annonces) AS total_annonces,
    (SELECT count(*) FROM annonces WHERE statut = 'active') AS annonces_actives,
    (SELECT count(*) FROM candidatures) AS total_candidatures,
    (SELECT count(*) FROM candidatures WHERE statut = 'en_attente') AS candidatures_en_attente,
    (SELECT count(*) FROM candidatures WHERE statut = 'acceptee') AS candidatures_acceptees,
    (SELECT count(*) FROM contrats) AS total_contrats,
    (SELECT count(*) FROM messages) AS total_messages;

-- Policy pour la vue stats (admin seulement)
-- Note: les vues héritent des policies des tables sous-jacentes
-- Mais on peut aussi créer une function sécurisée :
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Vérifier que l'utilisateur est admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;

    SELECT json_build_object(
        'total_users', (SELECT count(*) FROM users),
        'total_locataires', (SELECT count(*) FROM users WHERE type_user = 'locataire'),
        'total_proprietaires', (SELECT count(*) FROM users WHERE type_user = 'proprietaire'),
        'total_annonces', (SELECT count(*) FROM annonces),
        'annonces_actives', (SELECT count(*) FROM annonces WHERE statut = 'active'),
        'total_candidatures', (SELECT count(*) FROM candidatures),
        'candidatures_en_attente', (SELECT count(*) FROM candidatures WHERE statut = 'en_attente'),
        'candidatures_acceptees', (SELECT count(*) FROM candidatures WHERE statut = 'acceptee'),
        'total_contrats', (SELECT count(*) FROM contrats),
        'total_messages', (SELECT count(*) FROM messages)
    ) INTO result;

    RETURN result;
END;
$$;
