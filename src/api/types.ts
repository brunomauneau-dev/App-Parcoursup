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
  /**
   * Réponse « Oui-si » (surtout en licence) : la formation accepte le candidat à condition qu'il
   * suive un accompagnement pour réussir (remise à niveau, parcours aménagé, tutorat…).
   * Simple indicateur : le détail de l'accompagnement reste sur le site.
   */
  ouiSi?: boolean;
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
  /**
   * Premier jour de la phase : vrai tant que le SCN n'a pas ouvert la publication des
   * résultats. L'API ne renvoie alors aucun vœu ni message : l'application ne montre
   * jamais un résultat avant le site.
   */
  resultatsAttendus?: boolean;
  /**
   * Compte lié avant le début de la phase d'admission (application téléchargée en avance) :
   * pas encore de résultats, l'application est « en veille » jusqu'au premier jour.
   */
  avantPhase?: boolean;
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
  /**
   * Coordonnées où Parcoursup envoie ses alertes (SMS, mail), MASQUÉES par l'API
   * (ex. « c•••@exemple.fr », « 06 •• •• •• 12 ») : le candidat vérifie qu'elles sont justes.
   */
  coordonnees?: { mail: string; telephone: string };
  /** Démonstration uniquement : profil fictif affiché. Absent de l'API réelle. */
  profilDemo?: { id: string; presentation: string };
}

export interface EtapeCalendrier {
  date: string;
  libelle: string;
  /** Fin de la période, pour une étape qui dure plusieurs jours (reste affichée jusque-là) */
  fin?: string;
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
  /**
   * Démonstration uniquement : place le dossier à un jour donné de la phase simulée.
   * -2 : compte lié avant la phase (veille) ; -1 : premier matin, avant l'ouverture des résultats.
   */
  definirJour?(jour: number): Promise<void>;
  /** Démonstration uniquement : choisit le dossier fictif affiché. */
  definirProfil?(id: string): Promise<void>;
  /** Démonstration uniquement : passe au dossier fictif suivant, au jour initial. */
  profilSuivant?(): Promise<void>;
}
