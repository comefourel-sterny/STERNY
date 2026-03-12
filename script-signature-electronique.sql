-- ============================================================
-- STERNY — Renforcement des signatures électroniques
-- Art. 1367 Code civil + Règlement eIDAS (UE 910/2014)
-- ============================================================
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CONTRATS : colonnes de preuve de signature
-- ============================================================

-- Preuve locataire
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_ip TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_user_agent TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_hash TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_email TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_nom_complet TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_locataire_consentement TEXT;

-- Preuve propriétaire
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_ip TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_user_agent TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_hash TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_email TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_nom_complet TEXT;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS signature_proprietaire_consentement TEXT;

-- Hash du contrat complet (contenu figé au moment de la création)
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS contrat_hash TEXT;


-- 2. ETATS_DES_LIEUX : colonnes de preuve de signature
-- ============================================================

-- Preuve locataire
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_ip TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_user_agent TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_hash TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_email TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_nom_complet TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_locataire_consentement TEXT;

-- Preuve propriétaire
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_ip TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_user_agent TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_hash TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_email TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_nom_complet TEXT;
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS signature_proprietaire_consentement TEXT;

-- Hash du document EDL complet
ALTER TABLE etats_des_lieux ADD COLUMN IF NOT EXISTS document_hash TEXT;


-- 3. TABLE D'AUDIT : journal immuable de chaque signature
-- ============================================================

CREATE TABLE IF NOT EXISTS signatures_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Référence au document signé
    document_type TEXT NOT NULL CHECK (document_type IN ('contrat', 'etat_des_lieux')),
    document_id UUID NOT NULL,

    -- Identité du signataire
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    user_nom_complet TEXT NOT NULL,
    role_signataire TEXT NOT NULL CHECK (role_signataire IN ('locataire', 'proprietaire')),

    -- Preuve technique
    ip_address TEXT,
    user_agent TEXT,
    document_hash TEXT NOT NULL,

    -- Consentement
    consentement_texte TEXT NOT NULL,

    -- Métadonnées
    metadata JSONB DEFAULT '{}'
);

-- RLS : seules les parties concernées + admin peuvent lire
ALTER TABLE signatures_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture propres signatures" ON signatures_audit
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insertion signature authentifiée" ON signatures_audit
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_signatures_audit_document
    ON signatures_audit(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_audit_user
    ON signatures_audit(user_id);
