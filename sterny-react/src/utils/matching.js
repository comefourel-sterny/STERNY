/**
 * Moteur de couverture des semaines (fonction pure).
 * Pour UN logement : dit quelles semaines cherchées par le locataire ce logement couvre.
 *
 * @param {Object} args
 * @param {string[]} args.semainesCherchees   - lundis ISO "YYYY-MM-DD" cherchés par le locataire (déjà filtrés futur en amont)
 * @param {string[]} args.disponibilitesOffre - lundis ISO offerts par le logement (annonces.disponibilites_pattern)
 * @param {string[]} [args.semainesReservees] - lundis ISO déjà réservés du logement (défaut [])
 * @returns {{ semainesCouvertes: string[], couvertes: number, totalCherchees: number }}
 */
export function couvertureSemaines({ semainesCherchees, disponibilitesOffre, semainesReservees = [] }) {
  // Dédoublonne les semaines cherchées pour fiabiliser le compte (le "Y")
  const cherchees = [...new Set(Array.isArray(semainesCherchees) ? semainesCherchees : [])];
  const offre = Array.isArray(disponibilitesOffre) ? disponibilitesOffre : [];
  const reservees = new Set(Array.isArray(semainesReservees) ? semainesReservees : []);

  // Semaines réellement libres du logement = offre MOINS réservées
  const libres = new Set(offre.filter((semaine) => !reservees.has(semaine)));

  // Semaines couvertes pour ce locataire = cherchées QUI SONT AUSSI libres
  const semainesCouvertes = cherchees.filter((semaine) => libres.has(semaine)).sort();

  return {
    semainesCouvertes,
    couvertes: semainesCouvertes.length,
    totalCherchees: cherchees.length,
  };
}
