CREATE TABLE IF NOT EXISTS "public"."semaines_reservees" (
  "id"           uuid        DEFAULT gen_random_uuid() NOT NULL,
  "annonce_id"   uuid        NOT NULL,
  "semaine"      date        NOT NULL,
  "contrat_id"   uuid,
  "locataire_id" uuid,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "semaines_reservees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "semaines_reservees_annonce_semaine_key" UNIQUE ("annonce_id", "semaine"),
  CONSTRAINT "semaines_reservees_semaine_is_monday" CHECK (EXTRACT(ISODOW FROM "semaine") = 1),
  CONSTRAINT "semaines_reservees_annonce_id_fkey"   FOREIGN KEY ("annonce_id")   REFERENCES "public"."annonces"("id") ON DELETE CASCADE,
  CONSTRAINT "semaines_reservees_contrat_id_fkey"   FOREIGN KEY ("contrat_id")   REFERENCES "public"."contrats"("id") ON DELETE CASCADE,
  CONSTRAINT "semaines_reservees_locataire_id_fkey" FOREIGN KEY ("locataire_id") REFERENCES "public"."users"("id")    ON DELETE CASCADE
);

COMMENT ON TABLE "public"."semaines_reservees" IS
  'Registre des semaines reservees, une ligne par semaine reservee pour une annonce. UNIQUE(annonce_id, semaine) = exclusion dans la base, jamais deux contrats sur la meme semaine du meme logement. contrat_id et locataire_id nullables en TRANCHE 1, a passer NOT NULL au lot signature. DETTE 93.';

ALTER TABLE "public"."semaines_reservees" ENABLE ROW LEVEL SECURITY;
-- TRANCHE 1 : RLS activee sans aucune policy = table verrouillee cote API client (aucun code ne la lit/ecrit encore).
-- Le seed et les tests tournent en superuser (db reset / psql) et contournent la RLS.
-- Policies fines a ajouter au lot signature.
