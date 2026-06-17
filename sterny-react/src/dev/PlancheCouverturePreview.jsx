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

// Démo mono-ville : alternant qui cherche dans sa ville d'ÉCOLE. Distribution réaliste
// sur toute l'année pour visualiser la grille + le flou : majorité de semaines
// HORS-RECHERCHE (floutées), un bon paquet de COUVERTES (vert), plusieurs À COUVRIR
// (creux loupe). Déterministe via un motif de 12 semaines (hors 7 / couvert 3 / à-couvrir 2).
function genererDemo(yearStr) {
  const map = {};
  // 'hors' = pas dans sa recherche ; 'couvert' = cherchée + logée ; 'acouvrir' = cherchée + à loger.
  const motif = ['hors', 'couvert', 'hors', 'acouvrir', 'hors', 'couvert', 'hors', 'hors', 'couvert', 'acouvrir', 'hors', 'hors'];
  let mondayTs = firstMondayForAcademicYear(yearStr);
  let i = 0;
  while (academicYearForMonday(formatISO(mondayTs)) === yearStr) {
    const iso = formatISO(mondayTs);
    const t = motif[i % motif.length];
    if (t === 'couvert') {
      map[iso] = { nature: 'ecole', cherchee: true, couvert: true };
    } else if (t === 'acouvrir') {
      map[iso] = { nature: 'ecole', cherchee: true, couvert: false };
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

// Titre de section : copie LOCALE des valeurs de .dp-card-title du dashboard
// (font-size 15 / weight 300 / orange / uppercase / letter-spacing 2) — pas d'import de classe.
const TITRE_STYLE = { fontSize: 15, fontWeight: 300, color: '#E8622A', textTransform: 'uppercase', letterSpacing: 2, margin: 0 };
const RESUME_STYLE = { fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 15, color: '#9AA3B2', margin: 0 };
// Panneau 1 = cadre en verre dépoli (façon modal flouté de /recherche).
const CARTE1_STYLE = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px) saturate(140%)',
  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.9)',
  borderRadius: 26,
  boxShadow: '0 12px 40px rgba(30,41,59,0.12)',
  padding: 28,
};

function LegendItem({ box, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, display: 'inline-block', ...box }} />
      {label}
    </span>
  );
}

export default function PlancheCouverturePreview() {
  // N = semaines cherchées encore à couvrir (cherchee && !couvert) dans les états démo.
  const aCouvrir = Object.values(ETATS_DEMO).filter((e) => e.cherchee === true && e.couvert === false).length;

  return (
    <div style={PAGE_STYLE}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Preview — Planche à découper</h2>
      <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 13, margin: '0 0 24px' }}>
        DEV ONLY. Données en dur (année {ANNEE_DEMO}, alternant cherchant dans sa ville d'école).
        Lecture « couverture d'abord » : couvert = vert · à couvrir = blanc + loupe (contour gris) · hors-sujet (déjà logé / passé) = gris flouté en retrait.
        Flèches pour changer d'année (année adjacente = neutre).
      </p>

      {/* 1 — dans une .dp-card (emplacement dashboard cible) */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={SUBTITLE_STYLE}>1. Dans une .dp-card (cible dashboard)</h3>
        <div className="dp-card" style={CARTE1_STYLE}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
            <h3 style={TITRE_STYLE}>Ton planning</h3>
            <p style={RESUME_STYLE}>
              {aCouvrir === 0
                ? 'Ton planning est entièrement couvert'
                : <>Il te reste <strong style={{ fontWeight: 600, color: '#6B7280' }}>{aCouvrir} {aCouvrir === 1 ? 'semaine' : 'semaines'}</strong> à couvrir</>}
            </p>
          </div>
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
        <LegendItem box={{ background: '#57B98C' }} label="Couvert" />
        <LegendItem box={{ background: '#FFFFFF', border: '1.5px solid #B4BCC8' }} label="À couvrir" />
        <LegendItem box={{ background: '#D9DEE6' }} label="Hors-sujet (déjà logé / passé)" />
      </div>
    </div>
  );
}
