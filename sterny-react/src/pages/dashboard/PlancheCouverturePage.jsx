// PlancheCouverturePage — page réelle de la « planche à découper » (Étape B2).
// Parent d'habillage du composant NU PlancheCouverture : cadre verre dépoli + en-tête
// « Ton planning » + résumé. Habillage 100% INLINE (pas de classe .dp-card, aucun import
// CSS dashboard → on évite le couplage DETTE #35). Tout le visible est porté ici.
//
// B2 : alimentée par les VRAIES semaines cherchées du locataire connecté. Branchement
// repris verbatim de RecherchePage : fetch de la row users → deduireRecherche → semaines
// (lundis ISO, futur). Mono-ville (1ʳᵉ entrée 'recherche') ; cas 2 villes parqué.
// La planche s'ouvre sur l'ANNÉE de la 1ʳᵉ semaine cherchée. `couvert` reste false partout :
// la couverture réelle (semaines logées) dépend des contrats, pas encore branchée.

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { supabaseClient } from '../../config/supabase';
import { deduireRecherche } from '../../utils/deduireRecherche';
import { academicYearForMonday } from '../../utils/academicYear';
import PlancheCouverture from '../../components/rhythm/PlancheCouverture';

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
const CHARGEMENT_STYLE = { fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 15, color: '#9AA3B2', margin: 0 };

export default function PlancheCouverturePage() {
  const { user, loading: authLoading } = useAuth();

  // Profil connecté → villes/semaines cherchées (branchement repris verbatim de RecherchePage).
  const [deductionRecherche, setDeductionRecherche] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!user) { setDeductionRecherche([]); setChargement(false); return; }
    let annule = false;
    setChargement(true);
    (async () => {
      const { data } = await supabaseClient
        .from('users')
        .select('type_user, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar')
        .eq('id', user.id)
        .single();
      if (annule) return;
      setDeductionRecherche(data ? deduireRecherche(data) : []);
      setChargement(false);
    })();
    return () => { annule = true; };
  }, [user]);

  // Mono-ville : 1ʳᵉ entrée 'recherche'. Semaines = lundis ISO (futur, triés) déjà filtrés par deduireRecherche.
  const entree = deductionRecherche[0];
  const semaines = useMemo(() => entree?.semaines || [], [entree]);

  // Chaque semaine cherchée → { nature, cherchee:true, couvert:false } (couvert viendra avec les contrats).
  const etatsParSemaine = useMemo(() => {
    const map = {};
    for (const lundi of semaines) {
      map[lundi] = { nature: entree.nature, cherchee: true, couvert: false };
    }
    return map;
  }, [semaines, entree]);

  // Ouvre sur l'année de la 1ʳᵉ semaine cherchée ; sinon undefined → le composant retombe sur son défaut.
  const anneeScolaireInitiale = semaines.length ? academicYearForMonday(semaines[0]) : undefined;

  const aCouvrir = Object.values(etatsParSemaine).filter((e) => e.cherchee === true && e.couvert === false).length;

  return (
    <div style={PAGE_STYLE}>
      <div style={CARTE_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <h3 style={TITRE_STYLE}>Ton planning</h3>
          {!(authLoading || chargement) && (
            <p style={RESUME_STYLE}>
              {aCouvrir === 0
                ? 'Ton planning est entièrement couvert'
                : <>Il te reste <strong style={{ fontWeight: 600, color: '#6B7280' }}>{aCouvrir} {aCouvrir === 1 ? 'semaine' : 'semaines'}</strong> à couvrir</>}
            </p>
          )}
        </div>
        {(authLoading || chargement)
          ? <p style={CHARGEMENT_STYLE}>Chargement…</p>
          : <PlancheCouverture etatsParSemaine={etatsParSemaine} anneeScolaireInitiale={anneeScolaireInitiale} />}
      </div>
    </div>
  );
}
