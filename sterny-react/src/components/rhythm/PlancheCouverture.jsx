// PlancheCouverture — composant d'AFFICHAGE (chantier "planche à découper", T1.2 révision).
// Rend l'ANNÉE SCOLAIRE COMPLÈTE (sept→août, 12 colonnes mois, règle ISO du jeudi),
// colorée par état de couverture, avec flèches de navigation entre années scolaires.
// Reprend le LOOK du calendrier d'inscription (RhythmManualBuilder) SANS sa machinerie
// de saisie : aucune cellule cliquable, aucune saisie, aucune logique multi-années de
// saisie (DETTE #82). Seule interaction = les flèches qui changent l'année AFFICHÉE.
//
// Helpers d'année scolaire ET construction du squelette (weeksForAcademicYear /
// groupByMonth) importés de utils/academicYear (source unique partagée, extraite ici
// pour être réutilisée par la mini-planche de LogementPage — plus de copie locale).
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
//   proposee (optionnel, mode parcours guidé) : true = semaine que le logement proposé
//   comblerait → surbrillance orange ; false = à couvrir NON comblée par ce logement → atténuée.
//   Clé ABSENTE (/mon-calendrier) → rendu à-couvrir normal, strictement inchangé.
//                          Icônes (loupe / sablier / check) toutes en coin bas-droite, via background-image SVG.
//                          Semaine absente → gris neutre. Passé → prime → gris neutre.
//   anneeScolaireInitiale: "YYYY-YYYY+1" (optionnel) ; défaut = année contenant aujourd'hui.
//   className            : classe optionnelle sur le conteneur racine.

import { useEffect, useMemo, useState } from 'react';
import {
  computeDefaultAcademicYear,
  nextAcademicYear,
  previousAcademicYear,
  currentMondayISO,
  weeksForAcademicYear,
  groupByMonth,
} from '../../utils/academicYear';
import './PlancheCouverture.css';

export default function PlancheCouverture({ etatsParSemaine = {}, anneeScolaireInitiale, className = '', onSemaineClick }) {
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
                else if (d.proposee === true) modificateur = `${nat}-propose`;
                else if (d.proposee === false) modificateur = `${nat}-cherche-attenue`;
                else modificateur = `${nat}-cherche`;
              } else {
                // Ville où l'alternant est déjà logé → contexte gris (nature non distinguée).
                modificateur = 'contexte';
              }

              // Cliquable UNIQUEMENT si un parent fournit onSemaineClick, que la semaine a un
              // état connu (d) et n'est pas passée. Sinon : rendu strictement inchangé (affichage).
              const cliquable = typeof onSemaineClick === 'function' && Boolean(d) && !passee;

              return (
                <div
                  key={w.weekStart}
                  className={`plc-cell plc-${modificateur}`}
                  title={`Semaine du ${w.weekStart}`}
                  {...(cliquable
                    ? {
                        onClick: () => onSemaineClick(w.weekStart),
                        style: { cursor: 'pointer' },
                        role: 'button',
                        tabIndex: 0,
                        onKeyDown: (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSemaineClick(w.weekStart);
                          }
                        },
                      }
                    : {})}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
