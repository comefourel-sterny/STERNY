// VilleNatureField — champ contrôlé partagé « ville + nature (école / entreprise) ».
//
// Rôle : brique de saisie destinée à être réutilisée par le wizard d'inscription
// (étape E-4, InscriptionAlternantPage.jsx) ET par la modale du bouton « + » du
// dashboard (DashboardLocatairePage.jsx), dans le cadre du chantier recherche
// multi-villes (VISION-ARCHITECTURE.md, plan du 15/07/2026).
//
// DÉCISION (VISION-ARCHITECTURE.md, 16/07/2026) : ce composant capture UNIQUEMENT la
// ville et sa NATURE (école | entreprise). Il ne capture JAMAIS l'ACTION
// (recherche | hôte) : l'action est déterminée par le CONTEXTE appelant
// (type_user côté wizard, bouton cliqué côté dashboard), pas par l'utilisateur ici.
// C'est pourquoi il n'existe volontairement AUCUN champ « action » dans ce composant —
// si un futur lecteur en cherche un, c'est par design qu'il est absent.
//
// Entièrement CONTRÔLÉ : aucun state interne, aucune validation métier (pas de
// validateE4), aucune écriture Supabase, aucune navigation, aucune logique de
// soumission. Il absorbe la différence entre l'event synthétique
// { target: { name, value } } émis par AutocompleteInput / CustomSelect et remonte
// une simple string via onVilleChange / onNatureChange. Le parent décide de tout le
// reste (validation, persistance, étape suivante), qu'il stocke son état dans un
// reducer (wizard) ou un useState local (modale dashboard).
//
// STYLE DES LIBELLÉS : entièrement délégué au parent. Le composant n'impose AUCUNE
// classe par défaut sur ses libellés — chaque appelant passe sa propre classe
// existante via villeLabelClassName / naturePromptClassName (ex. le wizard réutilise
// « ial-step-subtitle ial-nature-question »). Sans classe fournie, le libellé
// s'affiche sans style particulier.

import AutocompleteInput from '../auth-wizard/AutocompleteInput'
import CustomSelect from '../auth-wizard/CustomSelect'
import { VILLES_FRANCE } from '../../data/inscription-options'

// Recopié à l'identique de natureVilleOptions (InscriptionAlternantPage.jsx, E-4).
const NATURE_OPTIONS = [
  { value: 'ecole', label: 'École' },
  { value: 'entreprise', label: 'Entreprise' },
]

export default function VilleNatureField({
  ville = '',
  onVilleChange,
  nature = '',
  onNatureChange,
  villeLabel,
  villeLabelClassName,
  naturePrompt,
  naturePromptClassName,
  villePlaceholder = 'Tape les premières lettres',
}) {
  return (
    <>
      {villeLabel && <p className={villeLabelClassName}>{villeLabel}</p>}
      <AutocompleteInput
        name="ville"
        value={ville}
        onChange={(e) => onVilleChange?.(e.target.value)}
        suggestions={VILLES_FRANCE}
        placeholder={villePlaceholder}
        required={false}
      />
      {naturePrompt && <p className={naturePromptClassName}>{naturePrompt}</p>}
      <CustomSelect
        name="nature"
        options={NATURE_OPTIONS}
        value={nature}
        onChange={(e) => onNatureChange?.(e.target.value)}
        placeholder="Sélectionner"
      />
    </>
  )
}
