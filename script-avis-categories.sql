-- ============================================================
-- STERNY — Migration : ajout notes par catégorie dans avis
-- ============================================================
-- Ajoute 3 colonnes de notes optionnelles par catégorie.
-- Les catégories dépendent du type_user du profil évalué :
--   - Propriétaire/Hôte : communication, etat_logement, qualite_prix
--   - Locataire : communication, proprete, respect_logement
-- La colonne "note" reste la moyenne globale (calculée côté client).
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

-- Ajout des colonnes
ALTER TABLE public.avis
    ADD COLUMN IF NOT EXISTS note_communication INTEGER CHECK (note_communication >= 1 AND note_communication <= 5),
    ADD COLUMN IF NOT EXISTS note_categorie_2 INTEGER CHECK (note_categorie_2 >= 1 AND note_categorie_2 <= 5),
    ADD COLUMN IF NOT EXISTS note_categorie_3 INTEGER CHECK (note_categorie_3 >= 1 AND note_categorie_3 <= 5);

-- note_categorie_2 = "État du logement" (proprio) OU "Propreté" (locataire)
-- note_categorie_3 = "Rapport qualité-prix" (proprio) OU "Respect du logement" (locataire)

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT id, note, note_communication, note_categorie_2, note_categorie_3
-- FROM public.avis ORDER BY created_at DESC LIMIT 5;
