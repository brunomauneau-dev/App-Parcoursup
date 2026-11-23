import { AVIS_ENDPOINT } from '../config';
import type { Reponses } from './questions';

/**
 * Envoie les réponses au script Google (application web).
 * Requête « simple » (text/plain, mode no-cors) : pas de requête préalable,
 * que les applications web Google ne savent pas traiter. La réponse est
 * opaque : seule une erreur réseau signale un échec.
 */
export async function envoyerAvis(reponses: Reponses, profilVu?: string): Promise<void> {
  if (!AVIS_ENDPOINT) throw new Error('Questionnaire non configuré');
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 15_000);
  try {
    await fetch(AVIS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // Le dossier fictif vu par le testeur est noté avec la version (ex. « 2-lucas » ; 2 = questionnaire avec la question sur la sérénité)
      body: JSON.stringify({ ...reponses, version: profilVu ? `2-${profilVu}` : '2' }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(minuteur);
  }
}
