// RhythmManualBuilder — composant v1 desktop-only (cf. DETTE #44).
// Chemin 3 de la stratégie discriminante par format source (VISION §5).
// Saisie manuelle assistée du calendrier d'alternance, autonome, indépendant
// du parser LLM. Persistance via la RPC atomique confirm_rhythm_calendar_manual
// (cf. supabase/migrations/20260502120000_*.sql, commit 0c953ff).
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

import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabaseClient } from '../../config/supabase';
import './RhythmManualBuilder.css';

const TOTAL_WEEKS = 52;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Helpers année académique ----------

// Année académique courante selon la date du jour réelle.
// "YYYY-YYYY+1" couvre du 1er sept YYYY au 31 août YYYY+1.
function computeDefaultAcademicYear() {
  const now = new Date();
  const Y = now.getUTCFullYear();
  const M = now.getUTCMonth() + 1; // 1..12
  if (M >= 9) return `${Y}-${Y + 1}`;
  return `${Y - 1}-${Y}`;
}

function nextAcademicYear(yearStr) {
  const [a, b] = yearStr.split('-').map((n) => parseInt(n, 10));
  return `${a + 1}-${b + 1}`;
}

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

export default function RhythmManualBuilder({
  initialCalendar,
  villeRecherchee,
  onConfirm,
  onCancel,
}) {
  if (villeRecherchee !== 'ecole' && villeRecherchee !== 'entreprise') {
    throw new Error(
      "RhythmManualBuilder: prop villeRecherchee doit être 'ecole' ou 'entreprise'"
    );
  }

  // Année académique : courante par défaut, suivante optionnelle.
  const defaultYear = useMemo(() => computeDefaultAcademicYear(), []);
  const nextYear = useMemo(() => nextAcademicYear(defaultYear), [defaultYear]);

  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const allWeeks = useMemo(
    () => generateWeeks(firstMondayForAcademicYear(selectedYear)),
    [selectedYear]
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
      const initialWeeks = generateWeeks(firstMondayForAcademicYear(defaultYear));
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Au changement d'année académique : reset des cases cliquées (la spec
  // simplifie ainsi la v1 — pas de confirmation, pas de tentative de
  // mappage entre les 2 années).
  const handleYearChange = useCallback((newYear) => {
    setSelectedYear(newYear);
    setClicked(new Set());
  }, []);

  const toggleWeek = useCallback(
    (weekStart) => {
      // Guard : les semaines passées sont non-cliquables (déjà bloquées
      // par disabled sur le bouton, garde redondante pour la lisibilité).
      if (pastWeekStarts.has(weekStart)) return;
      setClicked((prev) => {
        const next = new Set(prev);
        if (next.has(weekStart)) next.delete(weekStart);
        else next.add(weekStart);
        return next;
      });
    },
    [pastWeekStarts]
  );

  const handleOpenModal = useCallback(() => {
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (submitting) return; // bloquer fermeture pendant l'appel RPC
    setModalOpen(false);
    setSubmitError(null);
  }, [submitting]);

  const handleConfirmModal = useCallback(async () => {
    // Matérialiser les 52 semaines :
    //   - passée → 'company' systématiquement (VISION §3)
    //   - non-passée → sélection inverse selon villeRecherchee (Q8)
    const materialized = allWeeks.map((w) => {
      if (pastWeekStarts.has(w.weekStart)) {
        return { week_start: w.weekStart, status: 'company' };
      }
      const isPresent = clicked.has(w.weekStart);
      let status;
      if (villeRecherchee === 'ecole') {
        status = isPresent ? 'school' : 'company';
      } else {
        status = isPresent ? 'company' : 'school';
      }
      return { week_start: w.weekStart, status };
    });

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabaseClient.rpc(
      'confirm_rhythm_calendar_manual',
      { p_calendar: materialized }
    );

    setSubmitting(false);

    if (error) {
      // Les RAISE EXCEPTION PostgreSQL sont remontées par PostgREST avec
      // error.code = SQLSTATE. Cf. migration 20260502120000.
      let userMsg;
      if (error.code === '28000') {
        userMsg =
          "Tu dois être connecté en tant qu'alternant pour enregistrer ton planning. Reconnecte-toi puis réessaie.";
      } else if (error.code === '22023') {
        userMsg =
          'Le format du planning est invalide. Si le problème persiste, contacte le support.';
      } else {
        userMsg =
          "Une erreur s'est produite lors de l'enregistrement. Réessaie dans quelques instants.";
      }
      setSubmitError(userMsg);
      return;
    }

    setModalOpen(false);
    onConfirm(materialized);
  }, [allWeeks, clicked, pastWeekStarts, villeRecherchee, onConfirm]);

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
      ? "Clique uniquement les semaines où tu seras à l'école. Sterny en déduira automatiquement les semaines opposées en entreprise."
      : "Clique uniquement les semaines où tu seras en entreprise. Sterny en déduira automatiquement les semaines opposées à l'école.";

  return (
    <div className={`rmb-root rmb-${villeRecherchee}`}>
      {/* Zone 0 — sélecteur d'année académique (Q10) */}
      <div className="rmb-year-selector">
        <label className="rmb-year-label" htmlFor="rmb-year-select">
          Année académique :
        </label>
        <select
          id="rmb-year-select"
          className="rmb-year-select"
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
        >
          <option value={defaultYear}>{defaultYear}</option>
          <option value={nextYear}>{nextYear}</option>
        </select>
      </div>

      {/* Zone 1 — consigne dynamique selon villeRecherchee */}
      <p className="rmb-instructions">{consigne}</p>

      {/* Zone 2 — compteur live unique (Q11 D) */}
      <div className="rmb-counter-line">
        <span className="rmb-counter-value">{presentCount}</span> / {TOTAL_WEEKS}{' '}
        semaines sélectionnées
      </div>

      {/* Grille 12 colonnes mensuelles */}
      <div className="rmb-grid">
        {monthsLayout.map((month) => (
          <div key={month.key} className="rmb-month-column">
            <div className="rmb-month-header">{month.label}</div>
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

      {/* Zone 3 — actions */}
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

      {/* Modale Q8 — wording v1 archivé DETTE #45 */}
      {modalOpen && (
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
              Avant de confirmer, vérifiez votre planning
            </h3>
            <div className="rmb-modal-body">
              <p>
                Ce calendrier indique les semaines où vous serez présent dans
                le logement que vous cherchez. Sterny s'en sert pour vous
                mettre en relation avec un autre alternant dont les semaines
                de présence sont opposées aux vôtres — pour que vous
                n'occupiez jamais le logement en même temps.
              </p>
              <p>
                Deux types d'erreurs peuvent avoir des conséquences une fois
                le bail signé :
              </p>
              <p>
                — Si vous oubliez de cocher une semaine où vous serez
                réellement présent, vous pouvez vous retrouver dans le
                logement en même temps que l'autre alternant cette semaine-là.
              </p>
              <p>
                — Si vous cochez une semaine où vous serez en réalité
                ailleurs, vous paierez pour une semaine que vous n'occuperez
                pas, et l'autre alternant croira le logement occupé.
              </p>
              <p>
                Prenez un instant pour comparer ce calendrier à votre
                planning officiel d'alternance avant de continuer.
              </p>
            </div>
            <div className="rmb-modal-actions">
              <button
                type="button"
                className="rmb-modal-btn-secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Revenir au calendrier
              </button>
              <button
                type="button"
                className="rmb-modal-btn-primary"
                onClick={handleConfirmModal}
                disabled={submitting}
              >
                {submitting ? 'Enregistrement…' : 'Confirmer mon planning'}
              </button>
            </div>
            {submitError && (
              <div className="rmb-modal-error" role="alert">
                {submitError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
