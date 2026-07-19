// VilleSelecteur — sélecteur segmenté entre 2 villes (école/entreprise).
// Composant CONTRÔLÉ : ne possède aucun state interne. Le parent porte la
// valeur active et la fait varier via onChange, pour pouvoir piloter le
// contenu affiché ailleurs sur la page (ex. filtrage des semaines cherchées
// sur /mon-calendrier, DETTE #142).
// Extrait de DashboardLocatairePage.jsx (commit dfe7c6f, 18/07/2026),
// zéro changement visuel voulu à l'extraction.

// Icône loupe recopiée VERBATIM depuis les segments d'origine (DashboardLocatairePage.jsx)
// pour garantir un rendu strictement identique après extraction.
const IconeLoupe = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
);

// villes : [{ ville: string }, { ville: string }] — exactement 2 entrées.
// value : index actif (0 ou 1).
// onChange : (index: number) => void.
export default function VilleSelecteur({ villes, value, onChange }) {
  if (!Array.isArray(villes) || villes.length !== 2) return null;
  return (
    <div className="vhs-container">
      {villes.map((v, index) => (
        <button
          key={index}
          type="button"
          className={`vhs-segment ${value === index ? 'vhs-active' : ''}`}
          onClick={() => onChange(index)}
        >
          {value === index && <IconeLoupe />}
          <span>{v.ville}</span>
        </button>
      ))}
    </div>
  );
}
