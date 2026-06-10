-- DETTE #14 fix. Appliqué manuellement en prod via Dashboard SQL Editor (pas de db push : migrations désynchro, DETTE #15). CREATE OR REPLACE idempotent.
CREATE OR REPLACE FUNCTION public.trigger_notif_candidature() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_annonce_titre TEXT;
    v_destinataire_id UUID;
    v_locataire_prenom TEXT;
BEGIN
    SELECT a.titre, a.user_id INTO v_annonce_titre, v_destinataire_id
    FROM public.annonces a WHERE a.id = NEW.annonce_id;

    SELECT u.prenom INTO v_locataire_prenom
    FROM public.users u WHERE u.id = NEW.locataire_id;

    PERFORM public.creer_notification_in_app(
        v_destinataire_id,
        'candidature_recue',
        'Nouvelle candidature',
        v_locataire_prenom || ' a candidaté pour « ' || v_annonce_titre || ' »',
        '/dashboard'
    );
    RETURN NEW;
END;
$$;
