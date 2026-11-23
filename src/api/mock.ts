import { construireDossier, JOUR_INITIAL, JOUR_MAX, PROFILS_DEMO } from './donneesDemo';
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
  private profil = PROFILS_DEMO[0].id;
  private readonly debut = Date.now();

  async connexion(): Promise<void> {
    await attendre(300);
    // Chaque connexion de démonstration tire un dossier fictif au hasard
    this.profil = PROFILS_DEMO[Math.floor(Math.random() * PROFILS_DEMO.length)].id;
    this.jour = JOUR_INITIAL;
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
    await attendre(120);
    return construireDossier(this.jour, this.debut, undefined, this.profil);
  }

  async definirProfil(id: string): Promise<void> {
    if (PROFILS_DEMO.some((p) => p.id === id)) this.profil = id;
  }

  async profilSuivant(): Promise<void> {
    const i = PROFILS_DEMO.findIndex((p) => p.id === this.profil);
    this.profil = PROFILS_DEMO[(i + 1) % PROFILS_DEMO.length].id;
    this.jour = JOUR_INITIAL;
  }

  async definirJour(jour: number): Promise<void> {
    this.jour = Math.max(0, Math.min(JOUR_MAX, jour));
  }

  async simulerNuit(): Promise<boolean> {
    if (this.jour >= JOUR_MAX) return false;
    this.jour += 1;
    return true;
  }
}
