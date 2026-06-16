// PlancheCouverturePreview — DEV ONLY, à retirer (route /dev/planche-couverture).
// Cale le look de <PlancheCouverture> en npm run dev, posée dans une fausse .dp-card
// pour simuler le futur emplacement dashboard. Données EN DUR (aucune vraie donnée).

import PlancheCouverture from '../components/rhythm/PlancheCouverture';
import '../pages/dashboard/DashboardProprietairePage.css'; // pour .dp-card / .dp-card-title

// Année scolaire 2026-2027 (sept 2026 → août 2027). ~20 semaines cherchées
// ('a-decouvert'), dont 4 'couvert'. Tout le reste du squelette → gris implicite.
// L'année adjacente (flèches) sera toute grise : c'est normal (rien de cherché).
const ETATS_DEMO = {
  '2026-09-07': 'couvert',
  '2026-09-21': 'a-decouvert',
  '2026-10-05': 'a-decouvert',
  '2026-10-19': 'couvert',
  '2026-11-02': 'a-decouvert',
  '2026-11-16': 'a-decouvert',
  '2026-11-30': 'a-decouvert',
  '2026-12-14': 'a-decouvert',
  '2027-01-11': 'a-decouvert',
  '2027-01-25': 'couvert',
  '2027-02-08': 'a-decouvert',
  '2027-02-22': 'a-decouvert',
  '2027-03-08': 'a-decouvert',
  '2027-03-22': 'a-decouvert',
  '2027-04-05': 'couvert',
  '2027-04-19': 'a-decouvert',
  '2027-05-03': 'a-decouvert',
  '2027-05-17': 'a-decouvert',
  '2027-05-31': 'a-decouvert',
  '2027-06-14': 'a-decouvert',
};

const PAGE_STYLE = { maxWidth: 760, margin: '0 auto', padding: '40px 20px' };
const SUBTITLE_STYLE = {
  fontSize: 13, fontWeight: 600, color: 'rgba(30, 41, 59, 0.6)',
  textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px',
};
const LEGEND_STYLE = { display: 'flex', gap: 18, margin: '24px 0 0', fontSize: 13, color: '#1E293B' };

function Swatch({ color, border, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: color, border: border || '1px solid #E8EAF0', display: 'inline-block' }} />
      {label}
    </span>
  );
}

export default function PlancheCouverturePreview() {
  return (
    <div style={PAGE_STYLE}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Preview — Planche à découper</h2>
      <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 13, margin: '0 0 24px' }}>
        DEV ONLY. Données en dur (année scolaire 2026-2027). Affiche l'année complète sept→août ;
        utilise les flèches pour naviguer (l'année adjacente est toute grise = rien de cherché).
      </p>

      {/* 1 — dans une .dp-card (emplacement dashboard cible) */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={SUBTITLE_STYLE}>1. Dans une .dp-card (cible dashboard)</h3>
        <div className="dp-card">
          <h3 className="dp-card-title">TON PLANNING À COUVRIR</h3>
          <PlancheCouverture etatsParSemaine={ETATS_DEMO} anneeScolaireInitiale="2026-2027" />
        </div>
      </div>

      {/* 2 — composant nu, hors carte */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={SUBTITLE_STYLE}>2. Composant nu (hors carte)</h3>
        <PlancheCouverture etatsParSemaine={ETATS_DEMO} anneeScolaireInitiale="2026-2027" />
      </div>

      {/* Légende des 3 états */}
      <div style={LEGEND_STYLE}>
        <Swatch color="#94A3B8" border="1px solid transparent" label="Hors recherche" />
        <Swatch color="#FFFFFF" label="À découvert" />
        <Swatch color="#86EFAC" border="1px solid transparent" label="Couvert (vert à confirmer)" />
      </div>
    </div>
  );
}
