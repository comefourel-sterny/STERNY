-- Migration des inscriptions waitlist historiques depuis alertes vers waitlist.
-- Appliquee en prod via SQL editor le 2026-06-20 (conv 74), enregistree ici pour tracabilite.
-- Dedoublonne (insensible casse), conserve la date la plus ancienne par email. 5 lignes inserees en prod.
INSERT INTO public.waitlist (email, created_at)
SELECT DISTINCT ON (lower(email)) email, created_at
FROM public.alertes
WHERE user_id IS NULL AND ville IS NULL AND rythme IS NULL
ORDER BY lower(email), created_at ASC
ON CONFLICT (email) DO NOTHING;
