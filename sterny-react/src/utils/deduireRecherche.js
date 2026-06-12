// Déduction « profil → ce que je cherche » (socle recherche, DETTE #48 / #93).
// Fonctions PURES : aucune dépendance React, aucune requête réseau.
//
// Principe (VISION §1, §65-86) : un utilisateur cherche un logement dans une
// ville où son statut est 'recherche'. Les semaines de besoin = les semaines où
// il est PHYSIQUEMENT présent dans cette ville selon son rythme :
//   - ville de nature 'ecole'      → semaines status 'school'
//   - ville de nature 'entreprise' → semaines status 'company'
// On ne garde que les semaines futures (>= lundi courant).

import { currentMondayISO } from './academicYear';
import { getVillesUtilisateur } from './deriveVilleColonnes';

const NATURE_TO_STATUS = {
  ecole: 'school',
  entreprise: 'company',
};

// A) rhythm_calendar + nature de ville → liste de week_start (lundis ISO) où
// l'utilisateur est présent dans cette ville, dans le futur, triés croissant.
export function semainesDePresence(rhythmCalendar, nature) {
  if (!Array.isArray(rhythmCalendar) || rhythmCalendar.length === 0) return [];
  const targetStatus = NATURE_TO_STATUS[nature];
  if (!targetStatus) return [];

  const lundiCourant = currentMondayISO();

  return rhythmCalendar
    .filter(
      (e) =>
        e &&
        e.status === targetStatus &&
        typeof e.week_start === 'string' &&
        e.week_start >= lundiCourant
    )
    .map((e) => e.week_start)
    .sort();
}

// B) ligne users → liste de { ville, nature, semaines } pour chaque ville où
// l'utilisateur CHERCHE (action 'recherche'). Vide s'il ne cherche nulle part.
export function deduireRecherche(user) {
  if (!user) return [];
  return getVillesUtilisateur(user)
    .filter((v) => v.action === 'recherche')
    .map((v) => ({
      ville: v.ville,
      nature: v.nature,
      semaines: semainesDePresence(user.rhythm_calendar, v.nature),
    }));
}
