/**
 * Adresse du point de réception des avis (script Google déployé en
 * « application web », voir docs/collecte-avis.gs), fixée à la compilation :
 *   EXPO_PUBLIC_AVIS_ENDPOINT=https://script.google.com/macros/s/…/exec
 * Sans adresse, le questionnaire intégré n'est pas proposé.
 */
export const AVIS_ENDPOINT = process.env.EXPO_PUBLIC_AVIS_ENDPOINT ?? '';
export const AVIS_ACTIF = AVIS_ENDPOINT !== '';
