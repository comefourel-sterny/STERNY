-- ================================================================
-- SCRIPT SQL : SYSTÈME D'ÉTAT DES LIEUX AUTONOME STERNY
-- ================================================================
-- Date : 05/03/2026
-- Objectif : Permettre un état des lieux d'entrée/sortie 100% autonome
--            avec signatures indépendantes locataire/propriétaire
-- Contexte : Chaque partie remplit et signe depuis sa propre session.
--            L'état des lieux n'est validé que quand les deux ont signé.
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE ETATS_DES_LIEUX
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS etats_des_lieux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Lien vers le contrat
    contrat_id UUID REFERENCES contrats(id) NOT NULL,
    candidature_id UUID REFERENCES candidatures(id) NOT NULL,

    -- Parties (dénormalisé pour faciliter les requêtes)
    locataire_id UUID REFERENCES users(id) NOT NULL,
    proprietaire_id UUID REFERENCES users(id) NOT NULL,
    annonce_id UUID REFERENCES annonces(id) NOT NULL,

    -- Type d'état des lieux
    type TEXT NOT NULL DEFAULT 'entree'
        CHECK (type IN ('entree', 'sortie')),

    -- Données de la checklist (JSONB)
    -- Format: { "salon": { "sol": "bon", "murs": "neuf", ... }, "cuisine": { ... } }
    checklist JSONB DEFAULT '{}'::jsonb,

    -- Relevés des compteurs (JSONB)
    -- Format: { "electricite": "12345", "gaz": "6789", "eau": "4567" }
    compteurs JSONB DEFAULT '{}'::jsonb,

    -- Photos (array d'URLs Supabase Storage)
    -- Format: ["https://...storage.../edl/xxx/photo1.jpg", ...]
    photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Observations générales (texte libre)
    observations TEXT DEFAULT '',

    -- Signature locataire
    signature_locataire BOOLEAN DEFAULT FALSE,
    date_signature_locataire TIMESTAMPTZ,

    -- Signature propriétaire
    signature_proprietaire BOOLEAN DEFAULT FALSE,
    date_signature_proprietaire TIMESTAMPTZ,

    -- Statut global
    statut TEXT DEFAULT 'en_cours'
        CHECK (statut IN (
            'en_cours',              -- Au moins une partie n'a pas encore signé
            'signe_locataire',       -- Seul le locataire a signé
            'signe_proprietaire',    -- Seul le propriétaire a signé
            'valide',                -- Les deux parties ont signé
            'conteste'               -- Une partie conteste (post-signature)
        )),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Un seul état des lieux par type par contrat
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_edl_per_type_per_contrat
ON etats_des_lieux(contrat_id, type);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_edl_contrat
ON etats_des_lieux(contrat_id);

CREATE INDEX IF NOT EXISTS idx_edl_candidature
ON etats_des_lieux(candidature_id);

CREATE INDEX IF NOT EXISTS idx_edl_locataire
ON etats_des_lieux(locataire_id);

CREATE INDEX IF NOT EXISTS idx_edl_proprietaire
ON etats_des_lieux(proprietaire_id);

CREATE INDEX IF NOT EXISTS idx_edl_statut
ON etats_des_lieux(statut);

-- Trigger pour updated_at (réutilise la fonction existante)
CREATE TRIGGER update_etats_des_lieux_updated_at
BEFORE UPDATE ON etats_des_lieux
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- STORAGE BUCKET POUR LES PHOTOS
-- ----------------------------------------------------------------
-- Créer un bucket "etats-des-lieux" dans Supabase Storage
-- via le Dashboard > Storage > New bucket
--
-- Nom : etats-des-lieux
-- Public : false (les photos ne sont accessibles qu'aux parties)
--
-- Structure des fichiers :
-- etats-des-lieux/{edl_id}/{photo_1.jpg}
-- etats-des-lieux/{edl_id}/{photo_2.jpg}
-- ...
--
-- Policy RLS recommandée (à créer dans le Dashboard Storage) :
-- INSERT : auth.uid() = locataire_id OR auth.uid() = proprietaire_id
-- SELECT : auth.uid() = locataire_id OR auth.uid() = proprietaire_id

-- ----------------------------------------------------------------
-- RLS (Row Level Security)
-- ----------------------------------------------------------------

ALTER TABLE etats_des_lieux ENABLE ROW LEVEL SECURITY;

-- Lecture : seules les parties du contrat peuvent voir l'état des lieux
CREATE POLICY "edl_select_parties" ON etats_des_lieux
FOR SELECT USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
);

-- Insertion : seules les parties peuvent créer un état des lieux
CREATE POLICY "edl_insert_parties" ON etats_des_lieux
FOR INSERT WITH CHECK (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
);

-- Mise à jour : seules les parties peuvent modifier
-- (la logique applicative gère qui peut modifier quoi)
CREATE POLICY "edl_update_parties" ON etats_des_lieux
FOR UPDATE USING (
    auth.uid() = locataire_id OR auth.uid() = proprietaire_id
);

-- ================================================================

-- ----------------------------------------------------------------
-- VUES UTILES
-- ----------------------------------------------------------------

-- Vue : États des lieux avec infos complètes
CREATE OR REPLACE VIEW vue_etats_des_lieux AS
SELECT
    edl.id,
    edl.type,
    edl.statut,
    edl.signature_locataire,
    edl.date_signature_locataire,
    edl.signature_proprietaire,
    edl.date_signature_proprietaire,
    edl.created_at,
    edl.updated_at,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    loc.email as locataire_email,
    prop.prenom as proprietaire_prenom,
    prop.nom as proprietaire_nom,
    prop.email as proprietaire_email,
    a.titre as annonce_titre,
    a.ville as annonce_ville,
    c.date_debut as contrat_debut,
    c.date_fin as contrat_fin
FROM etats_des_lieux edl
JOIN users loc ON edl.locataire_id = loc.id
JOIN users prop ON edl.proprietaire_id = prop.id
JOIN annonces a ON edl.annonce_id = a.id
JOIN contrats c ON edl.contrat_id = c.id
ORDER BY edl.created_at DESC;

-- Vue : États des lieux en attente de signature
CREATE OR REPLACE VIEW edl_en_attente AS
SELECT
    edl.*,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    prop.prenom as proprietaire_prenom,
    prop.nom as proprietaire_nom,
    a.titre as annonce_titre,
    a.ville as annonce_ville
FROM etats_des_lieux edl
JOIN users loc ON edl.locataire_id = loc.id
JOIN users prop ON edl.proprietaire_id = prop.id
JOIN annonces a ON edl.annonce_id = a.id
WHERE edl.statut IN ('en_cours', 'signe_locataire', 'signe_proprietaire');

-- ================================================================

-- ----------------------------------------------------------------
-- REQUÊTES UTILES POUR DEBUG
-- ----------------------------------------------------------------

-- Voir tous les états des lieux
-- SELECT * FROM vue_etats_des_lieux;

-- Voir les états des lieux en attente
-- SELECT * FROM edl_en_attente;

-- Voir un état des lieux spécifique avec ses données
-- SELECT id, type, statut, checklist, compteurs, observations,
--        array_length(photos_urls, 1) as nb_photos,
--        signature_locataire, signature_proprietaire
-- FROM etats_des_lieux
-- WHERE contrat_id = '[UUID_CONTRAT]';

-- ================================================================

-- ----------------------------------------------------------------
-- CLEANUP (si besoin de réinitialiser)
-- ----------------------------------------------------------------

-- ATTENTION : Ces commandes suppriment les données !
-- Ne pas exécuter en production sans backup !

-- DROP TABLE IF EXISTS etats_des_lieux CASCADE;
-- DROP VIEW IF EXISTS vue_etats_des_lieux CASCADE;
-- DROP VIEW IF EXISTS edl_en_attente CASCADE;

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
