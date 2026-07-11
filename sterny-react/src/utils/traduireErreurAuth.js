// Traduit les messages d'erreur d'authentification Supabase en français.
// Utilisé par les chemins de connexion (mot de passe + OAuth Google/Apple).
// Tout message non reconnu retombe sur un message générique FR — jamais
// l'anglais brut (ex. "Failed to fetch") affiché à l'utilisateur.

const MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect',
  'Failed to fetch': 'Impossible de contacter le serveur, réessaie dans quelques instants',
  'Email not confirmed': 'Confirme ton adresse email avant de te connecter',
  'User already registered': 'Un compte existe déjà avec cet email',
}

const MESSAGE_GENERIQUE = 'Une erreur est survenue, réessaie dans quelques instants'

export function traduireErreurAuth(error) {
  const brut = error?.message || ''
  return MESSAGES[brut] || MESSAGE_GENERIQUE
}
