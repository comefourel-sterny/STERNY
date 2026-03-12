-- ================================================================
-- SCRIPT SQL : SYSTÈME DE NOTIFICATIONS AUTOMATIQUES STERNY
-- ================================================================
-- Date : 04/03/2026
-- Objectif : Table anti-doublon pour les emails de fin de bail
--            + configuration du cron quotidien
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE NOTIFICATIONS_ENVOYEES
-- ----------------------------------------------------------------
-- Empêche l'envoi en double des emails de rappel.
-- Chaque combinaison (contrat_id, type) est unique.

CREATE TABLE IF NOT EXISTS notifications_envoyees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contrat concerné
    contrat_id UUID REFERENCES contrats(id) NOT NULL,

    -- Type de notification
    type TEXT NOT NULL CHECK (type IN (
        'rappel_45j',         -- Premier rappel (45 jours avant fin)
        'rappel_15j',         -- Rappel urgent (15 jours avant fin)
        'annonce_reactivee'   -- Annonce remise en ligne automatiquement
    )),

    -- Destinataires (pour audit)
    locataire_email TEXT,
    proprietaire_email TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul envoi par type par contrat
    UNIQUE(contrat_id, type)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notif_contrat
ON notifications_envoyees(contrat_id);

CREATE INDEX IF NOT EXISTS idx_notif_type
ON notifications_envoyees(type);

CREATE INDEX IF NOT EXISTS idx_notif_created
ON notifications_envoyees(created_at);

-- ================================================================

-- ----------------------------------------------------------------
-- CRON QUOTIDIEN (pg_cron + pg_net)
-- ----------------------------------------------------------------
-- Ce cron appelle la Edge Function check-baux-expirants tous les
-- jours à 8h UTC (≈ 9h/10h heure de Paris selon été/hiver).
--
-- PRÉREQUIS :
-- 1. Extension pg_cron activée (Supabase Pro plan)
-- 2. Extension pg_net activée
-- 3. Edge Function "check-baux-expirants" déployée
--
-- Si vous êtes sur Supabase Free Plan, utilisez un service
-- externe comme cron-job.org pour appeler l'URL :
-- https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/check-baux-expirants
-- ----------------------------------------------------------------

-- Décommenter les lignes ci-dessous si pg_cron est disponible :

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- SELECT cron.schedule(
--   'check-baux-expirants-daily',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/check-baux-expirants',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ================================================================

-- ----------------------------------------------------------------
-- ALTERNATIVE : Cron externe (Free Plan)
-- ----------------------------------------------------------------
-- Si pg_cron n'est pas disponible, configurez un appel HTTP
-- quotidien vers cette URL (via cron-job.org, Render cron, etc.) :
--
-- URL  : https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/check-baux-expirants
-- Méthode : POST
-- Headers :
--   Content-Type: application/json
--   Authorization: Bearer <SUPABASE_ANON_KEY ou SERVICE_ROLE_KEY>
-- Body : {}
-- Fréquence : Tous les jours à 08:00 UTC
--
-- Services gratuits recommandés :
-- - https://cron-job.org (gratuit, fiable)
-- - https://www.easycron.com (gratuit jusqu'à 1 tâche)
-- - GitHub Actions (cron dans un workflow)

-- ================================================================

-- ----------------------------------------------------------------
-- VUES UTILES
-- ----------------------------------------------------------------

-- Vue : Historique des notifications envoyées
CREATE OR REPLACE VIEW historique_notifications AS
SELECT
    n.id,
    n.type,
    n.locataire_email,
    n.proprietaire_email,
    n.created_at as date_envoi,
    c.date_fin as fin_bail,
    a.titre as annonce_titre,
    a.ville as annonce_ville
FROM notifications_envoyees n
JOIN contrats c ON n.contrat_id = c.id
JOIN annonces a ON c.annonce_id = a.id
ORDER BY n.created_at DESC;

-- Vue : Contrats bientôt expirés (pour monitoring manuel)
CREATE OR REPLACE VIEW baux_expirants AS
SELECT
    c.id as contrat_id,
    c.date_fin,
    c.date_fin - CURRENT_DATE as jours_restants,
    c.loyer_mensuel,
    loc.prenom as locataire_prenom,
    loc.nom as locataire_nom,
    loc.email as locataire_email,
    prop.prenom as proprio_prenom,
    prop.email as proprio_email,
    a.titre as annonce_titre,
    a.ville as annonce_ville,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM renouvellements r
            WHERE r.contrat_original_id = c.id
            AND r.statut IN ('demande_locataire', 'acceptee', 'contrat_genere')
        ) THEN 'renouvellement_en_cours'
        ELSE 'pas_de_renouvellement'
    END as statut_renouvellement,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM notifications_envoyees n
            WHERE n.contrat_id = c.id AND n.type = 'rappel_45j'
        ) THEN true ELSE false
    END as rappel_45j_envoye,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM notifications_envoyees n
            WHERE n.contrat_id = c.id AND n.type = 'rappel_15j'
        ) THEN true ELSE false
    END as rappel_15j_envoye
FROM contrats c
JOIN users loc ON c.locataire_id = loc.id
JOIN users prop ON c.proprietaire_id = prop.id
JOIN annonces a ON c.annonce_id = a.id
WHERE c.statut = 'signe'
AND c.date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY c.date_fin ASC;

-- ================================================================

-- ----------------------------------------------------------------
-- REQUÊTES UTILES POUR DEBUG
-- ----------------------------------------------------------------

-- Voir toutes les notifications envoyées
-- SELECT * FROM historique_notifications;

-- Voir les baux qui expirent bientôt
-- SELECT * FROM baux_expirants;

-- Voir les contrats sans rappel envoyé (à traiter)
-- SELECT * FROM baux_expirants
-- WHERE rappel_45j_envoye = false
-- AND jours_restants <= 45;

-- Supprimer un rappel pour re-tester
-- DELETE FROM notifications_envoyees
-- WHERE contrat_id = '[UUID]' AND type = 'rappel_45j';

-- ================================================================

-- ----------------------------------------------------------------
-- CLEANUP (si besoin de réinitialiser)
-- ----------------------------------------------------------------

-- ATTENTION : Supprime les données !
-- DROP TABLE IF EXISTS notifications_envoyees CASCADE;
-- DROP VIEW IF EXISTS historique_notifications CASCADE;
-- DROP VIEW IF EXISTS baux_expirants CASCADE;
-- SELECT cron.unschedule('check-baux-expirants-daily');

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
