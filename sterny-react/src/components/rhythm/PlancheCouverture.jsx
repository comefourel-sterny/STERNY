// PlancheCouverture — composant d'AFFICHAGE (chantier "planche à découper", T1.2 révision).
// Rend l'ANNÉE SCOLAIRE COMPLÈTE (sept→août, 12 colonnes mois, règle ISO du jeudi),
// colorée par état de couverture, avec flèches de navigation entre années scolaires.
// Reprend le LOOK du calendrier d'inscription (RhythmManualBuilder) SANS sa machinerie
// de saisie : aucune cellule cliquable, aucune saisie, aucune logique multi-années de
// saisie (DETTE #82). Seule interaction = les flèches qui changent l'année AFFICHÉE.
//
// Helpers d'année scolaire importés de utils/academicYear (source unique partagée) ;
// la construction du squelette (weeksForAcademicYear / groupByMonth) est COPIÉE du
// builder en version affichage (décision actée : copier le look, pas partager le code).
//
// Composant "NU" (INVENTAIRE 9.4) : ni fond, ni radius, ni ombre, ni titre propres.
// Posé plus tard dans une .dp-card parent (cf. preview /dev/planche-couverture).
//
// Props :
//   etatsParSemaine      : objet { "YYYY-MM-DD" (lundi ISO) : 'a-decouvert' | 'couvert' }
//                          pour les semaines CHERCHÉES seulement. Toute semaine du
//                          squelette absente de la map → 'hors-recherche' par défaut.
//   anneeScolaireInitiale: "YYYY-YYYY+1" (optionnel) ; défaut = année contenant aujourd'hui.
//   className            : classe optionnelle sur le conteneur racine.

import { useEffect, useMemo, useState } from 'react';
import {
  computeDefaultAcademicYear,
  nextAcademicYear,
  previousAcademicYear,
  firstMondayForAcademicYear,
  academicYearForMonday,
  currentMondayISO,
} from '../../utils/academicYear';
import './PlancheCouverture.css';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatISO(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Semaines d'une année scolaire (sept Y → août Y+1) : depuis son 1er lundi, tant que
// la semaine appartient encore à cette année (classement par le mois du jeudi).
function weeksForAcademicYear(yearStr) {
  const weeks = [];
  let mondayTs = firstMondayForAcademicYear(yearStr);
  while (academicYearForMonday(formatISO(mondayTs)) === yearStr) {
    weeks.push({ weekStart: formatISO(mondayTs), thursdayTs: mondayTs + 3 * DAY_MS });
    mondayTs += 7 * DAY_MS;
  }
  return weeks;
}

// Regroupement par mois (mois qui contient le jeudi). 12 colonnes sept→août.
function groupByMonth(weeks) {
  const months = [];
  const map = new Map();
  for (const w of weeks) {
    const t = new Date(w.thursdayTs);
    const key = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      const label = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))
        .toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
        .toUpperCase()
        .slice(0, 3);
      const bucket = { key, label, weeks: [] };
      map.set(key, bucket);
      months.push(bucket);
    }
    map.get(key).weeks.push(w);
  }
  return months;
}

export default function PlancheCouverture({ etatsParSemaine = {}, anneeScolaireInitiale, className = '' }) {
  const [annee, setAnnee] = useState(anneeScolaireInitiale || computeDefaultAcademicYear());

  // Resync si la prop d'année initiale arrive/change après le 1er rendu (robustesse).
  useEffect(() => {
    if (anneeScolaireInitiale) setAnnee(anneeScolaireInitiale);
  }, [anneeScolaireInitiale]);

  const mois = useMemo(() => groupByMonth(weeksForAcademicYear(annee)), [annee]);

  // Lundi de la semaine en cours : toute semaine antérieure est "passée" (inerte/barrée),
  // quel que soit son état de couverture.
  const lundiCourant = currentMondayISO();

  return (
    <div className={`plc-root ${className}`}>
      <div className="plc-nav">
        <button
          type="button"
          className="plc-arrow"
          onClick={() => setAnnee((y) => previousAcademicYear(y))}
          aria-label="Année scolaire précédente"
        >
          ‹
        </button>
        <span className="plc-year-label">{annee}</span>
        <button
          type="button"
          className="plc-arrow"
          onClick={() => setAnnee((y) => nextAcademicYear(y))}
          aria-label="Année scolaire suivante"
        >
          ›
        </button>
      </div>

      <div className="plc-grid">
        {mois.map((m) => (
          <div key={m.key} className="plc-month-column">
            <div className="plc-month-header">{m.label}</div>
            {m.weeks.map((w) => {
              // Passée (avant le lundi courant) → barrée/inerte, peu importe l'état.
              // Sinon : couvert → vert ; a-decouvert → ambré ; sinon → barré (hors-recherche).
              const passee = w.weekStart < lundiCourant;
              const etatBrut = etatsParSemaine[w.weekStart];
              const modificateur = passee
                ? 'passee'
                : etatBrut === 'couvert'
                  ? 'couvert'
                  : etatBrut === 'a-decouvert'
                    ? 'a-decouvert'
                    : 'hors-recherche';
              return (
                <div
                  key={w.weekStart}
                  className={`plc-cell plc-${modificateur}`}
                  title={`Semaine du ${w.weekStart}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
