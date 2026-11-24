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
  /** Type de formation : « BUT », « Classe prépa », « Licence »… */
  categorie: string;
  formation: string;
  etablissement: string;
  ville: string;
  statut: StatutVoeu;
  /** Position dans la liste d'attente (parmi les candidats encore en attente). Évolue chaque jour. */
  rang?: number;
  totalEnAttente?: number;
  places?: number;
  /**
   * Rang du candidat dans le classement de la formation (ordre d'appel). Fixe.
   * C'est lui, et non la position en liste d'attente, qui se compare au rang du dernier appelé.
   */
  rangClassement?: number;
  /** Rang de classement du dernier candidat ayant reçu une proposition lors de la session précédente */
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
  /** Messages du dossier, du plus récent au plus ancien */
  messages: Message[];
  /** Dates générales de la phase d'admission (identiques pour tous les candidats) */
  calendrier: EtapeCalendrier[];
  /**
   * Période où le candidat doit classer ses vœux en attente sur le site
   * (calendrier 2027 : du 4 au 7 juin). Absent hors de cette étape.
   */
  classementAttente?: {
    debut: string;
    fin: string;
    /** Vrai si le candidat a déjà classé ses vœux : on ne lui envoie plus de rappel. */
    fait?: boolean;
  };
  /** Démonstration uniquement : profil fictif affiché. Absent de l'API réelle. */
  profilDemo?: { id: string; presentation: string };
}

export interface EtapeCalendrier {
  date: string;
  libelle: string;
}

export interface Message {
  id: string;
  date: string;
  categorie: 'proposition' | 'admission' | 'info' | 'etablissement';
  titre: string;
  lu: boolean;
}

/** Interface consommée par l'application. */
export interface DossierApi {
  /**
   * Connexion. Avec l'API réelle, ouvre la page de connexion officielle dans le
   * navigateur du téléphone : l'application ne voit jamais le mot de passe.
   */
  connexion(): Promise<void>;
  /** Reprend une session existante au démarrage. Renvoie false s'il n'y en a pas. */
  restaurer(): Promise<boolean>;
  deconnexion(): Promise<void>;
  getDossier(): Promise<Dossier>;
  /** Démonstration uniquement : simule la mise à jour de la nuit suivante. */
  simulerNuit?(): Promise<boolean>;
  /** Démonstration uniquement : place le dossier à un jour donné de la phase simulée. */
  definirJour?(jour: number): Promise<void>;
  /** Démonstration uniquement : choisit le dossier fictif affiché. */
  definirProfil?(id: string): Promise<void>;
  /** Démonstration uniquement : passe au dossier fictif suivant, au jour initial. */
  profilSuivant?(): Promise<void>;
}
