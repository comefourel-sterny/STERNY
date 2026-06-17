// PlancheCouverturePreview — DEV ONLY, à retirer (route /dev/planche-couverture).
// Cale le look de <PlancheCouverture> en npm run dev, posée dans une fausse .dp-card
// pour simuler le futur emplacement dashboard. Données EN DUR (aucune vraie donnée).
// Lecture « couverture d'abord » en aplats : couleur = nature (école orange / entreprise
// navy) ; couvert = aplat plein ; à couvrir = aplat pâle + contour ; déjà logé / passé = gris.

import PlancheCouverture from '../components/rhythm/PlancheCouverture';
import {
  firstMondayForAcademicYear,
  academicYearForMonday,
} from '../utils/academicYear';
import '../pages/dashboard/DashboardProprietairePage.css'; // pour .dp-card / .dp-card-title

const DAY_MS = 24 * 60 * 60 * 1000;
const ANNEE_DEMO = '2026-2027';

function formatISO(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Démo mono-ville : alternant qui CHERCHE dans sa ville d'ÉCOLE. Rythme imité par blocs
// (~2 semaines école cherchées, ~1 semaine entreprise déjà logée). « Logé » 1 école sur 2.
function genererDemo(yearStr) {
  const map = {};
  let mondayTs = firstMondayForAcademicYear(yearStr);
  let i = 0;
  while (academicYearForMonday(formatISO(mondayTs)) === yearStr) {
    const iso = formatISO(mondayTs);
    if (i % 3 < 2) {
      map[iso] = { nature: 'ecole', cherchee: true, couvert: i % 2 === 0 };
    } else {
      map[iso] = { nature: 'entreprise', cherchee: false };
    }
    mondayTs += 7 * DAY_MS;
    i++;
  }
  return map;
}

const ETATS_DEMO = genererDemo(ANNEE_DEMO);

const PAGE_STYLE = { maxWidth: 760, margin: '0 auto', padding: '40px 20px' };
const SUBTITLE_STYLE = {
  fontSize: 13, fontWeight: 600, color: 'rgba(30, 41, 59, 0.6)',
  textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px',
};
const LEGEND_STYLE = { display: 'flex', flexWrap: 'wrap', gap: 18, margin: '24px 0 0', fontSize: 13, color: '#1E293B' };

function LegendItem({ box, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, display: 'inline-block', ...box }} />
      {label}
    </span>
  );
}

export default function PlancheCouverturePreview() {
  return (
    <div style={PAGE_STYLE}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Preview — Planche à découper</h2>
      <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 13, margin: '0 0 24px' }}>
        DEV ONLY. Données en dur (année {ANNEE_DEMO}, alternant cherchant dans sa ville d'école).
        Lecture « couverture d'abord » : couvert = aplat plein · à couvrir = contour · contexte (déjà logé) / passé = gris.
        Flèches pour changer d'année (année adjacente = neutre).
      </p>

      {/* 1 — dans une .dp-card (emplacement dashboard cible) */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={SUBTITLE_STYLE}>1. Dans une .dp-card (cible dashboard)</h3>
        <div className="dp-card">
          <h3 className="dp-card-title">TON PLANNING À COUVRIR</h3>
          <PlancheCouverture etatsParSemaine={ETATS_DEMO} anneeScolaireInitiale={ANNEE_DEMO} />
        </div>
      </div>

      {/* 2 — composant nu, hors carte */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={SUBTITLE_STYLE}>2. Composant nu (hors carte)</h3>
        <PlancheCouverture etatsParSemaine={ETATS_DEMO} anneeScolaireInitiale={ANNEE_DEMO} />
      </div>

      {/* Légende — lecture « couverture d'abord » */}
      <div style={LEGEND_STYLE}>
        <LegendItem box={{ background: '#E8622A' }} label="Couvert" />
        <LegendItem box={{ background: '#FDEEE6', border: '1.5px solid #E8622A' }} label="À couvrir" />
        <LegendItem box={{ background: '#E9EBEF' }} label="Déjà logé / passé" />
      </div>
    </div>
  );
}
