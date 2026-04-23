


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."creer_notification_in_app"("p_user_id" "uuid", "p_type" "text", "p_titre" "text", "p_message" "text", "p_lien" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."creer_notification_in_app"("p_user_id" "uuid", "p_type" "text", "p_titre" "text", "p_message" "text", "p_lien" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_alerte"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := format(
    '{"from":"STERNY <onboarding@resend.dev>","to":["%s"],"subject":"STERNY - Ta demande d''alerte est confirmee !","html":"<h2>Merci pour ta confiance !</h2><p>Ta demande d''alerte a bien ete prise en compte.</p><p>Contact : contact@sterny.co</p>"}',
    NEW.email
  );

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_RESEND_KEY"}'::jsonb,
    body := payload::jsonb
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_alerte"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_notif_avis"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_notif_avis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_notif_candidature"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_notif_candidature"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alertes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "ville" "text",
    "rythme" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date_debut_alternance" "date",
    "user_id" "uuid"
);

ALTER TABLE ONLY "public"."alertes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."alertes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."annonces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type_logement" "text",
    "ville" "text",
    "surface" integer,
    "etage" "text",
    "adresse" "text",
    "prix" integer,
    "titre" "text",
    "description" "text",
    "equipements" "jsonb" DEFAULT '[]'::"jsonb",
    "regles" "jsonb" DEFAULT '[]'::"jsonb",
    "charges_info" "jsonb",
    "bail_info" "jsonb",
    "disponibilites_debut" "date",
    "disponibilites_pattern" "jsonb" DEFAULT '[]'::"jsonb",
    "adresse_verifiee" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "adresse_verification_date" timestamp with time zone,
    "disponible" boolean DEFAULT true,
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "type_alternance" "text",
    "rythme_pattern" "text",
    "duree_min" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "pieces" integer,
    "dpe" "text"
);


ALTER TABLE "public"."annonces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evaluateur_id" "uuid" NOT NULL,
    "profil_evalue_id" "uuid" NOT NULL,
    "annonce_id" "uuid",
    "note" integer NOT NULL,
    "commentaire" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "avis_note_check" CHECK ((("note" >= 1) AND ("note" <= 5)))
);


ALTER TABLE "public"."avis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contrats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidature_id" "uuid" NOT NULL,
    "locataire_id" "uuid" NOT NULL,
    "proprietaire_id" "uuid" NOT NULL,
    "annonce_id" "uuid" NOT NULL,
    "loyer_mensuel" numeric,
    "depot_garantie" numeric,
    "date_debut" "date",
    "date_fin" "date",
    "signature_locataire" boolean DEFAULT false,
    "date_signature_locataire" timestamp with time zone,
    "signature_proprietaire" boolean DEFAULT false,
    "date_signature_proprietaire" timestamp with time zone,
    "statut" "text" DEFAULT 'en_attente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contrat_parent_id" "uuid",
    "est_renouvellement" boolean DEFAULT false,
    "signature_locataire_ip" "text",
    "signature_locataire_user_agent" "text",
    "signature_locataire_hash" "text",
    "signature_locataire_email" "text",
    "signature_locataire_nom_complet" "text",
    "signature_locataire_consentement" "text",
    "signature_proprietaire_ip" "text",
    "signature_proprietaire_user_agent" "text",
    "signature_proprietaire_hash" "text",
    "signature_proprietaire_email" "text",
    "signature_proprietaire_nom_complet" "text",
    "signature_proprietaire_consentement" "text",
    "contrat_hash" "text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_payment_method_id" "text",
    "sepa_mandate_active" boolean DEFAULT false,
    CONSTRAINT "contrats_statut_check" CHECK (("statut" = ANY (ARRAY['en_attente'::"text", 'signe_locataire'::"text", 'signe_proprietaire'::"text", 'signe'::"text", 'annule'::"text"])))
);


ALTER TABLE "public"."contrats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_envoyees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contrat_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "locataire_email" "text",
    "proprietaire_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "mois" "date",
    CONSTRAINT "notifications_envoyees_type_check" CHECK (("type" = ANY (ARRAY['rappel_45j'::"text", 'rappel_15j'::"text", 'annonce_reactivee'::"text", 'relance_impaye_locataire'::"text", 'relance_impaye_proprietaire'::"text", 'relance_impaye_garant'::"text"])))
);


ALTER TABLE "public"."notifications_envoyees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."renouvellements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contrat_original_id" "uuid" NOT NULL,
    "locataire_id" "uuid" NOT NULL,
    "proprietaire_id" "uuid" NOT NULL,
    "annonce_id" "uuid" NOT NULL,
    "date_debut" "date" NOT NULL,
    "date_fin" "date" NOT NULL,
    "loyer_mensuel" numeric(10,2) NOT NULL,
    "statut" "text" DEFAULT 'demande_locataire'::"text",
    "nouveau_contrat_id" "uuid",
    "message_locataire" "text",
    "motif_refus" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "date_reponse" timestamp with time zone,
    CONSTRAINT "check_duree_max_9_mois" CHECK ((("date_fin" - "date_debut") <= 274)),
    CONSTRAINT "renouvellements_statut_check" CHECK (("statut" = ANY (ARRAY['demande_locataire'::"text", 'acceptee'::"text", 'refusee'::"text", 'contrat_genere'::"text", 'annulee'::"text"])))
);


ALTER TABLE "public"."renouvellements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "nom" "text" NOT NULL,
    "prenom" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telephone" "text",
    "type_user" "text" NOT NULL,
    "a_logement" boolean DEFAULT false,
    "ville" "text",
    "rythme_alternance" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ville_ecole" "text",
    "ville_entreprise" "text",
    "statut_ville_ecole" "text",
    "statut_ville_entreprise" "text",
    "type_alternance" "text",
    "code_parrainage" "text",
    "parrain_id" "uuid",
    "ville_recherche_secondaire" "text",
    "photo_profil_url" "text",
    "ecole" "text",
    "annee_etudes" "text",
    "filiere" "text",
    "bio" "text",
    "date_naissance" "text",
    "sexe" "text",
    "profil_complet" boolean DEFAULT false,
    "doc_piece_id_url" "text",
    "doc_scolarite_url" "text",
    "doc_rib_url" "text",
    "identite_verifiee" "text" DEFAULT 'non_verifiee'::"text",
    "garant_prenom" "text",
    "garant_nom" "text",
    "garant_telephone" "text",
    "garant_email" "text",
    "doc_assurance_url" "text",
    "doc_scolarite_statut" "text",
    "doc_scolarite_motif_rejet" "text",
    "doc_assurance_statut" "text",
    "doc_assurance_motif_rejet" "text",
    "doc_rib_statut" "text",
    "doc_rib_motif_rejet" "text",
    "doc_garant_id_statut" "text",
    "doc_garant_id_motif_rejet" "text",
    "doc_cautionnement_statut" "text",
    "doc_cautionnement_motif_rejet" "text",
    "is_admin" boolean DEFAULT false,
    "preferences_email" "jsonb" DEFAULT '{"baux": true, "alertes": true, "messages": true, "marketing": true, "paiements": true, "candidatures": true}'::"jsonb",
    "invitation_token" "text",
    "rhythm_calendar" "jsonb",
    "rhythm_start_date" "date",
    "rhythm_end_date" "date",
    "rhythm_source" "text",
    "rhythm_import_id" "uuid",
    CONSTRAINT "users_rhythm_source_check" CHECK (("rhythm_source" = ANY (ARRAY['manual'::"text", 'document_import'::"text"]))),
    CONSTRAINT "users_type_user_check" CHECK (("type_user" = ANY (ARRAY['locataire'::"text", 'hote'::"text", 'proprietaire'::"text", 'les_deux'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."rhythm_calendar" IS 'Calendrier de rythme structuré : [{ week_start: "YYYY-MM-DD", status: "school"|"company" }]';



COMMENT ON COLUMN "public"."users"."rhythm_source" IS 'Source du rythme : manual (saisie) ou document_import (parsing IA)';



COMMENT ON COLUMN "public"."users"."rhythm_import_id" IS 'FK vers rhythm_imports si le rythme a été importé depuis un document';



CREATE OR REPLACE VIEW "public"."baux_expirants" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "contrat_id",
    "c"."date_fin",
    ("c"."date_fin" - CURRENT_DATE) AS "jours_restants",
    "c"."loyer_mensuel",
    "loc"."prenom" AS "locataire_prenom",
    "loc"."nom" AS "locataire_nom",
    "loc"."email" AS "locataire_email",
    "prop"."prenom" AS "proprio_prenom",
    "prop"."email" AS "proprio_email",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."renouvellements" "r"
              WHERE (("r"."contrat_original_id" = "c"."id") AND ("r"."statut" = ANY (ARRAY['demande_locataire'::"text", 'acceptee'::"text", 'contrat_genere'::"text"]))))) THEN 'renouvellement_en_cours'::"text"
            ELSE 'pas_de_renouvellement'::"text"
        END AS "statut_renouvellement",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."notifications_envoyees" "n"
              WHERE (("n"."contrat_id" = "c"."id") AND ("n"."type" = 'rappel_45j'::"text")))) THEN true
            ELSE false
        END AS "rappel_45j_envoye",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."notifications_envoyees" "n"
              WHERE (("n"."contrat_id" = "c"."id") AND ("n"."type" = 'rappel_15j'::"text")))) THEN true
            ELSE false
        END AS "rappel_15j_envoye"
   FROM ((("public"."contrats" "c"
     JOIN "public"."users" "loc" ON (("c"."locataire_id" = "loc"."id")))
     JOIN "public"."users" "prop" ON (("c"."proprietaire_id" = "prop"."id")))
     JOIN "public"."annonces" "a" ON (("c"."annonce_id" = "a"."id")))
  WHERE (("c"."statut" = 'signe'::"text") AND (("c"."date_fin" >= CURRENT_DATE) AND ("c"."date_fin" <= (CURRENT_DATE + '60 days'::interval))))
  ORDER BY "c"."date_fin";


ALTER VIEW "public"."baux_expirants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "annonce_id" "uuid",
    "locataire_id" "uuid",
    "message" "text",
    "statut" "text" DEFAULT 'en_attente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "est_renouvellement" boolean DEFAULT false,
    "renouvellement_id" "uuid",
    CONSTRAINT "candidatures_statut_check" CHECK (("statut" = ANY (ARRAY['en_attente'::"text", 'acceptee'::"text", 'refusee'::"text"])))
);


ALTER TABLE "public"."candidatures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etats_des_lieux" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contrat_id" "uuid" NOT NULL,
    "candidature_id" "uuid" NOT NULL,
    "locataire_id" "uuid" NOT NULL,
    "proprietaire_id" "uuid" NOT NULL,
    "annonce_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'entree'::"text" NOT NULL,
    "checklist" "jsonb" DEFAULT '{}'::"jsonb",
    "compteurs" "jsonb" DEFAULT '{}'::"jsonb",
    "photos_urls" "text"[] DEFAULT ARRAY[]::"text"[],
    "observations" "text" DEFAULT ''::"text",
    "signature_locataire" boolean DEFAULT false,
    "date_signature_locataire" timestamp with time zone,
    "signature_proprietaire" boolean DEFAULT false,
    "date_signature_proprietaire" timestamp with time zone,
    "statut" "text" DEFAULT 'en_cours'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "signature_locataire_ip" "text",
    "signature_locataire_user_agent" "text",
    "signature_locataire_hash" "text",
    "signature_locataire_email" "text",
    "signature_locataire_nom_complet" "text",
    "signature_locataire_consentement" "text",
    "signature_proprietaire_ip" "text",
    "signature_proprietaire_user_agent" "text",
    "signature_proprietaire_hash" "text",
    "signature_proprietaire_email" "text",
    "signature_proprietaire_nom_complet" "text",
    "signature_proprietaire_consentement" "text",
    "document_hash" "text",
    CONSTRAINT "etats_des_lieux_statut_check" CHECK (("statut" = ANY (ARRAY['en_cours'::"text", 'signe_locataire'::"text", 'signe_proprietaire'::"text", 'valide'::"text", 'conteste'::"text"]))),
    CONSTRAINT "etats_des_lieux_type_check" CHECK (("type" = ANY (ARRAY['entree'::"text", 'sortie'::"text"])))
);


ALTER TABLE "public"."etats_des_lieux" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."edl_en_attente" WITH ("security_invoker"='true') AS
 SELECT "edl"."id",
    "edl"."contrat_id",
    "edl"."candidature_id",
    "edl"."locataire_id",
    "edl"."proprietaire_id",
    "edl"."annonce_id",
    "edl"."type",
    "edl"."checklist",
    "edl"."compteurs",
    "edl"."photos_urls",
    "edl"."observations",
    "edl"."signature_locataire",
    "edl"."date_signature_locataire",
    "edl"."signature_proprietaire",
    "edl"."date_signature_proprietaire",
    "edl"."statut",
    "edl"."created_at",
    "edl"."updated_at",
    "loc"."prenom" AS "locataire_prenom",
    "loc"."nom" AS "locataire_nom",
    "prop"."prenom" AS "proprietaire_prenom",
    "prop"."nom" AS "proprietaire_nom",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville"
   FROM ((("public"."etats_des_lieux" "edl"
     JOIN "public"."users" "loc" ON (("edl"."locataire_id" = "loc"."id")))
     JOIN "public"."users" "prop" ON (("edl"."proprietaire_id" = "prop"."id")))
     JOIN "public"."annonces" "a" ON (("edl"."annonce_id" = "a"."id")))
  WHERE ("edl"."statut" = ANY (ARRAY['en_cours'::"text", 'signe_locataire'::"text", 'signe_proprietaire'::"text"]));


ALTER VIEW "public"."edl_en_attente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favoris" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "annonce_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favoris" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."historique_notifications" WITH ("security_invoker"='true') AS
 SELECT "n"."id",
    "n"."type",
    "n"."locataire_email",
    "n"."proprietaire_email",
    "n"."created_at" AS "date_envoi",
    "c"."date_fin" AS "fin_bail",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville"
   FROM (("public"."notifications_envoyees" "n"
     JOIN "public"."contrats" "c" ON (("n"."contrat_id" = "c"."id")))
     JOIN "public"."annonces" "a" ON (("c"."annonce_id" = "a"."id")))
  ORDER BY "n"."created_at" DESC;


ALTER VIEW "public"."historique_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paiements_loyer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contrat_id" "uuid" NOT NULL,
    "mois" "date" NOT NULL,
    "montant" numeric(10,2) NOT NULL,
    "statut" "text" DEFAULT 'attendu'::"text" NOT NULL,
    "date_paiement" timestamp with time zone,
    "signale_par" "uuid",
    "date_signalement" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_session_id" "text",
    "stripe_payment_intent" "text",
    "stripe_payment_intent_id" "text",
    "stripe_invoice_id" "text",
    CONSTRAINT "paiements_loyer_statut_check" CHECK (("statut" = ANY (ARRAY['attendu'::"text", 'paye'::"text", 'impaye'::"text", 'relance_envoyee'::"text"])))
);


ALTER TABLE "public"."paiements_loyer" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."historique_paiements" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "paiement_id",
    "p"."contrat_id",
    "p"."mois",
    "p"."montant",
    "p"."statut",
    "p"."date_paiement",
    "p"."date_signalement",
    "loc"."prenom" AS "locataire_prenom",
    "loc"."nom" AS "locataire_nom",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville"
   FROM ((("public"."paiements_loyer" "p"
     JOIN "public"."contrats" "c" ON (("p"."contrat_id" = "c"."id")))
     JOIN "public"."users" "loc" ON (("c"."locataire_id" = "loc"."id")))
     JOIN "public"."annonces" "a" ON (("c"."annonce_id" = "a"."id")))
  ORDER BY "p"."mois" DESC;


ALTER VIEW "public"."historique_paiements" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."impayes_en_cours" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "paiement_id",
    "p"."contrat_id",
    "p"."mois",
    "p"."montant",
    "p"."statut",
    "p"."date_signalement",
    "c"."loyer_mensuel",
    "c"."date_debut",
    "c"."date_fin",
    "loc"."id" AS "locataire_id",
    "loc"."prenom" AS "locataire_prenom",
    "loc"."nom" AS "locataire_nom",
    "loc"."email" AS "locataire_email",
    "loc"."garant_prenom",
    "loc"."garant_nom",
    "loc"."garant_email",
    "loc"."garant_telephone",
    "prop"."id" AS "proprietaire_id",
    "prop"."prenom" AS "proprio_prenom",
    "prop"."nom" AS "proprio_nom",
    "prop"."email" AS "proprio_email",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."notifications_envoyees" "n"
              WHERE (("n"."contrat_id" = "p"."contrat_id") AND ("n"."type" = 'relance_impaye_garant'::"text") AND ("n"."mois" = "p"."mois")))) THEN true
            ELSE false
        END AS "relance_garant_envoyee"
   FROM (((("public"."paiements_loyer" "p"
     JOIN "public"."contrats" "c" ON (("p"."contrat_id" = "c"."id")))
     JOIN "public"."users" "loc" ON (("c"."locataire_id" = "loc"."id")))
     JOIN "public"."users" "prop" ON (("c"."proprietaire_id" = "prop"."id")))
     JOIN "public"."annonces" "a" ON (("c"."annonce_id" = "a"."id")))
  WHERE ("p"."statut" = ANY (ARRAY['impaye'::"text", 'relance_envoyee'::"text"]))
  ORDER BY "p"."mois" DESC;


ALTER VIEW "public"."impayes_en_cours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expediteur_id" "uuid" NOT NULL,
    "destinataire_id" "uuid" NOT NULL,
    "contenu" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lu" boolean DEFAULT false,
    "annonce_id" "uuid",
    "is_alert" boolean DEFAULT false
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_contact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nom" "text" NOT NULL,
    "email" "text" NOT NULL,
    "sujet" "text" NOT NULL,
    "message" "text" NOT NULL,
    "statut" "text" DEFAULT 'nouveau'::"text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_contact_statut_check" CHECK (("statut" = ANY (ARRAY['nouveau'::"text", 'lu'::"text", 'traite'::"text"])))
);


ALTER TABLE "public"."messages_contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mises_en_relation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email_proprietaire" "text" NOT NULL,
    "prenom_user" "text",
    "nom_user" "text",
    "ville" "text",
    "statut" "text" DEFAULT 'en_attente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mises_en_relation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_in_app" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "titre" "text" NOT NULL,
    "message" "text" NOT NULL,
    "lien" "text",
    "lu" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_in_app_type_check" CHECK (("type" = ANY (ARRAY['candidature_recue'::"text", 'candidature_acceptee'::"text", 'candidature_refusee'::"text", 'match_cree'::"text", 'contrat_signe'::"text", 'paiement_recu'::"text", 'paiement_confirme'::"text", 'avis_recu'::"text", 'message_recu'::"text", 'annonce_expiree'::"text", 'identite_verifiee'::"text", 'systeme'::"text"])))
);


ALTER TABLE "public"."notifications_in_app" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rhythm_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_file_path" "text" NOT NULL,
    "source_file_type" "text" NOT NULL,
    "source_file_size_bytes" integer,
    "parser_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "llm_provider" "text" NOT NULL,
    "llm_model" "text" NOT NULL,
    "raw_response" "jsonb",
    "parsed_groups" "jsonb",
    "selected_group_id" "text",
    "status" "text" DEFAULT 'parsed'::"text" NOT NULL,
    "error_message" "text",
    CONSTRAINT "rhythm_imports_parsed_groups_required" CHECK (((("status" = ANY (ARRAY['parsed'::"text", 'confirmed'::"text"])) AND ("parsed_groups" IS NOT NULL)) OR ("status" = 'failed'::"text"))),
    CONSTRAINT "rhythm_imports_source_file_type_check" CHECK (("source_file_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'image/heic'::"text", 'application/pdf'::"text"]))),
    CONSTRAINT "rhythm_imports_status_check" CHECK (("status" = ANY (ARRAY['parsed'::"text", 'confirmed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."rhythm_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signatures_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "document_type" "text" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" "text" NOT NULL,
    "user_nom_complet" "text" NOT NULL,
    "role_signataire" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "document_hash" "text" NOT NULL,
    "consentement_texte" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "signatures_audit_document_type_check" CHECK (("document_type" = ANY (ARRAY['contrat'::"text", 'etat_des_lieux'::"text"]))),
    CONSTRAINT "signatures_audit_role_signataire_check" CHECK (("role_signataire" = ANY (ARRAY['locataire'::"text", 'proprietaire'::"text"])))
);


ALTER TABLE "public"."signatures_audit" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vue_etats_des_lieux" WITH ("security_invoker"='true') AS
 SELECT "edl"."id",
    "edl"."type",
    "edl"."statut",
    "edl"."signature_locataire",
    "edl"."date_signature_locataire",
    "edl"."signature_proprietaire",
    "edl"."date_signature_proprietaire",
    "edl"."created_at",
    "edl"."updated_at",
    "loc"."prenom" AS "locataire_prenom",
    "loc"."nom" AS "locataire_nom",
    "loc"."email" AS "locataire_email",
    "prop"."prenom" AS "proprietaire_prenom",
    "prop"."nom" AS "proprietaire_nom",
    "prop"."email" AS "proprietaire_email",
    "a"."titre" AS "annonce_titre",
    "a"."ville" AS "annonce_ville",
    "c"."date_debut" AS "contrat_debut",
    "c"."date_fin" AS "contrat_fin"
   FROM (((("public"."etats_des_lieux" "edl"
     JOIN "public"."users" "loc" ON (("edl"."locataire_id" = "loc"."id")))
     JOIN "public"."users" "prop" ON (("edl"."proprietaire_id" = "prop"."id")))
     JOIN "public"."annonces" "a" ON (("edl"."annonce_id" = "a"."id")))
     JOIN "public"."contrats" "c" ON (("edl"."contrat_id" = "c"."id")))
  ORDER BY "edl"."created_at" DESC;


ALTER VIEW "public"."vue_etats_des_lieux" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alertes"
    ADD CONSTRAINT "alertes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annonces"
    ADD CONSTRAINT "annonces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avis"
    ADD CONSTRAINT "avis_evaluateur_id_profil_evalue_id_annonce_id_key" UNIQUE ("evaluateur_id", "profil_evalue_id", "annonce_id");



ALTER TABLE ONLY "public"."avis"
    ADD CONSTRAINT "avis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidatures"
    ADD CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favoris"
    ADD CONSTRAINT "favoris_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favoris"
    ADD CONSTRAINT "favoris_user_id_annonce_id_key" UNIQUE ("user_id", "annonce_id");



ALTER TABLE ONLY "public"."messages_contact"
    ADD CONSTRAINT "messages_contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mises_en_relation"
    ADD CONSTRAINT "mises_en_relation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications_envoyees"
    ADD CONSTRAINT "notifications_envoyees_contrat_id_type_key" UNIQUE ("contrat_id", "type");



ALTER TABLE ONLY "public"."notifications_envoyees"
    ADD CONSTRAINT "notifications_envoyees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications_in_app"
    ADD CONSTRAINT "notifications_in_app_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paiements_loyer"
    ADD CONSTRAINT "paiements_loyer_contrat_id_mois_key" UNIQUE ("contrat_id", "mois");



ALTER TABLE ONLY "public"."paiements_loyer"
    ADD CONSTRAINT "paiements_loyer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rhythm_imports"
    ADD CONSTRAINT "rhythm_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signatures_audit"
    ADD CONSTRAINT "signatures_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_avis_evaluateur" ON "public"."avis" USING "btree" ("evaluateur_id");



CREATE INDEX "idx_avis_profil_evalue" ON "public"."avis" USING "btree" ("profil_evalue_id");



CREATE INDEX "idx_edl_candidature" ON "public"."etats_des_lieux" USING "btree" ("candidature_id");



CREATE INDEX "idx_edl_contrat" ON "public"."etats_des_lieux" USING "btree" ("contrat_id");



CREATE INDEX "idx_edl_locataire" ON "public"."etats_des_lieux" USING "btree" ("locataire_id");



CREATE INDEX "idx_edl_proprietaire" ON "public"."etats_des_lieux" USING "btree" ("proprietaire_id");



CREATE INDEX "idx_edl_statut" ON "public"."etats_des_lieux" USING "btree" ("statut");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_destinataire" ON "public"."messages" USING "btree" ("destinataire_id");



CREATE INDEX "idx_messages_expediteur" ON "public"."messages" USING "btree" ("expediteur_id");



CREATE INDEX "idx_notif_app_unread" ON "public"."notifications_in_app" USING "btree" ("user_id") WHERE ("lu" = false);



CREATE INDEX "idx_notif_app_user" ON "public"."notifications_in_app" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notif_contrat" ON "public"."notifications_envoyees" USING "btree" ("contrat_id");



CREATE INDEX "idx_notif_created" ON "public"."notifications_envoyees" USING "btree" ("created_at");



CREATE UNIQUE INDEX "idx_notif_relance_unique" ON "public"."notifications_envoyees" USING "btree" ("contrat_id", "type", "mois") WHERE ("mois" IS NOT NULL);



CREATE INDEX "idx_notif_type" ON "public"."notifications_envoyees" USING "btree" ("type");



CREATE UNIQUE INDEX "idx_one_edl_per_type_per_contrat" ON "public"."etats_des_lieux" USING "btree" ("contrat_id", "type");



CREATE UNIQUE INDEX "idx_one_pending_renewal" ON "public"."renouvellements" USING "btree" ("contrat_original_id") WHERE ("statut" = ANY (ARRAY['demande_locataire'::"text", 'acceptee'::"text"]));



CREATE INDEX "idx_paiements_contrat" ON "public"."paiements_loyer" USING "btree" ("contrat_id");



CREATE INDEX "idx_paiements_mois" ON "public"."paiements_loyer" USING "btree" ("mois");



CREATE INDEX "idx_paiements_statut" ON "public"."paiements_loyer" USING "btree" ("statut");



CREATE INDEX "idx_renouvellements_contrat" ON "public"."renouvellements" USING "btree" ("contrat_original_id");



CREATE INDEX "idx_renouvellements_locataire" ON "public"."renouvellements" USING "btree" ("locataire_id");



CREATE INDEX "idx_renouvellements_proprietaire" ON "public"."renouvellements" USING "btree" ("proprietaire_id");



CREATE INDEX "idx_renouvellements_statut" ON "public"."renouvellements" USING "btree" ("statut");



CREATE INDEX "idx_rhythm_imports_created_at" ON "public"."rhythm_imports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_rhythm_imports_user_id" ON "public"."rhythm_imports" USING "btree" ("user_id");



CREATE INDEX "idx_signatures_audit_document" ON "public"."signatures_audit" USING "btree" ("document_type", "document_id");



CREATE INDEX "idx_signatures_audit_user" ON "public"."signatures_audit" USING "btree" ("user_id");



CREATE INDEX "idx_users_code_parrainage" ON "public"."users" USING "btree" ("code_parrainage");



CREATE INDEX "idx_users_invitation_token" ON "public"."users" USING "btree" ("invitation_token");



CREATE INDEX "idx_users_parrain_id" ON "public"."users" USING "btree" ("parrain_id");



CREATE INDEX "idx_users_rhythm_import_id" ON "public"."users" USING "btree" ("rhythm_import_id");



CREATE OR REPLACE TRIGGER "on_new_alerte" AFTER INSERT ON "public"."alertes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_alerte"();



CREATE OR REPLACE TRIGGER "send-alert-on-insert" AFTER INSERT ON "public"."alertes" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/send-alert-email', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trg_notif_avis" AFTER INSERT ON "public"."avis" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_notif_avis"();



CREATE OR REPLACE TRIGGER "trg_notif_candidature" AFTER INSERT ON "public"."candidatures" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_notif_candidature"();



CREATE OR REPLACE TRIGGER "update_etats_des_lieux_updated_at" BEFORE UPDATE ON "public"."etats_des_lieux" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_renouvellements_updated_at" BEFORE UPDATE ON "public"."renouvellements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."avis"
    ADD CONSTRAINT "avis_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."avis"
    ADD CONSTRAINT "avis_evaluateur_id_fkey" FOREIGN KEY ("evaluateur_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avis"
    ADD CONSTRAINT "avis_profil_evalue_id_fkey" FOREIGN KEY ("profil_evalue_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidatures"
    ADD CONSTRAINT "candidatures_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidatures"
    ADD CONSTRAINT "candidatures_locataire_id_fkey" FOREIGN KEY ("locataire_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidatures"
    ADD CONSTRAINT "candidatures_renouvellement_id_fkey" FOREIGN KEY ("renouvellement_id") REFERENCES "public"."renouvellements"("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "public"."candidatures"("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_contrat_parent_id_fkey" FOREIGN KEY ("contrat_parent_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_locataire_id_fkey" FOREIGN KEY ("locataire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."contrats"
    ADD CONSTRAINT "contrats_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "public"."candidatures"("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_contrat_id_fkey" FOREIGN KEY ("contrat_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_locataire_id_fkey" FOREIGN KEY ("locataire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."etats_des_lieux"
    ADD CONSTRAINT "etats_des_lieux_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."favoris"
    ADD CONSTRAINT "favoris_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favoris"
    ADD CONSTRAINT "favoris_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages_contact"
    ADD CONSTRAINT "messages_contact_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_destinataire_id_fkey" FOREIGN KEY ("destinataire_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_expediteur_id_fkey" FOREIGN KEY ("expediteur_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mises_en_relation"
    ADD CONSTRAINT "mises_en_relation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications_envoyees"
    ADD CONSTRAINT "notifications_envoyees_contrat_id_fkey" FOREIGN KEY ("contrat_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."notifications_in_app"
    ADD CONSTRAINT "notifications_in_app_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paiements_loyer"
    ADD CONSTRAINT "paiements_loyer_contrat_id_fkey" FOREIGN KEY ("contrat_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."paiements_loyer"
    ADD CONSTRAINT "paiements_loyer_signale_par_fkey" FOREIGN KEY ("signale_par") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_contrat_original_id_fkey" FOREIGN KEY ("contrat_original_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_locataire_id_fkey" FOREIGN KEY ("locataire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_nouveau_contrat_id_fkey" FOREIGN KEY ("nouveau_contrat_id") REFERENCES "public"."contrats"("id");



ALTER TABLE ONLY "public"."renouvellements"
    ADD CONSTRAINT "renouvellements_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."rhythm_imports"
    ADD CONSTRAINT "rhythm_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signatures_audit"
    ADD CONSTRAINT "signatures_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_rhythm_import_id_fkey" FOREIGN KEY ("rhythm_import_id") REFERENCES "public"."rhythm_imports"("id") ON DELETE SET NULL;



CREATE POLICY "Annonces lisibles par les utilisateurs authentifiés" ON "public"."annonces" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone authenticated can read basic user info" ON "public"."users" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Anyone can insert alerts" ON "public"."alertes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read annonces" ON "public"."annonces" FOR SELECT USING (true);



CREATE POLICY "Candidatures lisibles par les utilisateurs authentifiés" ON "public"."candidatures" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Candidatures modifiables par les utilisateurs authentifiés" ON "public"."candidatures" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Candidatures visibles par tous" ON "public"."candidatures" FOR SELECT USING (true);



CREATE POLICY "Contrats insérables par les utilisateurs authentifiés" ON "public"."contrats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Contrats lisibles par les utilisateurs authentifiés" ON "public"."contrats" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Contrats modifiables par les utilisateurs authentifiés" ON "public"."contrats" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Insertion annonces" ON "public"."annonces" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Insertion signature authentifiée" ON "public"."signatures_audit" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Lecture propres signatures" ON "public"."signatures_audit" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Lecture publique alertes" ON "public"."alertes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Lecture publique annonces" ON "public"."annonces" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Locataire peut voir ses paiements" ON "public"."paiements_loyer" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contrats" "c"
  WHERE (("c"."id" = "paiements_loyer"."contrat_id") AND ("c"."locataire_id" = "auth"."uid"())))));



CREATE POLICY "Permettre insertion anonyme" ON "public"."alertes" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Proprio peut mettre à jour le statut" ON "public"."paiements_loyer" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."contrats" "c"
  WHERE (("c"."id" = "paiements_loyer"."contrat_id") AND ("c"."proprietaire_id" = "auth"."uid"())))));



CREATE POLICY "Proprio peut signaler un impayé" ON "public"."paiements_loyer" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contrats" "c"
  WHERE (("c"."id" = "paiements_loyer"."contrat_id") AND ("c"."proprietaire_id" = "auth"."uid"())))));



CREATE POLICY "Proprio peut voir ses paiements" ON "public"."paiements_loyer" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contrats" "c"
  WHERE (("c"."id" = "paiements_loyer"."contrat_id") AND ("c"."proprietaire_id" = "auth"."uid"())))));



CREATE POLICY "Propriétaire peut modifier le statut" ON "public"."candidatures" FOR UPDATE USING (true);



CREATE POLICY "Service role accès total paiements" ON "public"."paiements_loyer" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete own favoris" ON "public"."favoris" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own annonces" ON "public"."annonces" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own favoris" ON "public"."favoris" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own" ON "public"."mises_en_relation" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own annonces" ON "public"."annonces" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can mark messages as read" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "destinataire_id"));



CREATE POLICY "Users can read own messages" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "expediteur_id") OR ("auth"."uid"() = "destinataire_id")));



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their own" ON "public"."mises_en_relation" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "expediteur_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own annonces" ON "public"."annonces" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own favoris" ON "public"."favoris" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users lisibles par les utilisateurs authentifiés" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users modifiables par le propriétaire du profil" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Utilisateurs authentifiés peuvent postuler" ON "public"."candidatures" FOR INSERT WITH CHECK (("auth"."uid"() = "locataire_id"));



CREATE POLICY "admin_select_all" ON "public"."alertes" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."candidatures" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."contrats" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."etats_des_lieux" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."favoris" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."messages" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."mises_en_relation" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."paiements_loyer" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."renouvellements" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."rhythm_imports" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_select_all" ON "public"."signatures_audit" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."alertes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alertes_delete" ON "public"."alertes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "alertes_delete_own" ON "public"."alertes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "alertes_insert" ON "public"."alertes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "alertes_insert_own" ON "public"."alertes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "alertes_select" ON "public"."alertes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "alertes_select_own" ON "public"."alertes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "alertes_update_own" ON "public"."alertes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."annonces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "annonces_delete_owner" ON "public"."annonces" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "annonces_insert_owner" ON "public"."annonces" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "annonces_select_all" ON "public"."annonces" FOR SELECT USING (true);



CREATE POLICY "annonces_update_owner" ON "public"."annonces" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."avis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avis_delete_own_or_admin" ON "public"."avis" FOR DELETE USING ((("auth"."uid"() = "evaluateur_id") OR "public"."is_admin"()));



CREATE POLICY "avis_insert_auth" ON "public"."avis" FOR INSERT WITH CHECK ((("auth"."uid"() = "evaluateur_id") AND ("auth"."uid"() <> "profil_evalue_id")));



CREATE POLICY "avis_select_all" ON "public"."avis" FOR SELECT USING (true);



CREATE POLICY "avis_update_own" ON "public"."avis" FOR UPDATE USING (("auth"."uid"() = "evaluateur_id"));



ALTER TABLE "public"."candidatures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidatures_delete_locataire" ON "public"."candidatures" FOR DELETE USING (("auth"."uid"() = "locataire_id"));



CREATE POLICY "candidatures_insert_locataire" ON "public"."candidatures" FOR INSERT WITH CHECK (("auth"."uid"() = "locataire_id"));



CREATE POLICY "candidatures_select" ON "public"."candidatures" FOR SELECT USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() IN ( SELECT "annonces"."user_id"
   FROM "public"."annonces"
  WHERE ("annonces"."id" = "candidatures"."annonce_id")))));



CREATE POLICY "candidatures_update" ON "public"."candidatures" FOR UPDATE USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() IN ( SELECT "annonces"."user_id"
   FROM "public"."annonces"
  WHERE ("annonces"."id" = "candidatures"."annonce_id")))));



ALTER TABLE "public"."contrats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contrats_insert" ON "public"."contrats" FOR INSERT WITH CHECK ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "contrats_select" ON "public"."contrats" FOR SELECT USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "contrats_update" ON "public"."contrats" FOR UPDATE USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_insert" ON "public"."etats_des_lieux" FOR INSERT WITH CHECK ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_insert_parties" ON "public"."etats_des_lieux" FOR INSERT WITH CHECK ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_select" ON "public"."etats_des_lieux" FOR SELECT USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_select_parties" ON "public"."etats_des_lieux" FOR SELECT USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_update" ON "public"."etats_des_lieux" FOR UPDATE USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "edl_update_parties" ON "public"."etats_des_lieux" FOR UPDATE USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



ALTER TABLE "public"."etats_des_lieux" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favoris" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "favoris_delete_own" ON "public"."favoris" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "favoris_insert_own" ON "public"."favoris" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "favoris_select_own" ON "public"."favoris" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages_contact" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_contact_insert_all" ON "public"."messages_contact" FOR INSERT WITH CHECK (true);



CREATE POLICY "messages_contact_select_admin" ON "public"."messages_contact" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "messages_contact_update_admin" ON "public"."messages_contact" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "expediteur_id"));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "expediteur_id") OR ("auth"."uid"() = "destinataire_id")));



CREATE POLICY "messages_update_own" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "expediteur_id"));



ALTER TABLE "public"."mises_en_relation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mises_en_relation_insert" ON "public"."mises_en_relation" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "mises_en_relation_select" ON "public"."mises_en_relation" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "mises_en_relation_update" ON "public"."mises_en_relation" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notif_app_admin_all" ON "public"."notifications_in_app" USING ("public"."is_admin"());



CREATE POLICY "notif_app_delete_own" ON "public"."notifications_in_app" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notif_app_insert_auth" ON "public"."notifications_in_app" FOR INSERT WITH CHECK (true);



CREATE POLICY "notif_app_select_own" ON "public"."notifications_in_app" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notif_app_update_own" ON "public"."notifications_in_app" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications_envoyees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications_in_app" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "paiements_insert" ON "public"."paiements_loyer" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contrats"
  WHERE (("contrats"."id" = "paiements_loyer"."contrat_id") AND (("contrats"."locataire_id" = "auth"."uid"()) OR ("contrats"."proprietaire_id" = "auth"."uid"()))))));



ALTER TABLE "public"."paiements_loyer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "paiements_select" ON "public"."paiements_loyer" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contrats"
  WHERE (("contrats"."id" = "paiements_loyer"."contrat_id") AND (("contrats"."locataire_id" = "auth"."uid"()) OR ("contrats"."proprietaire_id" = "auth"."uid"()))))));



CREATE POLICY "paiements_update" ON "public"."paiements_loyer" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."contrats"
  WHERE (("contrats"."id" = "paiements_loyer"."contrat_id") AND (("contrats"."locataire_id" = "auth"."uid"()) OR ("contrats"."proprietaire_id" = "auth"."uid"()))))));



ALTER TABLE "public"."renouvellements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "renouvellements_insert" ON "public"."renouvellements" FOR INSERT WITH CHECK ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "renouvellements_select" ON "public"."renouvellements" FOR SELECT USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



CREATE POLICY "renouvellements_update" ON "public"."renouvellements" FOR UPDATE USING ((("auth"."uid"() = "locataire_id") OR ("auth"."uid"() = "proprietaire_id")));



ALTER TABLE "public"."rhythm_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rhythm_imports_insert_own" ON "public"."rhythm_imports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rhythm_imports_select_own" ON "public"."rhythm_imports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rhythm_imports_update_own" ON "public"."rhythm_imports" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."signatures_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signatures_insert" ON "public"."signatures_audit" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "signatures_select" ON "public"."signatures_audit" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_own" ON "public"."users" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_select_all" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "users_update_own_no_admin" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("is_admin" = ( SELECT "users_1"."is_admin"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"()))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."creer_notification_in_app"("p_user_id" "uuid", "p_type" "text", "p_titre" "text", "p_message" "text", "p_lien" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."creer_notification_in_app"("p_user_id" "uuid", "p_type" "text", "p_titre" "text", "p_message" "text", "p_lien" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."creer_notification_in_app"("p_user_id" "uuid", "p_type" "text", "p_titre" "text", "p_message" "text", "p_lien" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_alerte"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_alerte"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_alerte"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_notif_avis"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_notif_avis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_notif_avis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_notif_candidature"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_notif_candidature"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_notif_candidature"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."alertes" TO "anon";
GRANT ALL ON TABLE "public"."alertes" TO "authenticated";
GRANT ALL ON TABLE "public"."alertes" TO "service_role";



GRANT ALL ON TABLE "public"."annonces" TO "anon";
GRANT ALL ON TABLE "public"."annonces" TO "authenticated";
GRANT ALL ON TABLE "public"."annonces" TO "service_role";



GRANT ALL ON TABLE "public"."avis" TO "anon";
GRANT ALL ON TABLE "public"."avis" TO "authenticated";
GRANT ALL ON TABLE "public"."avis" TO "service_role";



GRANT ALL ON TABLE "public"."contrats" TO "anon";
GRANT ALL ON TABLE "public"."contrats" TO "authenticated";
GRANT ALL ON TABLE "public"."contrats" TO "service_role";



GRANT ALL ON TABLE "public"."notifications_envoyees" TO "anon";
GRANT ALL ON TABLE "public"."notifications_envoyees" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications_envoyees" TO "service_role";



GRANT ALL ON TABLE "public"."renouvellements" TO "anon";
GRANT ALL ON TABLE "public"."renouvellements" TO "authenticated";
GRANT ALL ON TABLE "public"."renouvellements" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."baux_expirants" TO "anon";
GRANT ALL ON TABLE "public"."baux_expirants" TO "authenticated";
GRANT ALL ON TABLE "public"."baux_expirants" TO "service_role";



GRANT ALL ON TABLE "public"."candidatures" TO "anon";
GRANT ALL ON TABLE "public"."candidatures" TO "authenticated";
GRANT ALL ON TABLE "public"."candidatures" TO "service_role";



GRANT ALL ON TABLE "public"."etats_des_lieux" TO "anon";
GRANT ALL ON TABLE "public"."etats_des_lieux" TO "authenticated";
GRANT ALL ON TABLE "public"."etats_des_lieux" TO "service_role";



GRANT ALL ON TABLE "public"."edl_en_attente" TO "anon";
GRANT ALL ON TABLE "public"."edl_en_attente" TO "authenticated";
GRANT ALL ON TABLE "public"."edl_en_attente" TO "service_role";



GRANT ALL ON TABLE "public"."favoris" TO "anon";
GRANT ALL ON TABLE "public"."favoris" TO "authenticated";
GRANT ALL ON TABLE "public"."favoris" TO "service_role";



GRANT ALL ON TABLE "public"."historique_notifications" TO "anon";
GRANT ALL ON TABLE "public"."historique_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."historique_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."paiements_loyer" TO "anon";
GRANT ALL ON TABLE "public"."paiements_loyer" TO "authenticated";
GRANT ALL ON TABLE "public"."paiements_loyer" TO "service_role";



GRANT ALL ON TABLE "public"."historique_paiements" TO "anon";
GRANT ALL ON TABLE "public"."historique_paiements" TO "authenticated";
GRANT ALL ON TABLE "public"."historique_paiements" TO "service_role";



GRANT ALL ON TABLE "public"."impayes_en_cours" TO "anon";
GRANT ALL ON TABLE "public"."impayes_en_cours" TO "authenticated";
GRANT ALL ON TABLE "public"."impayes_en_cours" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."messages_contact" TO "anon";
GRANT ALL ON TABLE "public"."messages_contact" TO "authenticated";
GRANT ALL ON TABLE "public"."messages_contact" TO "service_role";



GRANT ALL ON TABLE "public"."mises_en_relation" TO "anon";
GRANT ALL ON TABLE "public"."mises_en_relation" TO "authenticated";
GRANT ALL ON TABLE "public"."mises_en_relation" TO "service_role";



GRANT ALL ON TABLE "public"."notifications_in_app" TO "anon";
GRANT ALL ON TABLE "public"."notifications_in_app" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications_in_app" TO "service_role";



GRANT ALL ON TABLE "public"."rhythm_imports" TO "anon";
GRANT ALL ON TABLE "public"."rhythm_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."rhythm_imports" TO "service_role";



GRANT ALL ON TABLE "public"."signatures_audit" TO "anon";
GRANT ALL ON TABLE "public"."signatures_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."signatures_audit" TO "service_role";



GRANT ALL ON TABLE "public"."vue_etats_des_lieux" TO "anon";
GRANT ALL ON TABLE "public"."vue_etats_des_lieux" TO "authenticated";
GRANT ALL ON TABLE "public"."vue_etats_des_lieux" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







