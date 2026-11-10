export type TypeErreur =
  | 'identifiants' // numéro de dossier ou mot de passe incorrect
  | 'session_expiree' // jeton refusé et renouvellement impossible
  | 'reseau' // pas de connexion ou délai dépassé
  | 'indisponible' // serveur saturé ou en maintenance (429, 5xx)
  | 'inattendu';

export class ApiError extends Error {
  constructor(
    readonly type: TypeErreur,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function messageErreur(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Une erreur inattendue s'est produite. Réessayez dans quelques instants.";
}
