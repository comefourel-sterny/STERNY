-- Ajout colonne pole (école/entreprise) sur annonces
ALTER TABLE public.annonces ADD COLUMN pole text;

-- Backfill des lignes existantes connues (déduites de ville_ecole/ville_entreprise du propriétaire)
-- Note : ces UPDATE ne toucheront aucune ligne en local (base vide au moment du reset), ils servent
-- au futur db push prod où les lignes existent déjà.
UPDATE public.annonces SET pole = 'ecole' WHERE id = '7d60be51-cac1-4242-a2be-9eb40be95220';
UPDATE public.annonces SET pole = 'entreprise' WHERE id = '33333333-3333-3333-3333-333333333333';

-- Garde-fou : si une ligne existe sans pole assigné (cas non prévu), la migration s'arrête ici plutôt
-- que de poser une contrainte NOT NULL qui casserait silencieusement une ligne inconnue
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.annonces WHERE pole IS NULL) THEN
    RAISE EXCEPTION 'Des annonces sans pole assigné existent encore — backfill incomplet, migration arrêtée';
  END IF;
END $$;

-- Contraintes strictes
ALTER TABLE public.annonces ALTER COLUMN pole SET NOT NULL;
ALTER TABLE public.annonces ADD CONSTRAINT annonces_pole_check CHECK (pole IN ('ecole', 'entreprise'));
ALTER TABLE public.annonces ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.annonces ADD CONSTRAINT annonces_user_pole_unique UNIQUE (user_id, pole);
