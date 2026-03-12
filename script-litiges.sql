-- ============================================================
-- STERNY — Table et RLS pour la gestion des litiges
-- ============================================================
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- Créer la table litiges
CREATE TABLE IF NOT EXISTS litiges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL,
    demandeur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mis_en_cause_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    annonce_id UUID,
    categorie TEXT NOT NULL CHECK (categorie IN (
        'logement_non_conforme',
        'equipement_defectueux',
        'nuisances',
        'probleme_paiement',
        'comportement',
        'securite',
        'autre'
    )),
    description TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN (
        'ouvert',
        'en_cours',
        'resolu',
        'ferme'
    )),
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_litiges_demandeur ON litiges(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_litiges_mis_en_cause ON litiges(mis_en_cause_id);
CREATE INDEX IF NOT EXISTS idx_litiges_statut ON litiges(statut);
CREATE INDEX IF NOT EXISTS idx_litiges_match ON litiges(match_id);

-- Activer RLS
ALTER TABLE litiges ENABLE ROW LEVEL SECURITY;

-- Les deux parties peuvent voir le litige
DROP POLICY IF EXISTS "litiges_select" ON litiges;
CREATE POLICY "litiges_select" ON litiges
  FOR SELECT USING (
    auth.uid() = demandeur_id OR auth.uid() = mis_en_cause_id
  );

-- Seul le demandeur peut créer un litige
DROP POLICY IF EXISTS "litiges_insert" ON litiges;
CREATE POLICY "litiges_insert" ON litiges
  FOR INSERT WITH CHECK (auth.uid() = demandeur_id);

-- Les deux parties peuvent mettre à jour (résolution)
DROP POLICY IF EXISTS "litiges_update" ON litiges;
CREATE POLICY "litiges_update" ON litiges
  FOR UPDATE USING (
    auth.uid() = demandeur_id OR auth.uid() = mis_en_cause_id
  );

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_litiges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_litiges_updated_at ON litiges;
CREATE TRIGGER trigger_litiges_updated_at
    BEFORE UPDATE ON litiges
    FOR EACH ROW
    EXECUTE FUNCTION update_litiges_updated_at();
