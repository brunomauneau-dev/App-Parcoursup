/**
 * Modèle de données exposé par la future API de consultation (lecture seule).
 * Ce contrat est une proposition à valider avec le SCN Parcoursup.
 */

export type StatutVoeu =
  | 'proposition' // proposition d'admission reçue, réponse attendue
  | 'proposition_acceptee' // proposition acceptée (vœux en attente éventuellement conservés)
  | 'en_attente' // en liste d'attente
  | 'refuse'; // formation sélective : non

export interface PointHistorique {
  /** Date ISO (jour de la mise à jour nocturne) */
  date: string;
  /** Rang en liste d'attente ce jour-là, null si le vœu n'était plus en attente */
  rang: number | null;
}

export interface Voeu {
  id: string;
  formation: string;
  etablissement: string;
  ville: string;
  statut: StatutVoeu;
  /** Liste d'attente */
  rang?: number;
  totalEnAttente?: number;
  places?: number;
  /** Rang du dernier candidat ayant reçu une proposition lors de la session précédente */
  rangDernierAppeleAnneePrecedente?: number;
  historique?: PointHistorique[];
  /** Propositions */
  dateProposition?: string;
  dateLimiteReponse?: string;
}

export interface Dossier {
  prenom: string;
  numeroDossier: string;
  derniereMiseAJour: string;
  voeux: Voeu[];
}

/**
 * Interface que l'application consomme. La version de démonstration
 * est implémentée par MockApi ; la version réelle appellera l'API du SCN
 * avec un jeton limité à la consultation.
 */
export interface DossierApi {
  connexion(numeroDossier: string, motDePasse: string): Promise<void>;
  deconnexion(): Promise<void>;
  getDossier(): Promise<Dossier>;
}
