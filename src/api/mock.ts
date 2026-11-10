import { construireDossier, JOUR_INITIAL, JOUR_MAX } from './donneesDemo';
import { ApiError } from './erreurs';
import type { Dossier, DossierApi } from './types';

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * API simulée dans l'application, sans serveur. Utilisée quand aucune
 * adresse d'API n'est configurée (démo web, Expo Go sans serveur).
 */
export class MockApi implements DossierApi {
  private jour = JOUR_INITIAL;
  private connecte = false;
  private readonly debut = Date.now();

  async connexion(numeroDossier: string, motDePasse: string): Promise<void> {
    await attendre(600);
    if (!numeroDossier.trim() || !motDePasse) {
      throw new ApiError('identifiants', 'Saisissez votre numéro de dossier et votre mot de passe.');
    }
    this.connecte = true;
  }

  async restaurer(): Promise<boolean> {
    return this.connecte;
  }

  async deconnexion(): Promise<void> {
    this.connecte = false;
    this.jour = JOUR_INITIAL;
  }

  async getDossier(): Promise<Dossier> {
    if (!this.connecte) throw new ApiError('session_expiree', 'Votre session a expiré. Reconnectez-vous.');
    await attendre(250);
    return construireDossier(this.jour, this.debut);
  }

  async simulerNuit(): Promise<boolean> {
    if (this.jour >= JOUR_MAX) return false;
    this.jour += 1;
    return true;
  }
}
