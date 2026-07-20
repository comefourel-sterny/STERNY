// PlancheCouverturePage — page réelle de la « planche à découper » (Étape B2).
// Parent d'habillage du composant NU PlancheCouverture : cadre verre dépoli + en-tête
// « Ton planning » + résumé. Habillage 100% INLINE (pas de classe .dp-card, aucun import
// CSS dashboard → on évite le couplage DETTE #35). Tout le visible est porté ici.
//
// B2 : alimentée par les VRAIES semaines cherchées du locataire connecté. Branchement
// repris verbatim de RecherchePage : fetch de la row users → deduireRecherche → semaines
// (lundis ISO, futur). Multi-villes (DETTE #142, correction du 19/07/2026 après retour
// visuel Côme) : la fusion des 2 villes en une seule vue faisait perdre la distinction
// utile école/entreprise (chaque semaine étant forcément l'une ou l'autre, le total
// fusionné tend vers "toute l'année", peu actionnable). Un seul point de vue affiché
// à la fois — filtré sur villeActiveIndex (0 par défaut = 1ʳᵉ ville). PAS de sélecteur
// visible sur cette page (retiré le 19/07/2026) : la bascule doit vivre à un seul
// endroit dans l'app (le dashboard, point 4 des 6 dettes du 15/07, encore à câbler),
// pas se dupliquer avec un état indépendant ici. En attendant ce câblage, la page
// retombe simplement sur la 1ʳᵉ ville trouvée.
// La planche s'ouvre sur l'ANNÉE de la 1ʳᵉ semaine de la ville active. `couvert` reste
// false partout : la couverture réelle (semaines logées) dépend des contrats, pas encore
// branchée.

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
  // Candidatures du locataire → semaines « en attente » (candidaté, pas encore signé).
  const [candidatures, setCandidatures] = useState([]);
  const [chargement, setChargement] = useState(true);
  // Ville active (index dans deductionRecherche). Fixée à 0 (1ʳᵉ ville) : pas de
  // sélecteur sur cette page (voir commentaire d'en-tête) — setVilleActiveIndex
  // n'existe pas encore, rien ne fait varier cet index pour l'instant.
  const villeActiveIndex = 0;

  useEffect(() => {
    if (!user) { setDeductionRecherche([]); setCandidatures([]); setChargement(false); return; }
    let annule = false;
    setChargement(true);
    (async () => {
      const [{ data: userRow }, { data: candRows }] = await Promise.all([
        supabaseClient
          .from('users')
          .select('type_user, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar')
          .eq('id', user.id)
          .single(),
        supabaseClient
          .from('candidatures')
          .select('semaines_demandees, statut, annonce_id, annonces(disponibilites_pattern)')
          .eq('locataire_id', user.id),
      ]);
      if (annule) return;
      setDeductionRecherche(userRow ? deduireRecherche(userRow) : []);
      setCandidatures(candRows || []);
      setChargement(false);
    })();
    return () => { annule = true; };
  }, [user]);

  // Ville active : l'entrée sélectionnée de deductionRecherche. Si l'utilisateur n'a
  // qu'une seule ville de recherche, villeActiveIndex (toujours 0 par défaut) la
  // désigne directement sans qu'aucun sélecteur ne soit affiché.
  const entreeActive = deductionRecherche[villeActiveIndex];
  const semaines = useMemo(() => entreeActive?.semaines || [], [entreeActive]);

  // Semaines « en attente » = semaines cherchées sur lesquelles le locataire a candidaté
  // sans contrat signé (candidater ne réserve rien — VISION §381/§621). Une candidature
  // refusée rouvre la semaine (§610) → ignorée. Source prioritaire : candidatures.semaines_demandees ;
  // repli sur disponibilites_pattern de l'annonce si la candidature est antérieure à cette
  // colonne (vieille candidature → liste vide). annonces peut être null (annonce supprimée).
  const semainesEnAttente = useMemo(() => {
    const cherchees = new Set(semaines);
    const enAttente = new Set();
    for (const c of candidatures) {
      if (c.statut === 'refusee') continue;
      const demandees = Array.isArray(c.semaines_demandees) ? c.semaines_demandees : [];
      const source = demandees.length > 0 ? demandees : (c.annonces?.disponibilites_pattern || []);
      for (const lundi of source) {
        if (cherchees.has(lundi)) enAttente.add(lundi);
      }
    }
    return enAttente;
  }, [candidatures, semaines]);

  // Chaque semaine cherchée → { nature, cherchee:true, couvert:false, enAttente } (couvert viendra avec les contrats).
  // Un seul point de vue affiché à la fois → une seule nature pour toute la vue,
  // celle de la ville active (entreeActive.nature).
  const etatsParSemaine = useMemo(() => {
    const map = {};
    for (const lundi of semaines) {
      map[lundi] = { nature: entreeActive?.nature, cherchee: true, couvert: false, enAttente: semainesEnAttente.has(lundi) };
    }
    return map;
  }, [semaines, entreeActive, semainesEnAttente]);

  // Ouvre sur l'année de la 1ʳᵉ semaine cherchée ; sinon undefined → le composant retombe sur son défaut.
  const anneeScolaireInitiale = semaines.length ? academicYearForMonday(semaines[0]) : undefined;

  const aCouvrir = Object.values(etatsParSemaine).filter((e) => e.cherchee === true && e.couvert === false).length;

  // États de rendu : chargement → estVide (aucune semaine cherchée) → rempli.
  const enChargement = authLoading || chargement;
  const estVide = !enChargement && semaines.length === 0;

  return (
    <div style={PAGE_STYLE}>
      <div style={CARTE_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <h3 style={TITRE_STYLE}>Ton planning</h3>
          {!enChargement && !estVide && (
            <p style={RESUME_STYLE}>
              {aCouvrir === 0
                ? 'Ton planning est entièrement couvert'
                : <>Il te reste <strong style={{ fontWeight: 600, color: '#6B7280' }}>{aCouvrir} {aCouvrir === 1 ? 'semaine' : 'semaines'}</strong> à couvrir</>}
            </p>
          )}
        </div>
        {enChargement
          ? <p style={CHARGEMENT_STYLE}>Chargement…</p>
          : estVide
            ? <p style={CHARGEMENT_STYLE}>Aucune semaine de recherche à afficher pour le moment.</p>
            : <PlancheCouverture etatsParSemaine={etatsParSemaine} anneeScolaireInitiale={anneeScolaireInitiale} />}
      </div>
    </div>
  );
}
