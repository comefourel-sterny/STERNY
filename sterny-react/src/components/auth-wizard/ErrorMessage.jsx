/**
 * ErrorMessage — message d'erreur de formulaire pour le wizard d'auth.
 *
 * À quoi sert ce composant ?
 * Affiche un message d'erreur court (validation frontend, code d'erreur Supabase
 * mappé) sous un input ou sous le bouton principal. Aligné 1:1 sur le pattern
 * `.ir-error` de InscriptionRecherchePage (cf. UNIFICATION-INSCRIPTION § 3.1
 * "design hérité IR"), avec en plus les attributs d'accessibilité.
 *
 * Pourquoi role="alert" + aria-live ?
 * Les lecteurs d'écran annoncent immédiatement le contenu d'un élément avec
 * `role="alert"` et `aria-live` — l'utilisateur entend l'erreur sans avoir à
 * déplacer le focus. `polite` (et non `assertive`) parce qu'une erreur de
 * formulaire n'est pas critique : on ne coupe pas la lecture en cours du
 * screen reader. `aria-atomic="true"` force la lecture du message complet
 * même quand il change (au lieu de ne lire que le delta).
 *
 * Pourquoi le composant est "plat" (pas de fond, pas de card) ?
 * Cohérent avec INVENTAIRE-PLATEFORME § 9.4 ("règle card vs nu") : un message
 * d'erreur n'est pas une section autonome, il vit dans le flux de la card
 * parent. Ne pas dupliquer le contour visuel.
 *
 * Combiner avec useShakeButton :
 * Pour signaler visuellement une erreur de submit, déclencher d'abord
 * `shake()` du hook (cf. useShakeButton.js + démo sandbox section 11) puis
 * afficher l'<ErrorMessage> juste sous le <PrimaryButton>. Les 2 effets
 * sont indépendants et combinables.
 *
 * Exemple minimal d'usage :
 *   {error && <ErrorMessage>{error}</ErrorMessage>}
 *
 * Variant avec lien :
 *   {error && (
 *     <ErrorMessage>
 *       Cet email est déjà utilisé. <Link to="/connexion">Se connecter</Link>
 *     </ErrorMessage>
 *   )}
 */

import './ErrorMessage.css'

export default function ErrorMessage({ children, id, className = '' }) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`em-message ${className}`}
    >
      {children}
    </div>
  )
}
