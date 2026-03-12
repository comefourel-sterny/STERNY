-- ================================================================
-- SCRIPT SQL : SYSTÈME DE RENOUVELLEMENT DE BAIL STERNY
-- ================================================================
-- Date : 04/03/2026
-- Objectif : Permettre aux locataires de demander un renouvellement
--            de bail avec accord du propriétaire
-- Contexte : Bail meublé étudiant (art. 25-7 loi du 6 juillet 1989)
--            9 mois max, pas de reconduction tacite
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE RENOUVELLEMENTS
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS renouvellements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Lien vers le contrat original à renouveler
    contrat_original_id UUID REFERENCES contrats(id) NOT NULL,

    -- Parties (dénormalisé pour faciliter les requêtes)
    locataire_id UUID REFERENCES users(id) NOT NULL,
    proprietaire_id UUID REFERENCES users(id) NOT NULL,
    annonce_id UUID REFERENCES annonces(id) NOT NULL,

    -- Conditions du renouvellement
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    loyer_mensuel NUMERIC(10,2) NOT NULL,

    -- Statut du workflow
    statut TEXT DEFAULT 'demande_locataire'
        CHECK (statut IN (
            'demande_locataire',  -- Locataire a envoyé sa demande
            'acceptee',           -- Propriétaire a accepté
            'refusee',            -- Propriétaire a refusé
            'contrat_genere',     -- Nouveau contrat créé
            'annulee'             -- Annulée par le locataire
        )),

    -- Référence vers le NOUVEAU contrat (une fois généré)
    nouveau_contrat_id UUID REFERENCES contrats(id),

    -- Messages
    message_locataire TEXT,       -- Message optionnel du locataire
    motif_refus TEXT,             -- Motif optionnel en cas de refus

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    date_reponse TIMESTAMPTZ      -- Date de réponse du propriétaire
);

-- Contrainte : durée max 9 mois (274 jours)
ALTER TABLE renouvellements
ADD CONSTRAINT check_duree_max_9_mois
CHECK (date_fin - date_debut <= 274);

-- Un seul renouvellement en cours par contrat
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_renewal
ON renouvellements(contrat_original_id)
WHERE statut IN ('demande_locataire', 'acceptee');

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_renouvellements_contrat
ON renouvellements(contrat_original_id);

CREATE INDEX IF NOT EXISTS idx_renouvellements_locataire
ON renouvellements(locataire_id);

CREATE INDEX IF NOT EXISTS idx_renouvellements_proprietaire
ON renouvellements(proprietaire_id);

CREATE INDEX IF NOT EXISTS idx_renouvellements_statut
ON renouvellements(statut);

-- Trigger pour updated_at (réutilise la fonction existante de script-parrainage.sql)
CREATE TRIGGER update_renouvellements_updated_at
BEFORE UPDATE ON renouvellements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- COLONNES SUPPLÉMENTAIRES SUR CONTRATS
-- ----------------------------------------------------------------

-- Tracer la filiation des contrats (contrat original → renouvellement)
ALTER TABLE contrats
ADD COLUMN IF NOT EXISTS contrat_parent_id UUID REFERENCES contrats(id);

-- Marquer les contrats issus d'un renouvellement
ALTER TABLE contrats
ADD COLUMN IF NOT EXISTS est_renouvellement BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------------------
-- COLONNES SUPPLÉMENTAIRES SUR CANDIDATURES
-- ----------------------------------------------------------------

-- Marquer les candidatures "virtuelles" créées pour les renouvellements
ALTER TABLE candidatures
ADD COLUMN IF NOT EXISTS est_renouvellement BOOLEAN DEFAULT FALSE;

ALTER TABLE candidatures
ADD COLUMN IF NOT EXISTS renouvellement_id UUID REFERENCES renouvellements(id);

-- ================================================================

-- ----------------------------------------------------------------
-- VUES UTILES
-- ----------------------------------------------------------------

-- Vue : Renouvellements en attente pour un propriétaire
CREATE OR REPLACE VIEW renouvellements_en_attente AS
SELECT
    r.id as renouvellement_id,
    r.contrat_original_id,
    r.date_debut as nouvelle_date_debut,
    r.date_fin as nouvelle_date_fin,
    r.loyer_mensuel as nouveau_loyer,
    r.message_locataire,
    r.created_at as date_demande,
    loc.id as locataire_id,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    loc.email as locataire_email,
    prop.id as proprietaire_id,
    a.titre as annonce_titre,
    a.ville as annonce_ville,
    c.date_debut as ancien_date_debut,
    c.date_fin as ancien_date_fin,
    c.loyer_mensuel as ancien_loyer
FROM renouvellements r
JOIN users loc ON r.locataire_id = loc.id
JOIN users prop ON r.proprietaire_id = prop.id
JOIN contrats c ON r.contrat_original_id = c.id
JOIN annonces a ON r.annonce_id = a.id
WHERE r.statut = 'demande_locataire';

-- Vue : Historique des renouvellements par contrat
CREATE OR REPLACE VIEW historique_renouvellements AS
SELECT
    r.*,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    a.titre as annonce_titre,
    a.ville as annonce_ville
FROM renouvellements r
JOIN users loc ON r.locataire_id = loc.id
JOIN annonces a ON r.annonce_id = a.id
ORDER BY r.created_at DESC;

-- ================================================================

-- ----------------------------------------------------------------
-- REQUÊTES UTILES POUR DEBUG
-- ----------------------------------------------------------------

-- Voir tous les renouvellements en attente
-- SELECT * FROM renouvellements_en_attente;

-- Voir l'historique des renouvellements d'un contrat
-- SELECT * FROM historique_renouvellements
-- WHERE contrat_original_id = '[UUID_CONTRAT]';

-- Chaîne de renouvellements (contrat original → renouvellement 1 → renouvellement 2...)
-- WITH RECURSIVE chaine AS (
--     SELECT id, contrat_parent_id, date_debut, date_fin, 1 as niveau
--     FROM contrats WHERE id = '[UUID_CONTRAT_ORIGINAL]'
--     UNION ALL
--     SELECT c.id, c.contrat_parent_id, c.date_debut, c.date_fin, ch.niveau + 1
--     FROM contrats c
--     JOIN chaine ch ON c.contrat_parent_id = ch.id
-- )
-- SELECT * FROM chaine ORDER BY niveau;

-- ================================================================

-- ----------------------------------------------------------------
-- CLEANUP (si besoin de réinitialiser)
-- ----------------------------------------------------------------

-- ATTENTION : Ces commandes suppriment les données !
-- Ne pas exécuter en production sans backup !

-- DROP TABLE IF EXISTS renouvellements CASCADE;
-- DROP VIEW IF EXISTS renouvellements_en_attente CASCADE;
-- DROP VIEW IF EXISTS historique_renouvellements CASCADE;
-- ALTER TABLE contrats DROP COLUMN IF EXISTS contrat_parent_id;
-- ALTER TABLE contrats DROP COLUMN IF EXISTS est_renouvellement;
-- ALTER TABLE candidatures DROP COLUMN IF EXISTS est_renouvellement;
-- ALTER TABLE candidatures DROP COLUMN IF EXISTS renouvellement_id;

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
