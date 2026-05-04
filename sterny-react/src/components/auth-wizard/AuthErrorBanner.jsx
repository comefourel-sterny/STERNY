/**
 * AuthErrorBanner — bannière d'erreur globale pour les écrans d'auth.
 *
 * À quoi sert ce composant ?
 * Remplace temporairement <BottomAuthLinks> pendant ~2 secondes en cas d'erreur
 * de validation ou d'erreur serveur Supabase. Une seule zone unifiée d'affichage
 * d'erreur, vs un message par champ qui créait du saut visuel disgracieux.
 *
 * Pourquoi un composant dédié vs styliser ErrorMessage ?
 * AuthErrorBanner a la MÊME hauteur que <BottomAuthLinks> (= pas de saut visuel
 * quand l'un remplace l'autre), un alignement vertical centré, et son propre
 * styling cohérent avec la zone qu'il remplace. ErrorMessage reste utilisable
 * dans d'autres contextes (inputs isolés, formulaires hors auth wizard).
 *
 * Auto-disparition :
 * Gérée par le composant parent (InscriptionAlternantPage) via un setTimeout
 * qui efface state.globalError au bout de 2000ms. Le banner ne sait pas qu'il
 * est temporaire — il s'affiche tant que la prop `message` est non null.
 */

import './AuthErrorBanner.css'

export default function AuthErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="aeb-banner" role="alert" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
