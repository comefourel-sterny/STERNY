# Spike #1 — Étape 1B.6.2 — Match report Matthieu

Generated: 2026-04-29T13:28:05.968Z

## 1. Score par groupe + consolidé

- **M1 CCA** : 52 / 54 (96.3%)
- **M2 CCA** : 54 / 54 (100.0%)
- **Consolidé Matthieu** : **106 / 108 (98.1%)**

**Verdict cible cadrage 28 avril** : ≥80% = signal fort, 50-80% = zone grise, <50% = pdf.js insuffisant
**Verdict observé** : **signal fort**

### Stats extraction

| Mesure | M1 | M2 |
|---|---:|---:|
| Fills total page | 245 | 252 |
| Fills métier retenus | 77 | 84 |
| Fills dépliés (width > 150) | 5 | 2 |
| Dates invalides ignorées | 2 | 2 |
| Semaines unknown squelette | 2 | 0 |

## 2. Anomalie attendue — Soutenance M2 (DETTE #40)

Semaine du 1er juin 2026 (M2) : pdf.js a extrait **3/5 jours école** (jours 1, 2, 3 juin uniquement, jours 4-5 absents du JSON).

- Status squelette obtenu : **school** (confidence 0.6)
- Statut attendu vérité terrain : **school**
- Match Soutenance : **✅ oui**

Score M2 obtenu : **54 / 54 (100.0%)**
Plafond théorique M2 (si Soutenance était correctement classée) : **54 / 54 (100.0%)**

Note : malgré l'anomalie DETTE #40 (2 jours manquants), la politique 3/5 a tranché correctement (3 votes ≥ 3 → school = attendu). Le score M2 ne souffre donc PAS mécaniquement de la DETTE #40 ici. La confidence reste impactée (0.6 au lieu de 1.0).

## 3. Liste des mismatches

### M1_CCA_2025-2026 — 2 mismatches

| week_start_iso | attendu | observé PDF (col 3) | status squelette | votes | confiance pre-saisie | notes |
|---|---|---|---|---:|---|---|
| 2026-03-02 | school | school | unknown (#ffff00 #ffff00) | 2 | basse | 2/5 jours école détectés - vérifier - fill multi-cellules à vérifier visuellement |
| 2026-03-16 | school | school | unknown (#ffff00 #ffff00) | 2 | basse | 2/5 jours école détectés - vérifier - fill multi-cellules à vérifier visuellement |

### M2_CCA_2025-2026 — 0 mismatches

_Aucun mismatch sur ce groupe._

## 4. Analyse des semaines unknown du squelette

### M1_CCA_2025-2026 — 2 unknown

| week_start_iso | votes (1 ou 2) | attendu CSV | observé PDF | confiance pré-saisie | notes |
|---|---:|---|---|---|---|
| 2026-03-02 | 2 | school | school | basse | 2/5 jours école détectés - vérifier - fill multi-cellules à vérifier visuellement |
| 2026-03-16 | 2 | school | school | basse | 2/5 jours école détectés - vérifier - fill multi-cellules à vérifier visuellement |

**Ventilation des unknown M1_CCA_2025-2026 par confiance pré-saisie** :

- haute  : 0
- moyenne: 0
- basse  : 2

Lecture : si les unknown se concentrent sur les semaines pré-flaguées `basse` à la génération du squelette, c'est un signal que le pré-screening était bien calibré. Sinon, problème de classification plus large à creuser.

### M2_CCA_2025-2026 — 0 unknown

_Aucun unknown sur ce groupe._

## 5. Commentaires libres

_(à remplir manuellement après lecture du rapport)_
