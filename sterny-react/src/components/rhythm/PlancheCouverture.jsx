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
//   etatsParSemaine      : objet { "YYYY-MM-DD" (lundi ISO) : { nature, cherchee, couvert, enAttente } }
//                          nature  : 'ecole' (orange) | 'entreprise' (navy) — la couleur
//                          cherchee: true = ville cherchée | false = déjà logé (gris neutre)
//                          couvert : true = vert plein + check blanc coin | false = blanc + loupe coin (à couvrir)
//                          enAttente: true = candidaté sans contrat signé → aplat ardoise #64748B + sablier coin
//                                     (précédence : couvert > enAttente > à couvrir).
//                          Icônes (loupe / sablier / check) toutes en coin bas-droite, via background-image SVG.
//                          Semaine absente → gris neutre. Passé → prime → gris neutre.
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
              // Lecture "couverture d'abord" : couvert (aplat plein) / à couvrir (contour) /
              // contexte (semaine où l'alternant ne cherche pas) / passé / neutre. Aucune icône.
              const passee = w.weekStart < lundiCourant;
              const d = etatsParSemaine[w.weekStart];

              let modificateur;
              if (passee) {
                modificateur = 'passee';
              } else if (!d) {
                modificateur = 'neutre';
              } else if (d.cherchee) {
                const nat = d.nature === 'entreprise' ? 'entreprise' : 'ecole';
                // Précédence : couvert (signé) > en attente (candidaté) > à couvrir.
                if (d.couvert) modificateur = `${nat}-loge`;
                else if (d.enAttente) modificateur = `${nat}-attente`;
                else modificateur = `${nat}-cherche`;
              } else {
                // Ville où l'alternant est déjà logé → contexte gris (nature non distinguée).
                modificateur = 'contexte';
              }

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
