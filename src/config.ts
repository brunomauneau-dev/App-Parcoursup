/**
 * Lien du questionnaire d'avis (Google Forms), fixé à la compilation :
 *   EXPO_PUBLIC_AVIS_URL=https://forms.gle/...
 * Sans lien, le bouton « Donner mon avis » n'apparaît pas.
 */
export const URL_AVIS = process.env.EXPO_PUBLIC_AVIS_URL ?? '';
