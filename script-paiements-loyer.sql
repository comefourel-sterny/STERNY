-- ================================================================
-- SCRIPT SQL : SYSTÈME DE SUIVI DES PAIEMENTS DE LOYER STERNY
-- ================================================================
-- Date : 06/03/2026
-- Objectif : Table de suivi des paiements mensuels + extension des
--            notifications pour relancer le locataire et le garant
--            en cas d'impayé.
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE PAIEMENTS_LOYER
-- ----------------------------------------------------------------
-- Chaque ligne = 1 mois de loyer pour 1 contrat.
-- Le propriétaire signale un impayé → statut passe à 'impaye'
-- Le cron envoie les relances → statut passe à 'relance_envoyee'
-- Le proprio valide le paiement → statut passe à 'paye'

CREATE TABLE IF NOT EXISTS paiements_loyer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contrat concerné
    contrat_id UUID REFERENCES contrats(id) NOT NULL,

    -- Mois concerné (premier jour du mois, ex: '2026-03-01')
    mois DATE NOT NULL,

    -- Montant du loyer pour ce mois
    montant NUMERIC(10,2) NOT NULL,

    -- Statut du paiement
    statut TEXT NOT NULL DEFAULT 'attendu'
      CHECK (statut IN ('attendu', 'paye', 'impaye', 'relance_envoyee')),

    -- Date effective du paiement (null si pas encore payé)
    date_paiement TIMESTAMPTZ,

    -- Propriétaire qui a signalé l'impayé
    signale_par UUID REFERENCES users(id),

    -- Date du signalement
    date_signalement TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul enregistrement par mois par contrat
    UNIQUE(contrat_id, mois)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_paiements_contrat
ON paiements_loyer(contrat_id);

CREATE INDEX IF NOT EXISTS idx_paiements_statut
ON paiements_loyer(statut);

CREATE INDEX IF NOT EXISTS idx_paiements_mois
ON paiements_loyer(mois);

-- RLS (Row Level Security)
ALTER TABLE paiements_loyer ENABLE ROW LEVEL SECURITY;

-- Le propriétaire peut voir et modifier les paiements de ses contrats
CREATE POLICY "Proprio peut voir ses paiements"
ON paiements_loyer FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM contrats c
        WHERE c.id = paiements_loyer.contrat_id
        AND c.proprietaire_id = auth.uid()
    )
);

CREATE POLICY "Proprio peut signaler un impayé"
ON paiements_loyer FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM contrats c
        WHERE c.id = paiements_loyer.contrat_id
        AND c.proprietaire_id = auth.uid()
    )
);

CREATE POLICY "Proprio peut mettre à jour le statut"
ON paiements_loyer FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM contrats c
        WHERE c.id = paiements_loyer.contrat_id
        AND c.proprietaire_id = auth.uid()
    )
);

-- Le locataire peut voir ses propres paiements
CREATE POLICY "Locataire peut voir ses paiements"
ON paiements_loyer FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM contrats c
        WHERE c.id = paiements_loyer.contrat_id
        AND c.locataire_id = auth.uid()
    )
);

-- Le service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role accès total paiements"
ON paiements_loyer FOR ALL
USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- EXTENSION NOTIFICATIONS_ENVOYEES
-- ----------------------------------------------------------------
-- Ajouter une colonne 'mois' pour les relances mensuelles
-- (les rappels de bail n'ont pas besoin de mois)

ALTER TABLE notifications_envoyees
ADD COLUMN IF NOT EXISTS mois DATE;

-- Mettre à jour la contrainte de type pour inclure les relances
ALTER TABLE notifications_envoyees
DROP CONSTRAINT IF EXISTS notifications_envoyees_type_check;

ALTER TABLE notifications_envoyees
ADD CONSTRAINT notifications_envoyees_type_check
CHECK (type IN (
    'rappel_45j',
    'rappel_15j',
    'annonce_reactivee',
    'relance_impaye_locataire',
    'relance_impaye_proprietaire',
    'relance_impaye_garant'
));

-- Index unique pour éviter les doublons de relance par mois
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_relance_unique
ON notifications_envoyees(contrat_id, type, mois)
WHERE mois IS NOT NULL;

-- ----------------------------------------------------------------
-- VUES UTILES
-- ----------------------------------------------------------------

-- Vue : Impayés en cours avec infos complètes
CREATE OR REPLACE VIEW impayes_en_cours AS
SELECT
    p.id as paiement_id,
    p.contrat_id,
    p.mois,
    p.montant,
    p.statut,
    p.date_signalement,
    c.loyer_mensuel,
    c.date_debut,
    c.date_fin,
    loc.id as locataire_id,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    loc.email as locataire_email,
    loc.garant_prenom,
    loc.garant_nom,
    loc.garant_email,
    loc.garant_telephone,
    prop.id as proprietaire_id,
    prop.prenom as proprio_prenom,
    prop.nom as proprio_nom,
    prop.email as proprio_email,
    a.titre as annonce_titre,
    a.ville as annonce_ville,
    -- Vérifier si la relance a déjà été envoyée
    CASE
        WHEN EXISTS (
            SELECT 1 FROM notifications_envoyees n
            WHERE n.contrat_id = p.contrat_id
            AND n.type = 'relance_impaye_garant'
            AND n.mois = p.mois
        ) THEN true ELSE false
    END as relance_garant_envoyee
FROM paiements_loyer p
JOIN contrats c ON p.contrat_id = c.id
JOIN users loc ON c.locataire_id = loc.id
JOIN users prop ON c.proprietaire_id = prop.id
JOIN annonces a ON c.annonce_id = a.id
WHERE p.statut IN ('impaye', 'relance_envoyee')
ORDER BY p.mois DESC;

-- Vue : Historique des paiements par contrat
CREATE OR REPLACE VIEW historique_paiements AS
SELECT
    p.id as paiement_id,
    p.contrat_id,
    p.mois,
    p.montant,
    p.statut,
    p.date_paiement,
    p.date_signalement,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    a.titre as annonce_titre,
    a.ville as annonce_ville
FROM paiements_loyer p
JOIN contrats c ON p.contrat_id = c.id
JOIN users loc ON c.locataire_id = loc.id
JOIN annonces a ON c.annonce_id = a.id
ORDER BY p.mois DESC;

-- ================================================================
-- REQUÊTES UTILES POUR DEBUG
-- ================================================================

-- Voir tous les impayés en cours
-- SELECT * FROM impayes_en_cours;

-- Voir l'historique des paiements d'un contrat
-- SELECT * FROM historique_paiements WHERE contrat_id = '[UUID]';

-- Simuler un impayé pour tester
-- INSERT INTO paiements_loyer (contrat_id, mois, montant, statut, signale_par, date_signalement)
-- VALUES ('[CONTRAT_UUID]', '2026-03-01', 500, 'impaye', '[PROPRIO_UUID]', NOW());

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
