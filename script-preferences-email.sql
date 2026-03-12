-- ============================================================
-- STERNY — Préférences email (I5)
-- ============================================================
-- Ajoute une colonne JSONB `preferences_email` à la table `users`
-- avec des valeurs par défaut (tout activé)
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- Ajouter la colonne (ne fait rien si elle existe déjà)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferences_email JSONB DEFAULT '{
    "alertes": true,
    "messages": true,
    "candidatures": true,
    "paiements": true,
    "baux": true,
    "marketing": true
}'::jsonb;

-- Mettre à jour les utilisateurs existants qui n'ont pas encore de préférences
UPDATE public.users
SET preferences_email = '{
    "alertes": true,
    "messages": true,
    "candidatures": true,
    "paiements": true,
    "baux": true,
    "marketing": true
}'::jsonb
WHERE preferences_email IS NULL;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT id, email, preferences_email FROM public.users LIMIT 5;
