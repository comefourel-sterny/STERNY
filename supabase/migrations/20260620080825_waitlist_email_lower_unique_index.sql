-- Index unique insensible a la casse sur waitlist.email (empeche Jean@x et jean@x de coexister).
-- Appliquee en prod via SQL editor le 2026-06-20 (conv 74), enregistree ici pour tracabilite.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_lower_unique
ON public.waitlist (lower(email));
