-- =====================================================
-- MIGRATION : Sous-location STERNY + colonnes Stripe SEPA
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. COLONNES STRIPE SUR LA TABLE CONTRATS
--    (nécessaires pour le prélèvement SEPA automatique)
-- ─────────────────────────────────────────────────────

ALTER TABLE contrats ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS sepa_mandate_active BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────
-- 2. COLONNES STRIPE SUR LA TABLE PAIEMENTS_LOYER
--    (pour le suivi des paiements automatiques)
-- ─────────────────────────────────────────────────────

ALTER TABLE paiements_loyer ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE paiements_loyer ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- ─────────────────────────────────────────────────────
-- 3. APPROBATION PROPRIÉTAIRE SUR LES CANDIDATURES
--    Le propriétaire approuve/rejette les profils locataires
--    après que l'hôte a accepté la candidature
-- ─────────────────────────────────────────────────────

-- Statut d'approbation du propriétaire
-- null = pas encore soumis, 'en_attente' = soumis au proprio,
-- 'approuve' = proprio OK, 'rejete' = proprio refuse
ALTER TABLE candidatures ADD COLUMN IF NOT EXISTS approbation_proprietaire TEXT DEFAULT NULL;

-- Date d'approbation/rejet
ALTER TABLE candidatures ADD COLUMN IF NOT EXISTS date_approbation_proprietaire TIMESTAMPTZ DEFAULT NULL;

-- ID du propriétaire qui a approuvé (pour traçabilité)
ALTER TABLE candidatures ADD COLUMN IF NOT EXISTS proprietaire_id UUID DEFAULT NULL;

-- ─────────────────────────────────────────────────────
-- 4. RÔLE HÔTE SUR LES CONTRATS
--    Dans le modèle sous-location, le contrat lie le
--    locataire temporaire à l'hôte alternant (pas au proprio)
-- ─────────────────────────────────────────────────────

-- L'hôte alternant qui sous-loue son logement
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS hote_id UUID DEFAULT NULL;

-- ─────────────────────────────────────────────────────
-- 5. INDEX POUR PERFORMANCE
-- ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_candidatures_approbation
    ON candidatures(approbation_proprietaire)
    WHERE approbation_proprietaire IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contrats_hote
    ON contrats(hote_id)
    WHERE hote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contrats_stripe_sub
    ON contrats(stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

-- ─────────────────────────────────────────────────────
-- 6. VÉRIFICATION
-- ─────────────────────────────────────────────────────

-- Vérifier que les colonnes existent
DO $$
BEGIN
    RAISE NOTICE 'Migration sous-location terminée avec succès !';
    RAISE NOTICE 'Colonnes ajoutées :';
    RAISE NOTICE '  contrats: stripe_customer_id, stripe_subscription_id, stripe_payment_method_id, sepa_mandate_active, hote_id';
    RAISE NOTICE '  paiements_loyer: stripe_payment_intent_id, stripe_invoice_id';
    RAISE NOTICE '  candidatures: approbation_proprietaire, date_approbation_proprietaire, proprietaire_id';
END
$$;
