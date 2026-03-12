-- Table signalements : pour signaler une annonce ou un utilisateur
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS signalements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('annonce', 'utilisateur')),
    target_id UUID NOT NULL, -- ID de l'annonce ou de l'utilisateur signalé
    motif VARCHAR(50) NOT NULL,
    description TEXT,
    statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'traite', 'rejete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut créer un signalement
CREATE POLICY "signalements_insert" ON signalements
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- L'utilisateur peut voir ses propres signalements
CREATE POLICY "signalements_select_own" ON signalements
    FOR SELECT USING (auth.uid() = reporter_id);
