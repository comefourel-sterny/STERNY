-- ============================================================
-- STERNY — Table messages_contact (I6)
-- ============================================================
-- Stocke les messages envoyés via le formulaire de contact
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages_contact (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    sujet TEXT NOT NULL,
    message TEXT NOT NULL,
    statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'lu', 'traite')),
    user_id UUID REFERENCES auth.users(id),  -- NULL si visiteur non connecté
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS : seul l'admin peut lire, tout le monde peut insérer
ALTER TABLE public.messages_contact ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent (idempotent)
DROP POLICY IF EXISTS "messages_contact_insert_all" ON public.messages_contact;
DROP POLICY IF EXISTS "messages_contact_select_admin" ON public.messages_contact;
DROP POLICY IF EXISTS "messages_contact_update_admin" ON public.messages_contact;

-- Tout le monde peut soumettre un message (même non connecté via service role)
CREATE POLICY "messages_contact_insert_all" ON public.messages_contact
    FOR INSERT WITH CHECK (true);

-- Seul l'admin peut voir les messages
CREATE POLICY "messages_contact_select_admin" ON public.messages_contact
    FOR SELECT USING (public.is_admin());

-- Seul l'admin peut mettre à jour le statut
CREATE POLICY "messages_contact_update_admin" ON public.messages_contact
    FOR UPDATE USING (public.is_admin());

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT * FROM public.messages_contact ORDER BY created_at DESC LIMIT 5;
