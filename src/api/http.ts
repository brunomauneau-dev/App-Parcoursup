import { effacerJetons, enregistrerJetons, Jetons, lireJetons } from '../auth/stockageJetons';
import { ApiError } from './erreurs';
import type { Dossier, DossierApi } from './types';

const CLIENT_ID = 'suivi-voeux-mobile';
const SCOPE = 'dossier.read';
const DELAI_MS = 10_000;
/** Renouvelle le jeton un peu avant son expiration. */
const MARGE_EXPIRATION_MS = 30_000;

interface ReponseJeton {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Client de l'API de consultation (contrat : docs/openapi.yaml).
 *
 * Authentification : OAuth 2 / OpenID Connect. Le mot de passe est envoyé une
 * seule fois au serveur d'authentification, puis oublié. L'application ne garde
 * qu'un jeton limité au périmètre `dossier.read` et un jeton de renouvellement
 * à usage unique (rotation).
 */
export class HttpApi implements DossierApi {
  private renouvellement: Promise<Jetons> | null = null;

  constructor(private readonly baseUrl: string) {}

  async connexion(numeroDossier: string, motDePasse: string): Promise<void> {
    if (!numeroDossier.trim() || !motDePasse) {
      throw new ApiError('identifiants', 'Saisissez votre numéro de dossier et votre mot de passe.');
    }
    const r = await this.requete('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formulaire({
        grant_type: 'password',
        client_id: CLIENT_ID,
        scope: SCOPE,
        username: numeroDossier.trim(),
        password: motDePasse,
      }),
    });
    if (r.status === 400 || r.status === 401) {
      throw new ApiError('identifiants', 'Numéro de dossier ou mot de passe incorrect.');
    }
    await this.verifierStatut(r);
    await this.memoriser((await r.json()) as ReponseJeton);
  }

  async restaurer(): Promise<boolean> {
    return (await lireJetons()) != null;
  }

  async deconnexion(): Promise<void> {
    const j = await lireJetons();
    await effacerJetons();
    if (!j) return;
    // Révocation côté serveur, au mieux : la déconnexion locale suffit si le réseau manque.
    try {
      await this.requete('/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formulaire({ token: j.refreshToken, token_type_hint: 'refresh_token', client_id: CLIENT_ID }),
      });
    } catch {
      // ignoré
    }
  }

  async getDossier(): Promise<Dossier> {
    const r = await this.appelAuthentifie('/v1/dossier', { method: 'GET' });
    return (await r.json()) as Dossier;
  }

  async simulerNuit(): Promise<boolean> {
    const r = await this.appelAuthentifie('/demo/nuit', { method: 'POST' });
    return ((await r.json()) as { avance: boolean }).avance;
  }

  // --- interne ---------------------------------------------------------------

  private async appelAuthentifie(chemin: string, init: RequestInit, deuxiemeEssai = false): Promise<Response> {
    let jetons = await lireJetons();
    if (!jetons) throw new ApiError('session_expiree', 'Votre session a expiré. Reconnectez-vous.');
    if (jetons.expiresAt - MARGE_EXPIRATION_MS < Date.now()) jetons = await this.renouveler();

    const r = await this.requete(chemin, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${jetons.accessToken}` },
    });
    if (r.status === 401 && !deuxiemeEssai) {
      await this.renouveler();
      return this.appelAuthentifie(chemin, init, true);
    }
    if (r.status === 401) {
      await effacerJetons();
      throw new ApiError('session_expiree', 'Votre session a expiré. Reconnectez-vous.');
    }
    await this.verifierStatut(r);
    return r;
  }

  /** Un seul renouvellement à la fois, même si plusieurs appels échouent ensemble. */
  private renouveler(): Promise<Jetons> {
    if (!this.renouvellement) {
      this.renouvellement = this.renouvelerMaintenant().finally(() => {
        this.renouvellement = null;
      });
    }
    return this.renouvellement;
  }

  private async renouvelerMaintenant(): Promise<Jetons> {
    const actuels = await lireJetons();
    if (!actuels) throw new ApiError('session_expiree', 'Votre session a expiré. Reconnectez-vous.');
    const r = await this.requete('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formulaire({ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: actuels.refreshToken }),
    });
    if (r.status === 400 || r.status === 401) {
      await effacerJetons();
      throw new ApiError('session_expiree', 'Votre session a expiré. Reconnectez-vous.');
    }
    await this.verifierStatut(r);
    return this.memoriser((await r.json()) as ReponseJeton);
  }

  private async memoriser(rep: ReponseJeton): Promise<Jetons> {
    const portee = rep.scope.split(' ');
    // Défense en profondeur : on refuse un jeton qui donnerait plus que la consultation.
    if (portee.length !== 1 || portee[0] !== SCOPE) {
      throw new ApiError('inattendu', "Le serveur a renvoyé un jeton non conforme. Contactez l'assistance.");
    }
    const j: Jetons = {
      accessToken: rep.access_token,
      refreshToken: rep.refresh_token,
      expiresAt: Date.now() + rep.expires_in * 1000,
    };
    await enregistrerJetons(j);
    return j;
  }

  private async requete(chemin: string, init: RequestInit): Promise<Response> {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
    try {
      return await fetch(this.baseUrl + chemin, {
        ...init,
        headers: { Accept: 'application/json', ...(init.headers as Record<string, string>) },
        signal: ctrl.signal,
      });
    } catch {
      throw new ApiError('reseau', 'Pas de connexion. Vérifiez votre réseau et réessayez.');
    } finally {
      clearTimeout(minuteur);
    }
  }

  private async verifierStatut(r: Response): Promise<void> {
    if (r.ok) return;
    if (r.status === 429 || r.status >= 500) {
      throw new ApiError('indisponible', 'Le service est très sollicité. Réessayez dans quelques minutes.');
    }
    throw new ApiError('inattendu', `Réponse inattendue du serveur (${r.status}).`);
  }
}

function formulaire(champs: Record<string, string>): string {
  return Object.entries(champs)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}
