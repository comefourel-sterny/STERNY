// ParcoursPropositionPreview — DEV ONLY, route /dev/parcours-proposition.
// Écran de conception "parcours guidé de couverture" : propose UN logement à la fois
// (le plus couvrant des semaines restantes) pour aider le locataire à combler son planning.
// 100% MOCKÉ : aucune donnée Supabase, aucun useAuth, aucun réseau.
// Réutilisera plus tard couvertureSemaines / deduireRecherche / <PlancheCouverture> (ici tout en dur).

import PlancheCouverture from '../../components/rhythm/PlancheCouverture';
import { firstMondayForAcademicYear, academicYearForMonday } from '../../utils/academicYear';

const DAY_MS = 24 * 60 * 60 * 1000;
const ANNEE_DEMO = '2026-2027'; // sept 2026 → août 2027 : entièrement futur, aucune semaine grisée

function formatISO(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// 12 premiers lundis de l'année académique démo (tous futurs).
function douzePremiersLundis(yearStr) {
  const out = [];
  let ts = firstMondayForAcademicYear(yearStr);
  while (out.length < 12 && academicYearForMonday(formatISO(ts)) === yearStr) {
    out.push(formatISO(ts));
    ts += 7 * DAY_MS;
  }
  return out;
}

const BESOIN = douzePremiersLundis(ANNEE_DEMO);                              // 12 semaines à couvrir (le "Y")
const COUVERTES = [BESOIN[0], BESOIN[2], BESOIN[4], BESOIN[6], BESOIN[8]];   // 5 que ce logement comblerait (le "X")

const LOGEMENT = {
  id: 'mock-1',
  titre: 'Studio Rennes centre',
  ville: 'Rennes',
  prix: 420,
  photo: null,
  couvertes: 5,
  totalCherchees: 12,
  semainesCouvertes: COUVERTES,
};

// etatsParSemaine : forme EXACTE attendue par PlancheCouverture
//   { "YYYY-MM-DD": { nature, cherchee, couvert, enAttente? } }
// Ici "planche du RESTANT" : les 12 semaines du besoin = à couvrir (cherchee:true, couvert:false).
// On ajoute proposee:true sur les 5 que ce logement comblerait, pour les surligner.
// ⚠️ PlancheCouverture ne LIT PAS encore `proposee` → les 5 ne sont PAS distinguées visuellement
//    pour l'instant (elles s'affichent comme les 7 autres "à couvrir"). À ajuster après revue.
const ETATS = {};
const couvertesSet = new Set(COUVERTES);
for (const lundi of BESOIN) {
  ETATS[lundi] = { nature: 'ecole', cherchee: true, couvert: false, proposee: couvertesSet.has(lundi) };
}

const RESTE = BESOIN.length; // 12 — toutes encore à couvrir dans ce mock

// ---- styles locaux (design system Sterny ; aucune classe globale, aucun import CSS dashboard) ----
const FONT = "'DM Sans', system-ui, -apple-system, sans-serif";
const PAGE = { maxWidth: 720, margin: '0 auto', padding: '40px 20px', fontFamily: FONT, color: '#1E293B' };
const TITRE = { fontSize: 22, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.25 };
const CARTE = {
  background: '#FFFFFF', borderRadius: 20, border: '1px solid #E8EAF0',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 28,
};
const PHOTO = {
  height: 150, background: '#1E293B', display: 'flex', alignItems: 'center',
  justifyContent: 'center', position: 'relative',
};
const BADGE = {
  position: 'absolute', top: 12, left: 12, background: '#E8622A', color: '#FFFFFF',
  fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 999,
};
const CARTE_BODY = { padding: '16px 18px' };
const PRIX = { fontSize: 18, fontWeight: 700, margin: 0 };
const SOUS_TITRE = {
  fontSize: 13, fontWeight: 600, color: 'rgba(30,41,59,0.6)',
  textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px',
};
const PLANCHE_CARTE = {
  background: '#F4F5F7', borderRadius: 16, padding: 20, marginBottom: 28,
};
const ACTIONS = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 };
const BTN_BASE = {
  fontFamily: FONT, fontSize: 15, fontWeight: 600, borderRadius: 12,
  padding: '12px 22px', cursor: 'pointer', border: 'none',
};
const BTN_PRIMAIRE = { ...BTN_BASE, background: '#E8622A', color: '#FFFFFF' };
const BTN_SECONDAIRE = { ...BTN_BASE, background: '#FFFFFF', color: '#1E293B', border: '1.5px solid #E8EAF0' };
const BTN_TERTIAIRE = { ...BTN_BASE, background: 'none', color: 'rgba(30,41,59,0.55)', fontWeight: 500, padding: '12px 8px' };
const PROGRESSION = { fontSize: 13, color: 'rgba(30,41,59,0.5)', margin: 0, textAlign: 'center' };

export default function ParcoursPropositionPreview() {
  return (
    <div style={PAGE}>
      <p style={{ color: 'rgba(30,41,59,0.55)', fontSize: 12, margin: '0 0 16px' }}>
        DEV ONLY — /dev/parcours-proposition. Données 100% mockées, rien branché.
      </p>

      {/* 1 — rappel du restant */}
      <h1 style={TITRE}>Il te reste <span style={{ color: '#E8622A' }}>{RESTE} semaines</span> à couvrir</h1>

      {/* 2 — carte annonce mockée */}
      <div style={CARTE}>
        <div style={PHOTO}>
          <span style={BADGE}>✓ couvre {LOGEMENT.couvertes} de tes {LOGEMENT.totalCherchees} restantes</span>
          {!LOGEMENT.photo && (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          )}
        </div>
        <div style={CARTE_BODY}>
          <p style={PRIX}>{LOGEMENT.prix}€<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(30,41,59,0.6)' }}> / semaine</span></p>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '4px 0 2px' }}>{LOGEMENT.titre}</p>
          <p style={{ fontSize: 14, color: 'rgba(30,41,59,0.6)', margin: 0 }}>{LOGEMENT.ville}</p>
        </div>
      </div>

      {/* 3 — mini-planche : ce que ce logement comblerait */}
      <h3 style={SOUS_TITRE}>Ce logement comblerait :</h3>
      <div style={PLANCHE_CARTE}>
        <PlancheCouverture etatsParSemaine={ETATS} anneeScolaireInitiale={ANNEE_DEMO} />
      </div>

      {/* 4 — actions (non fonctionnelles, console.log) */}
      <div style={ACTIONS}>
        <button style={BTN_PRIMAIRE} onClick={() => console.log('[mock] Candidater', LOGEMENT.id)}>Candidater</button>
        <button style={BTN_SECONDAIRE} onClick={() => console.log('[mock] Voir l\'annonce', LOGEMENT.id)}>Voir l'annonce</button>
        <button style={BTN_TERTIAIRE} onClick={() => console.log('[mock] Passer', LOGEMENT.id)}>Passer</button>
      </div>

      {/* 5 — progression */}
      <p style={PROGRESSION}>logement 1 sur 6 qui te couvrent</p>
    </div>
  );
}
