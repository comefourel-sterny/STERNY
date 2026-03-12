-- ============================================================
-- STERNY — Table notifications_in_app (R6)
-- ============================================================
-- Centre de notifications in-app (cloche dans la nav)
-- À exécuter dans : Dashboard Supabase > SQL Editor > New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications_in_app (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'candidature_recue',
        'candidature_acceptee',
        'candidature_refusee',
        'match_cree',
        'contrat_signe',
        'paiement_recu',
        'paiement_confirme',
        'avis_recu',
        'message_recu',
        'annonce_expiree',
        'identite_verifiee',
        'systeme'
    )),
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    lien TEXT,
    lu BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notif_app_user ON public.notifications_in_app(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_app_unread ON public.notifications_in_app(user_id) WHERE lu = false;

-- RLS
ALTER TABLE public.notifications_in_app ENABLE ROW LEVEL SECURITY;

-- Lecture : ses propres notifications uniquement
CREATE POLICY "notif_app_select_own" ON public.notifications_in_app
    FOR SELECT USING (auth.uid() = user_id);

-- Mise à jour : marquer comme lu ses propres notifications
CREATE POLICY "notif_app_update_own" ON public.notifications_in_app
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Suppression de ses propres notifications
CREATE POLICY "notif_app_delete_own" ON public.notifications_in_app
    FOR DELETE USING (auth.uid() = user_id);

-- Admin : tout voir/modifier
CREATE POLICY "notif_app_admin_all" ON public.notifications_in_app
    FOR ALL USING (public.is_admin());

-- Insertion : via service_role OU par l'utilisateur authentifié (pour les déclencheurs client-side)
CREATE POLICY "notif_app_insert_auth" ON public.notifications_in_app
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- FONCTION : Créer une notification (appelable depuis triggers/Edge Functions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.creer_notification_in_app(
    p_user_id UUID,
    p_type TEXT,
    p_titre TEXT,
    p_message TEXT,
    p_lien TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.notifications_in_app (user_id, type, titre, message, lien)
    VALUES (p_user_id, p_type, p_titre, p_message, p_lien)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

-- ============================================================
-- TRIGGERS AUTOMATIQUES : Créer des notifications sur certains événements
-- ============================================================

-- Quand une candidature est créée → notifier le propriétaire
CREATE OR REPLACE FUNCTION public.trigger_notif_candidature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_annonce_titre TEXT;
    v_proprietaire_id UUID;
    v_locataire_prenom TEXT;
BEGIN
    SELECT a.titre, a.proprietaire_id INTO v_annonce_titre, v_proprietaire_id
    FROM public.annonces a WHERE a.id = NEW.annonce_id;

    SELECT u.prenom INTO v_locataire_prenom
    FROM public.users u WHERE u.id = NEW.locataire_id;

    PERFORM public.creer_notification_in_app(
        v_proprietaire_id,
        'candidature_recue',
        'Nouvelle candidature',
        v_locataire_prenom || ' a candidaté pour « ' || v_annonce_titre || ' »',
        'dashboard-proprietaire.html'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_candidature ON public.candidatures;
CREATE TRIGGER trg_notif_candidature
    AFTER INSERT ON public.candidatures
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notif_candidature();

-- Quand un avis est laissé → notifier la personne évaluée
CREATE OR REPLACE FUNCTION public.trigger_notif_avis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evaluateur_prenom TEXT;
BEGIN
    SELECT u.prenom INTO v_evaluateur_prenom
    FROM public.users u WHERE u.id = NEW.evaluateur_id;

    PERFORM public.creer_notification_in_app(
        NEW.profil_evalue_id,
        'avis_recu',
        'Nouvel avis reçu',
        v_evaluateur_prenom || ' t''a laissé un avis (' || NEW.note || '/5)',
        'profil.html?user_id=' || NEW.profil_evalue_id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_avis ON public.avis;
CREATE TRIGGER trg_notif_avis
    AFTER INSERT ON public.avis
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notif_avis();

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT * FROM public.notifications_in_app WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10;
-- SELECT COUNT(*) FROM public.notifications_in_app WHERE user_id = auth.uid() AND lu = false;
