import { HttpApi } from './http';
import { MockApi } from './mock';
import type { DossierApi } from './types';

/**
 * Adresse de l'API, fixée à la compilation (fichier .env ou variable d'environnement) :
 *   EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
 * Sans adresse, l'application utilise l'API simulée intégrée.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const api: DossierApi = API_URL ? new HttpApi(API_URL) : new MockApi();
/** Affiche le bandeau « Prototype » et les outils de démonstration. */
export const modeDemo = !API_URL || process.env.EXPO_PUBLIC_DEMO === '1';

/** Vrai quand l'application tourne sur les données fictives intégrées, sans serveur. */
export const apiSimulee = !API_URL;
