-- ============================================================
-- STERNY — Table avis + RLS Policies
-- ============================================================
-- Système d'avis entre utilisateurs après une location
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS public.avis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluateur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profil_evalue_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    annonce_id UUID REFERENCES public.annonces(id) ON DELETE SET NULL,
    note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
    commentaire TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Un utilisateur ne peut laisser qu'un seul avis par annonce pour un même profil
    UNIQUE(evaluateur_id, profil_evalue_id, annonce_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_avis_profil_evalue ON public.avis(profil_evalue_id);
CREATE INDEX IF NOT EXISTS idx_avis_evaluateur ON public.avis(evaluateur_id);

-- 2. Activer RLS
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS

-- Tout le monde peut lire les avis (publics)
CREATE POLICY "avis_select_all" ON public.avis
    FOR SELECT USING (true);

-- Un utilisateur connecté peut laisser un avis (pas pour lui-même)
CREATE POLICY "avis_insert_auth" ON public.avis
    FOR INSERT WITH CHECK (
        auth.uid() = evaluateur_id
        AND auth.uid() != profil_evalue_id
    );

-- Un utilisateur peut modifier ses propres avis
CREATE POLICY "avis_update_own" ON public.avis
    FOR UPDATE USING (auth.uid() = evaluateur_id);

-- Un utilisateur peut supprimer ses propres avis, l'admin peut tout supprimer
CREATE POLICY "avis_delete_own_or_admin" ON public.avis
    FOR DELETE USING (
        auth.uid() = evaluateur_id
        OR public.is_admin()
    );

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT * FROM public.avis ORDER BY created_at DESC LIMIT 5;
-- SELECT profil_evalue_id, AVG(note)::numeric(2,1) as moyenne, COUNT(*) as total
-- FROM public.avis GROUP BY profil_evalue_id;
