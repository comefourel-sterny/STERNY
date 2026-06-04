// Dérive les 4 colonnes ville/statut depuis l'état du wizard (VISION §65-86).
// Convention sémantique : la ville va dans la colonne de SA nature ; le statut encode l'action.
// Renvoie { ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise }
// (null pour toute colonne non utilisée). Combos cherche×2 / propose×2 hors périmètre (conv 30).
export function deriveVilleColonnes({ type_user, nature_ville, ville_entreprise, ville_ecole }) {
  const vide = {
    ville_ecole: null,
    ville_entreprise: null,
    statut_ville_ecole: null,
    statut_ville_entreprise: null,
  }

  if (type_user === 'locataire' || type_user === 'hote') {
    const statut = type_user === 'locataire' ? 'recherche' : 'hote'
    const ville = ville_entreprise // slot de saisie mono en E-4
    if (nature_ville === 'ecole') {
      return { ...vide, ville_ecole: ville, statut_ville_ecole: statut }
    }
    return { ...vide, ville_entreprise: ville, statut_ville_entreprise: statut }
  }

  if (type_user === 'les_deux') {
    const propose = ville_entreprise // slot "propose" en E-4, statut 'hote'
    const cherche = ville_ecole      // slot "cherche" en E-4, nature opposée, statut 'recherche'
    if (nature_ville === 'ecole') {
      return {
        ville_ecole: propose,
        statut_ville_ecole: 'hote',
        ville_entreprise: cherche,
        statut_ville_entreprise: 'recherche',
      }
    }
    return {
      ville_ecole: cherche,
      statut_ville_ecole: 'recherche',
      ville_entreprise: propose,
      statut_ville_entreprise: 'hote',
    }
  }

  return vide
}
