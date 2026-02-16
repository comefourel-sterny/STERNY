-- ================================================================
-- SCRIPT SQL : SYSTÈME DE PARRAINAGE EASWAP
-- ================================================================
-- Date : 11/02/2026
-- Objectif : Permettre aux hôtes de parrainer des propriétaires
-- ================================================================

-- ----------------------------------------------------------------
-- OPTION A : Ajouter champ parrain_id dans table users (SIMPLE)
-- ----------------------------------------------------------------

-- Vérifier si le champ existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'parrain_id'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN parrain_id UUID REFERENCES users(id);
        
        RAISE NOTICE 'Colonne parrain_id ajoutée à la table users';
    ELSE
        RAISE NOTICE 'Colonne parrain_id existe déjà';
    END IF;
END $$;

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_users_parrain 
ON users(parrain_id);

-- Vérifier/créer champ code_parrainage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'code_parrainage'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN code_parrainage VARCHAR(20) UNIQUE;
        
        RAISE NOTICE 'Colonne code_parrainage ajoutée à la table users';
    ELSE
        RAISE NOTICE 'Colonne code_parrainage existe déjà';
    END IF;
END $$;

-- ================================================================

-- ----------------------------------------------------------------
-- OPTION B : Table dédiée parrainages (PROPRE, RECOMMANDÉ)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parrainages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Qui a parrainé (l'hôte)
    parrain_id UUID REFERENCES users(id) NOT NULL,
    
    -- Qui a été parrainé (le propriétaire)
    filleul_id UUID REFERENCES users(id) NOT NULL,
    
    -- Code utilisé lors de l'inscription
    code_utilise VARCHAR(20),
    
    -- Métadonnées
    date_parrainage TIMESTAMPTZ DEFAULT NOW(),
    statut TEXT DEFAULT 'actif', -- actif, utilise, expire, annule
    
    -- Contraintes
    UNIQUE(filleul_id), -- Un filleul ne peut être parrainé qu'une seule fois
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_parrainages_parrain 
ON parrainages(parrain_id);

CREATE INDEX IF NOT EXISTS idx_parrainages_filleul 
ON parrainages(filleul_id);

CREATE INDEX IF NOT EXISTS idx_parrainages_code 
ON parrainages(code_utilise);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour parrainages
CREATE TRIGGER update_parrainages_updated_at 
BEFORE UPDATE ON parrainages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================

-- ----------------------------------------------------------------
-- VUES UTILES (BONUS)
-- ----------------------------------------------------------------

-- Vue : Statistiques de parrainage par hôte
CREATE OR REPLACE VIEW stats_parrainages AS
SELECT 
    u.id as hote_id,
    u.prenom,
    u.nom,
    u.code_parrainage,
    COUNT(p.id) as nombre_parrainages,
    COUNT(CASE WHEN p.statut = 'actif' THEN 1 END) as parrainages_actifs,
    MIN(p.date_parrainage) as premier_parrainage,
    MAX(p.date_parrainage) as dernier_parrainage
FROM users u
LEFT JOIN parrainages p ON u.id = p.parrain_id
WHERE u.type_user = 'hote'
GROUP BY u.id, u.prenom, u.nom, u.code_parrainage;

-- Vue : Propriétaires parrainés avec info du parrain
CREATE OR REPLACE VIEW proprietaires_parraines AS
SELECT 
    filleul.id as proprio_id,
    filleul.prenom as proprio_prenom,
    filleul.nom as proprio_nom,
    filleul.email as proprio_email,
    parrain.id as hote_id,
    parrain.prenom as hote_prenom,
    parrain.nom as hote_nom,
    parrain.email as hote_email,
    p.code_utilise,
    p.date_parrainage,
    p.statut
FROM parrainages p
JOIN users filleul ON p.filleul_id = filleul.id
JOIN users parrain ON p.parrain_id = parrain.id
WHERE filleul.type_user = 'proprietaire'
AND parrain.type_user = 'hote';

-- ================================================================

-- ----------------------------------------------------------------
-- DONNÉES DE TEST (OPTIONNEL - pour tester le système)
-- ----------------------------------------------------------------

-- Créer un parrainage test (remplacer les IDs par de vrais IDs)
-- INSERT INTO parrainages (parrain_id, filleul_id, code_utilise)
-- VALUES (
--     '[UUID_HOTE_SOPHIE]',
--     '[UUID_PROPRIO_MARIE]',
--     'SOPHI-K4N7'
-- );

-- Vérifier que ça fonctionne
-- SELECT * FROM proprietaires_parraines;

-- ================================================================

-- ----------------------------------------------------------------
-- REQUÊTES UTILES POUR DEBUG
-- ----------------------------------------------------------------

-- Voir tous les parrainages
-- SELECT * FROM parrainages ORDER BY date_parrainage DESC;

-- Voir statistiques par hôte
-- SELECT * FROM stats_parrainages ORDER BY nombre_parrainages DESC;

-- Vérifier si un propriétaire a été parrainé
-- SELECT p.*, u.prenom, u.nom 
-- FROM parrainages p
-- JOIN users u ON p.parrain_id = u.id
-- WHERE p.filleul_id = '[UUID_PROPRIO]';

-- Voir tous les propriétaires parrainés par un hôte
-- SELECT * FROM proprietaires_parraines 
-- WHERE hote_id = '[UUID_HOTE]';

-- ================================================================

-- ----------------------------------------------------------------
-- CLEANUP (si besoin de réinitialiser)
-- ----------------------------------------------------------------

-- ATTENTION : Ces commandes suppriment les données !
-- Ne pas exécuter en production sans backup !

-- DROP TABLE IF EXISTS parrainages CASCADE;
-- DROP VIEW IF EXISTS stats_parrainages CASCADE;
-- DROP VIEW IF EXISTS proprietaires_parraines CASCADE;
-- ALTER TABLE users DROP COLUMN IF EXISTS parrain_id CASCADE;
-- ALTER TABLE users DROP COLUMN IF EXISTS code_parrainage CASCADE;

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================

-- Notes d'implémentation :
-- 1. Si vous utilisez Option A (champ parrain_id) : Exécuter uniquement la section Option A
-- 2. Si vous utilisez Option B (table parrainages) : Exécuter Option A ET Option B
-- 3. Les vues sont optionnelles mais utiles pour l'analytics
-- 4. Pensez à adapter les requêtes JS dans le code si vous choisissez Option B

-- Recommandation : Option B (table dédiée) pour plus de flexibilité future
