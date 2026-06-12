ALTER TABLE "public"."candidatures"
  ADD COLUMN "semaines_demandees" jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."candidatures"."semaines_demandees" IS
  'Semaines demandees par le locataire, liste de lundis ISO format YYYY-MM-DD. Plusieurs candidatures peuvent demander les memes semaines (non-exclusivite, VISION 381). DETTE 93.';
