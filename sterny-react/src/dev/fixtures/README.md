# Fixtures rhythm_calendar — outil dev

Mocks JSON de plannings réels parsés, utilisés par la page preview `/dev/rhythm-calendar-preview` pour itérer sur le composant `RhythmCalendar` sans dépendre de l'auth/RLS Supabase.

## Structure attendue

Chaque fichier suit la forme stockée dans `rhythm_imports.parsed_groups` :

```json
{
  "groups": [
    {
      "group_id": "...",
      "group_label": "...",
      "weeks": [
        { "week_start": "YYYY-MM-DD", "status": "school" | "company" }
      ]
    }
  ],
  "document_meta": {
    "school_name": "...",
    "program_name": "...",
    "academic_year": "...",
    "detected_locale": "..."
  }
}
```

## Fixtures actuelles

- `martin.json` — extrait de `rhythm_imports.id = 69a564e5-1444-4a6b-940c-0d9222fcee7d` (IUT Saint-Malo, BUT 3 GEA 2026/2027, 4 groupes)
- `mathis.json` — extrait de `rhythm_imports.id = 0ff13d90-c148-492c-a718-c4e57505c258` (Hyperplanning PDF, 1 groupe technique R_CA_A3)

## Comment régénérer

SQL à lancer dans le dashboard Supabase :

```sql
SELECT id, parsed_groups
FROM public.rhythm_imports
WHERE id IN (
  '69a564e5-1444-4a6b-940c-0d9222fcee7d',
  '0ff13d90-c148-492c-a718-c4e57505c258'
);
```

Copier la valeur de `parsed_groups` pour chaque ligne, et la coller dans le fichier correspondant.

## Pourquoi ces fichiers ne sont pas .gitignored

Pas de données personnelles : pas de noms d'élèves, pas d'emails, pas de pièces d'identité. Juste des semaines école/entreprise et le nom de l'école (qui est public). OK pour versionner.
