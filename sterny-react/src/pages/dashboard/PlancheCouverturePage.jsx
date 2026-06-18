// PlancheCouverturePage — page réelle de la « planche à découper » (Étape B1).
// Parent de habillage du composant NU PlancheCouverture : cadre verre dépoli + en-tête
// « Ton planning » + résumé. Habillage 100% INLINE (pas de classe .dp-card, aucun import
// CSS dashboard → on évite le couplage DETTE #35). Tout le visible est porté ici.
//
// B1 : alimentée par des DONNÉES EN DUR (copiées de la preview dev). PAS de fetch, pas de
// deduireRecherche — le branchement des vraies semaines viendra en B2 ; les accès
// menu/carrousel viendront en B3. Posée sur le fond réel du dashboard (#F4F5F7), sans
// fond artificiel : on teste ici si le verre dépoli rend sur ce fond plat.

import PlancheCouverture from '../../components/rhythm/PlancheCouverture';
import {
  firstMondayForAcademicYear,
  academicYearForMonday,
} from '../../utils/academicYear';

const DAY_MS = 24 * 60 * 60 * 1000;
const ANNEE_DEMO = '2026-2027';

function formatISO(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Données en dur (B1), identiques à la preview : alternant qui cherche dans sa ville d'école.
// Motif 12 semaines (hors 7 / couvert 3 / à-couvrir 2) sur toute l'année scolaire.
function genererDemo(yearStr) {
  const map = {};
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

// Wrapper de page minimal (inline) : centrage horizontal + marges de respiration.
// Aucune classe dashboard, aucun fond artificiel → la page se pose sur le fond réel (#F4F5F7).
const PAGE_STYLE = { maxWidth: 760, margin: '0 auto', padding: '40px 20px', minHeight: 'calc(100vh - 85px)' };

// Titre de section : copie LOCALE des valeurs de .dp-card-title du dashboard.
const TITRE_STYLE = { fontSize: 15, fontWeight: 300, color: '#E8622A', textTransform: 'uppercase', letterSpacing: 2, margin: 0 };
const RESUME_STYLE = { fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 15, color: '#9AA3B2', margin: 0 };
// Carte = cadre en verre dépoli (façon modal flouté de /recherche).
const CARTE_STYLE = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px) saturate(140%)',
  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.9)',
  borderRadius: 26,
  boxShadow: '0 12px 40px rgba(30,41,59,0.12)',
  padding: 28,
};

export default function PlancheCouverturePage() {
  // N = semaines cherchées encore à couvrir (cherchee && !couvert).
  const aCouvrir = Object.values(ETATS_DEMO).filter((e) => e.cherchee === true && e.couvert === false).length;

  return (
    <div style={PAGE_STYLE}>
      <div style={CARTE_STYLE}>
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
  );
}
