// ============ ALGORITHME DE MATCHING ============

/**
 * Calcule le score de compatibilité entre deux utilisateurs
 * @param {Array} datesA - Tableau de dates (format string "2026-01-05")
 * @param {Array} datesB - Tableau de dates (format string "2026-01-05")
 * @returns {number} Score entre 0 et 1 (1 = match parfait, 0 = incompatible)
 */
function calculerCompatibilite(datesA, datesB) {
    // Si l'un des deux n'a pas de dates, score = 0
    if (!datesA || !datesB || datesA.length === 0 || datesB.length === 0) {
        return 0;
    }
    
    // Compter les jours qui se chevauchent
    const overlapDays = datesA.filter(dateA =>
        datesB.some(dateB => dateA === dateB)
    ).length;
    
    const totalDaysA = datesA.length;
    const totalDaysB = datesB.length;
    
    // Score 1.0 = parfaitement complémentaires (aucun overlap)
    const maxPossibleOverlap = Math.min(totalDaysA, totalDaysB);
    return maxPossibleOverlap > 0 ? 1 - (overlapDays / maxPossibleOverlap) : 0;
}