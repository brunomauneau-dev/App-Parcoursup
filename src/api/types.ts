/**
 * Modèle de données exposé par la future API de consultation (lecture seule).
 * Ce contrat est une proposition à valider avec le SCN Parcoursup.
 * La version formelle est dans docs/openapi.yaml.
 */

export type StatutVoeu =
  | 'proposition' // proposition d'admission reçue, réponse attendue
  | 'proposition_acceptee' // proposition acceptée (vœux en attente éventuellement conservés)
  | 'en_attente' // en liste d'attente
  | 'refuse' // refus de l'établissement (formation sélective : non)
  | 'refusee_par_candidat'; // proposition refusée par le candidat

export interface PointHistorique {
  /** Date ISO de la mise à jour nocturne */
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
  /** Date ISO de la dernière mise à jour du dossier */
  derniereMiseAJour: string;
  /**
   * Heure du serveur au moment de la réponse (ISO). L'application s'en sert
   * pour les comptes à rebours, afin de ne pas dépendre de l'horloge du téléphone.
   */
  dateServeur: string;
  voeux: Voeu[];
}

/** Interface consommée par l'application. */
export interface DossierApi {
  /** Connexion avec les identifiants Parcoursup. Le mot de passe n'est jamais conservé. */
  connexion(numeroDossier: string, motDePasse: string): Promise<void>;
  /** Reprend une session existante au démarrage. Renvoie false s'il n'y en a pas. */
  restaurer(): Promise<boolean>;
  deconnexion(): Promise<void>;
  getDossier(): Promise<Dossier>;
  /** Démonstration uniquement : simule la mise à jour de la nuit suivante. */
  simulerNuit?(): Promise<boolean>;
}
