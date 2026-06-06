// RhythmManualBuilder — composant v1 desktop-only (cf. DETTE #44).
// Chemin 3 de la stratégie discriminante par format source (VISION §5).
// Saisie manuelle assistée du calendrier d'alternance, autonome, indépendant
// du parser LLM. Capture-only depuis conv 24 (31 mai 2026) : le composant
// émet le calendrier matérialisé via onConfirm(materialized), sans aucune
// écriture en base ; l'écriture (et le calcul des dates rhythm_start_date /
// rhythm_end_date) est faite à E-7 par la RPC complete_inscription_alternant.
// Voir docs/recherche/UNIFICATION-INSCRIPTION.md amendement 31 mai 2026.
//
// Cadrage : ETAT-COURANT bloc 2026-04-30 soir bis (Q1-Q9) + bloc 2026-05-02
// après-midi (Q10 sélecteur d'année, Q11 troncature dynamique).
//
// 2 corrections de Q validées par Côme :
//   - Q5 : cycle null/school/company → 2 états (cliquée ou non) suffisent
//     parce que Q8 (sélection inverse) gère la sémantique au moment de la
//     matérialisation finale.
//   - Q6 : « mois qui contient le lundi » → règle ISO du jeudi (la semaine
//     appartient au mois qui contient son jeudi). Donne pile 12 colonnes
//     pour 52 semaines, distribution 4-5 selon les mois.
//
// Q10 (2 mai après-midi) : sélecteur d'année académique (courante / suivante).
// Q11 (2 mai après-midi) : troncature dynamique des mois passés ; semaines
//     passées non-cliquables et auto-classées 'company' à la matérialisation
//     (VISION §3 alinéa « Pas de semaines vacances dans le modèle » — toute
//     semaine non-école est company par défaut).

import { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { computeDefaultAcademicYear, nextAcademicYear } from '../../utils/academicYear';
import PrimaryButton from '../auth-wizard/PrimaryButton';
import './RhythmManualBuilder.css';

const TOTAL_WEEKS = 52;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Helpers année académique ----------
// computeDefaultAcademicYear / nextAcademicYear : importés depuis
// ../../utils/academicYear (source unique partagée avec l'étape E-5).

// Premier lundi du calendrier visuel de l'année académique : lundi de la
// semaine qui contient le 1er septembre YYYY (peut tomber fin août).
function firstMondayForAcademicYear(yearStr) {
  const Y = parseInt(yearStr.split('-')[0], 10);
  const sept1Ts = Date.UTC(Y, 8, 1); // mois 8 = septembre (0-indexed)
  const dow = new Date(sept1Ts).getUTCDay(); // 0 dim .. 6 sam
  const isoDow = dow === 0 ? 7 : dow; // 1 lun .. 7 dim
  const offsetDays = isoDow - 1; // pas en arrière jusqu'au lundi
  return sept1Ts - offsetDays * DAY_MS;
}

// Années proposées par le sélecteur aujourd'hui (défaut + suivante).
// Source unique partagée par l'hydratation ET materialize. Bornée à 2 ans
// tant que la navigation par flèches (#82 ultérieur) n'est pas posée.
function candidateAcademicYears() {
  const y0 = computeDefaultAcademicYear();
  return [y0, nextAcademicYear(y0)];
}

// ---------- Helpers calendrier ----------

function formatISO(timestamp) {
  const d = new Date(timestamp);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateWeeks(firstMondayUtc) {
  const weeks = [];
  for (let i = 0; i < TOTAL_WEEKS; i++) {
    const mondayTs = firstMondayUtc + i * 7 * DAY_MS;
    const sundayTs = mondayTs + 6 * DAY_MS;
    const thursdayTs = mondayTs + 3 * DAY_MS;
    weeks.push({
      weekStart: formatISO(mondayTs),
      mondayTs,
      sundayTs,
      thursdayTs,
    });
  }
  return weeks;
}

// Règle ISO 8601 : une semaine appartient au mois qui contient son jeudi.
function groupByMonth(weeks) {
  const months = [];
  const monthMap = new Map();
  for (const w of weeks) {
    const t = new Date(w.thursdayTs);
    const monthIdx = t.getUTCMonth();
    const yearIdx = t.getUTCFullYear();
    const key = `${yearIdx}-${String(monthIdx).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      const label = new Date(Date.UTC(yearIdx, monthIdx, 1)).toLocaleDateString(
        'fr-FR',
        { month: 'short', year: '2-digit', timeZone: 'UTC' }
      );
      const bucket = { key, label, weeks: [] };
      monthMap.set(key, bucket);
      months.push(bucket);
    }
    monthMap.get(key).weeks.push(w);
  }
  return months;
}

function formatTooltip(mondayTs, sundayTs) {
  const fmt = (ts) =>
    new Date(ts).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  return `${fmt(mondayTs)} → ${fmt(sundayTs)}`;
}

// Lundi de la semaine ISO en cours, en UTC à 00:00.
function computeMondayCurrentISO() {
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const dow = new Date(todayUTC).getUTCDay();
  const isoDow = dow === 0 ? 7 : dow;
  const offsetDays = isoDow - 1;
  return todayUTC - offsetDays * DAY_MS;
}

// ---------- Composant ----------

const RhythmManualBuilder = forwardRef(function RhythmManualBuilder({
  initialCalendar,
  villeRecherchee,
  onConfirm,
  onCancel,
  onEmptyConfirm,
  // Props de pilotage externe (défauts = comportement actuel autonome).
  renderYearSelector = true, // false → la Zone 0 (sélecteur d'année) n'est pas rendue
  year,                      // si fourni → année contrôlée par le parent (sinon state interne)
  onYearChange,              // appelé au changement d'année (mode contrôlé)
  renderActions = true,      // false → le bloc rmb-actions (boutons) n'est pas rendu
  onChange,                  // appelé avec le calendrier matérialisé à chaque modif de semaine
}, ref) {
  if (villeRecherchee !== 'ecole' && villeRecherchee !== 'entreprise') {
    throw new Error(
      "RhythmManualBuilder: prop villeRecherchee doit être 'ecole' ou 'entreprise'"
    );
  }

  // Année académique : courante par défaut, suivante optionnelle.
  const defaultYear = useMemo(() => computeDefaultAcademicYear(), []);
  const nextYear = useMemo(() => nextAcademicYear(defaultYear), [defaultYear]);

  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Mode contrôlé : si `year` est fourni, il fait foi ; sinon state interne.
  const effectiveYear = year !== undefined ? year : selectedYear;

  const allWeeks = useMemo(
    () => generateWeeks(firstMondayForAcademicYear(effectiveYear)),
    [effectiveYear]
  );
  const monthsLayout = useMemo(() => groupByMonth(allWeeks), [allWeeks]);

  // Lundi de la semaine ISO en cours, calculé une seule fois au montage.
  const mondayCurrentISO = useMemo(() => computeMondayCurrentISO(), []);

  // Semaines passées : jeudi strictement antérieur au lundi de la semaine
  // ISO en cours. Recalculé à chaque changement d'année.
  const pastWeekStarts = useMemo(() => {
    const past = new Set();
    for (const w of allWeeks) {
      if (w.thursdayTs < mondayCurrentISO) past.add(w.weekStart);
    }
    return past;
  }, [allWeeks, mondayCurrentISO]);

  // État interne : Set des week_start *cliquées par l'utilisateur*
  // (présence dans le logement cherché). Exclut les semaines passées
  // (auto-classées 'company' à la matérialisation, non-modifiables).
  const [clicked, setClicked] = useState(() => {
    const s = new Set();
    if (Array.isArray(initialCalendar)) {
      const targetStatus =
        villeRecherchee === 'ecole' ? 'school' : 'company';
      const years = candidateAcademicYears();
      const initialWeeks = years.flatMap((yr) => generateWeeks(firstMondayForAcademicYear(yr)));
      const initialPast = new Set();
      for (const w of initialWeeks) {
        if (w.thursdayTs < computeMondayCurrentISO()) {
          initialPast.add(w.weekStart);
        }
      }
      const validInitial = new Set(initialWeeks.map((w) => w.weekStart));
      for (const entry of initialCalendar) {
        if (
          entry &&
          validInitial.has(entry.week_start) &&
          !initialPast.has(entry.week_start) &&
          entry.status === targetStatus
        ) {
          s.add(entry.week_start);
        }
      }
    }
    return s;
  });

  const [modalOpen, setModalOpen] = useState(false);

  // Multi-années (#82) : changer d'année ne vide PLUS les cases cliquées —
  // les sélections s'accumulent (clicked est keyé par lundi absolu, sans
  // collision entre années). L'hydratation initiale depuis initialCalendar
  // reste portée par l'initializer du useState ci-dessus.

  const handleYearChange = useCallback((newYear) => {
    if (year === undefined) setSelectedYear(newYear); // non contrôlé : on gère le state interne
    onYearChange?.(newYear);                          // contrôlé : on remonte au parent
  }, [year, onYearChange]);

  // Matérialise le calendrier sur l'UNION des années renseignées (#82).
  // Décision (b) : une année n'entre dans le calendrier que si l'utilisateur y a
  // coché au moins une semaine. Statut selon villeRecherchee (bidirectionnel) :
  // école → semaine cochée = 'school', sinon 'company' ; entreprise → semaine
  // cochée = 'company', sinon 'school'. Les semaines passées, non cliquables,
  // retombent du côté non coché. Set keyé par lundi absolu → pas de collision
  // entre années.
  const materialize = useCallback(
    (clickedSet) => {
      // Années candidates = celles proposées par le sélecteur (défaut + suivante).
      // Borné à 2 ans tant que la navigation par flèches n'est pas posée (#82 ultérieur).
      const candidateYears = candidateAcademicYears();

      const byWeekStart = new Map();
      for (const yr of candidateYears) {
        const weeks = generateWeeks(firstMondayForAcademicYear(yr));
        // (b) : on n'inclut une année que si au moins une de ses semaines est cochée
        if (!weeks.some((w) => clickedSet.has(w.weekStart))) continue;
        for (const w of weeks) {
          byWeekStart.set(w.weekStart, {
            week_start: w.weekStart,
            status:
              villeRecherchee === 'ecole'
                ? (clickedSet.has(w.weekStart) ? 'school' : 'company')
                : (clickedSet.has(w.weekStart) ? 'company' : 'school'),
          });
        }
      }
      return [...byWeekStart.values()].sort((a, b) =>
        a.week_start < b.week_start ? -1 : a.week_start > b.week_start ? 1 : 0
      );
    },
    [villeRecherchee]
  );

  const toggleWeek = useCallback(
    (weekStart) => {
      // Guard : les semaines passées sont non-cliquables (déjà bloquées
      // par disabled sur le bouton, garde redondante pour la lisibilité).
      if (pastWeekStarts.has(weekStart)) return;
      const next = new Set(clicked);
      if (next.has(weekStart)) next.delete(weekStart);
      else next.add(weekStart);
      setClicked(next);
      onChange?.(materialize(next)); // suivi externe (mode sans bouton interne)
    },
    [clicked, pastWeekStarts, onChange, materialize]
  );

  const handleOpenModal = useCallback(() => {
    if (clicked.size === 0) {
      onEmptyConfirm?.();
      return;
    }
    setModalOpen(true);
  }, [clicked, onEmptyConfirm]);

  // Déclenchement externe identique à l'ancien bouton interne (mode E-5 :
  // bouton "Continuer" rendu par la page → builderRef.current.requestConfirm()).
  useImperativeHandle(ref, () => ({ requestConfirm: handleOpenModal }), [handleOpenModal]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleConfirmModal = useCallback(() => {
    // Matérialise les 52 semaines (passée → 'company' VISION §3 ; non-passée
    // → inverse selon villeRecherchee Q8) via le helper partagé.
    const materialized = materialize(clicked);

    // Capture-only (conv 24) : aucune écriture en base ici. Le builder émet le
    // calendrier ; l'écriture one-pass (et le calcul des dates start/end) est
    // faite à E-7 par la RPC complete_inscription_alternant.
    // Voir docs/recherche/UNIFICATION-INSCRIPTION.md amendement 31 mai 2026.
    setModalOpen(false);
    onConfirm(materialized);
  }, [materialize, clicked, onConfirm]);

  // Touche Échap = équivalent strict de "Revenir au calendrier" (pas de
  // confirmation), sauf pendant l'appel RPC.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, handleCloseModal]);

  const presentCount = clicked.size;

  const consigne =
    villeRecherchee === 'ecole'
      ? "Clique sur les semaines où tu seras à l'école."
      : "Clique sur les semaines où tu seras en entreprise.";

  return (
    <div className={`rmb-root rmb-${villeRecherchee}`}>
      {/* Zone 0 — sélecteur d'année académique (Q10) */}
      {renderYearSelector && (
        <div className="rmb-year-selector">
          <label className="rmb-year-label" htmlFor="rmb-year-select">
            Année académique :
          </label>
          <select
            id="rmb-year-select"
            className="rmb-year-select"
            value={effectiveYear}
            onChange={(e) => handleYearChange(e.target.value)}
          >
            <option value={defaultYear}>{defaultYear}</option>
            <option value={nextYear}>{nextYear}</option>
          </select>
        </div>
      )}

      {/* Zone 1 — consigne dynamique selon villeRecherchee */}
      <p className="rmb-instructions">{consigne}</p>

      {/* Grille 12 colonnes mensuelles */}
      <div className="rmb-grid">
        {monthsLayout.map((month) => (
          <div key={month.key} className="rmb-month-column">
            <div className="rmb-month-header">{month.label.split(' ')[0].toUpperCase().slice(0, 3)}</div>
            {month.weeks.map((w) => {
              const isPast = pastWeekStarts.has(w.weekStart);
              const isClicked = clicked.has(w.weekStart);
              const tooltip = formatTooltip(w.mondayTs, w.sundayTs);
              const cellClass = isPast
                ? 'rmb-cell rmb-cell-past'
                : `rmb-cell ${isClicked ? 'rmb-cell-clicked' : 'rmb-cell-empty'}`;
              return (
                <button
                  key={w.weekStart}
                  type="button"
                  className={cellClass}
                  onClick={() => toggleWeek(w.weekStart)}
                  title={isPast ? 'Semaine déjà passée' : tooltip}
                  aria-label={
                    isPast
                      ? `Semaine du ${tooltip}, déjà passée`
                      : `Semaine du ${tooltip}, ${
                          isClicked ? 'sélectionnée' : 'non sélectionnée'
                        }`
                  }
                  aria-pressed={isPast ? undefined : isClicked}
                  disabled={isPast}
                  tabIndex={isPast ? -1 : 0}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Zone 2 — compteur live unique (Q11 D) */}
      <div className="rmb-counter-line">
        <span className="rmb-counter-value">{presentCount}</span>{' '}
        {presentCount <= 1 ? 'semaine sélectionnée' : 'semaines sélectionnées'}
      </div>

      {/* Zone 3 — actions */}
      {renderActions && (
        <div className="rmb-actions">
          {onCancel && (
            <button type="button" className="rmb-cancel-btn" onClick={onCancel}>
              Annuler
            </button>
          )}
          <button
            type="button"
            className="rmb-confirm-btn"
            onClick={handleOpenModal}
          >
            Confirmer mon planning
          </button>
        </div>
      )}

      {/* Modale Q8 — wording v1 archivé DETTE #45.
          Rendue via portal sur document.body : le transform résiduel de
          .aw-screen-card (animation fadeIn) piégerait sinon le position:fixed
          de l'overlay et clipperait la modale à la carte. */}
      {modalOpen && createPortal(
        <div
          className="rmb-modal-overlay"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rmb-modal-title-h"
        >
          <div
            className="rmb-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* TODO validation avocat avant production — wording v1 archivé dans docs/DETTE-TECHNIQUE.md DETTE #45 */}
            <h3 id="rmb-modal-title-h" className="rmb-modal-title">
              Vérifie ton planning
            </h3>
            <div className="rmb-modal-body">
              <p>
                Assure-toi d'avoir coché les bonnes semaines d'école. Une
                erreur peut te faire croiser l'autre alternant, ou payer une
                semaine que tu n'occupes pas.
              </p>
            </div>
            <div className="rmb-modal-actions">
              <PrimaryButton onClick={handleConfirmModal}>Confirmer mon planning</PrimaryButton>
              <button type="button" className="rmb-modal-back-link" onClick={handleCloseModal}>Revenir au calendrier</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

RhythmManualBuilder.displayName = 'RhythmManualBuilder';

export default RhythmManualBuilder;
