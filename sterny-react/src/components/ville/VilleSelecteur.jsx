// VilleSelecteur — sélecteur segmenté entre 2 villes (école/entreprise).
// Composant CONTRÔLÉ : ne possède aucun state interne. Le parent porte la
// valeur active et la fait varier via onChange, pour pouvoir piloter le
// contenu affiché ailleurs sur la page (ex. filtrage des semaines cherchées
// sur /mon-calendrier, DETTE #142).
// Extrait de DashboardLocatairePage.jsx (commit dfe7c6f, 18/07/2026).
// Segments texte seul (icône loupe retirée — cohérence visuelle sélecteur ville/mode).

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
          <span>{v.ville}</span>
        </button>
      ))}
    </div>
  );
}
