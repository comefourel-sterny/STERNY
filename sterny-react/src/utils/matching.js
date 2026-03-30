export function calculerCompatibilite(datesA, datesB) {
  if (!datesA || !datesB || datesA.length === 0 || datesB.length === 0) {
    return 0
  }

  const overlapDays = datesA.filter(dateA =>
    datesB.some(dateB => dateA === dateB)
  ).length

  const maxPossibleOverlap = Math.min(datesA.length, datesB.length)
  return maxPossibleOverlap > 0 ? 1 - (overlapDays / maxPossibleOverlap) : 0
}
