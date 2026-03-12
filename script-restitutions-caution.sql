-- ============================================================
-- STERNY — Table et RLS pour la restitution des cautions
-- ============================================================
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- Créer la table restitutions_caution
CREATE TABLE IF NOT EXISTS restitutions_caution (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrat_id UUID NOT NULL,
    match_id UUID NOT NULL,
    proprietaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    montant_caution NUMERIC NOT NULL,          -- Montant total du dépôt de garantie
    montant_retenu NUMERIC DEFAULT 0,          -- Montant retenu (dégradations, impayés...)
    montant_restitue NUMERIC NOT NULL,         -- Montant effectivement restitué
    motif_retenue TEXT,                         -- Justification si retenue
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN (
        'en_attente',      -- Propriétaire a initié, locataire pas encore notifié
        'acceptee',        -- Locataire a accepté ou délai dépassé
        'contestee',       -- Locataire conteste
        'remboursee',      -- Remboursement effectué (Stripe)
        'annulee'          -- Annulée
    )),
    stripe_refund_id TEXT,                     -- ID du remboursement Stripe
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_restitutions_proprietaire ON restitutions_caution(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_restitutions_locataire ON restitutions_caution(locataire_id);
CREATE INDEX IF NOT EXISTS idx_restitutions_contrat ON restitutions_caution(contrat_id);
CREATE INDEX IF NOT EXISTS idx_restitutions_statut ON restitutions_caution(statut);

-- Activer RLS
ALTER TABLE restitutions_caution ENABLE ROW LEVEL SECURITY;

-- Les deux parties peuvent voir la restitution
DROP POLICY IF EXISTS "restitutions_select" ON restitutions_caution;
CREATE POLICY "restitutions_select" ON restitutions_caution
  FOR SELECT USING (
    auth.uid() = proprietaire_id OR auth.uid() = locataire_id
  );

-- Seul le propriétaire peut créer une restitution
DROP POLICY IF EXISTS "restitutions_insert" ON restitutions_caution;
CREATE POLICY "restitutions_insert" ON restitutions_caution
  FOR INSERT WITH CHECK (auth.uid() = proprietaire_id);

-- Les deux parties peuvent mettre à jour (acceptation/contestation)
DROP POLICY IF EXISTS "restitutions_update" ON restitutions_caution;
CREATE POLICY "restitutions_update" ON restitutions_caution
  FOR UPDATE USING (
    auth.uid() = proprietaire_id OR auth.uid() = locataire_id
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_restitutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restitutions_updated_at ON restitutions_caution;
CREATE TRIGGER trigger_restitutions_updated_at
    BEFORE UPDATE ON restitutions_caution
    FOR EACH ROW
    EXECUTE FUNCTION update_restitutions_updated_at();
