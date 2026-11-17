/**
 * Données entièrement FICTIVES pour la démonstration.
 * Partagées par l'API simulée de l'application (mock.ts) et par le serveur
 * de démonstration (server/). Ce fichier ne doit importer que des types.
 *
 * La phase d'admission simulée commence le 2 juin 2027 (jour 0).
 */
import type { Dossier, Message, PointHistorique, Voeu } from './types';

export const JOUR_INITIAL = 4;
export const JOUR_MAX = 7;
const J0 = new Date(2027, 5, 2); // 2 juin 2027, heure locale
const HEURE_MAJ = { h: 6, m: 12 }; // mise à jour nocturne simulée

function dateDuJour(jour: number, h = 0, m = 0): Date {
  const d = new Date(J0);
  d.setDate(d.getDate() + jour);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Heure « actuelle » simulée : jour courant à 9h30 + temps réel écoulé depuis `debut`. */
export function maintenantSimule(jour: number, debut: number): Date {
  return new Date(dateDuJour(jour, 9, 30).getTime() + (Date.now() - debut));
}

interface VoeuSource {
  base: Omit<Voeu, 'statut' | 'rang' | 'historique' | 'dateProposition' | 'dateLimiteReponse'>;
  /** Rang par jour (index = jour). null = plus en attente. */
  rangs?: (number | null)[];
  jourProposition?: number;
  /** Délai de réponse en jours (date limite à 23h59) */
  delaiReponse?: number;
  accepteeLeJour?: number;
  /** Jour où le candidat a refusé la proposition */
  refuseeLeJour?: number;
  refuse?: boolean;
}

const SOURCES: VoeuSource[] = [
  {
    base: { id: 'v1', categorie: 'Classe prépa', formation: 'CPGE MPSI', etablissement: 'Lycée Jules Ferry', ville: 'Nantes' },
    jourProposition: 3,
    delaiReponse: 4,
  },
  {
    base: { id: 'v2', categorie: 'Licence', formation: 'Licence Mathématiques', etablissement: 'Université de Nantes', ville: 'Nantes' },
    jourProposition: 0,
    delaiReponse: 3,
    accepteeLeJour: 1,
  },
  {
    base: {
      id: 'v3',
      categorie: 'BUT',
      formation: 'BUT Informatique',
      etablissement: 'IUT de Nantes',
      ville: 'Nantes',
      totalEnAttente: 1180,
      places: 104,
      rangDernierAppeleAnneePrecedente: 420,
    },
    rangs: [612, 560, 521, 489, 468, 452, 437, 426],
  },
  {
    base: {
      id: 'v4',
      categorie: 'BUT',
      formation: 'BUT GEII',
      etablissement: 'IUT de Rennes',
      ville: 'Rennes',
      totalEnAttente: 410,
      places: 56,
      rangDernierAppeleAnneePrecedente: 112,
    },
    rangs: [180, 161, 146, 131, 119, null, null, null],
    jourProposition: 5,
    delaiReponse: 2,
  },
  {
    base: {
      id: 'v5',
      categorie: 'Licence',
      formation: 'Licence Informatique',
      etablissement: 'Université de Rennes',
      ville: 'Rennes',
      totalEnAttente: 905,
      places: 240,
      rangDernierAppeleAnneePrecedente: 610,
    },
    rangs: [902, 861, 830, 797, 771, 748, 722, 701],
  },
  {
    base: {
      id: 'v6',
      categorie: 'École d’ingénieurs',
      formation: 'Cycle ingénieur post-bac',
      etablissement: 'INSA (fictif)',
      ville: 'Lyon',
      totalEnAttente: 3120,
      places: 760,
      rangDernierAppeleAnneePrecedente: 1510,
    },
    rangs: [2104, 2040, 1998, 1962, 1930, 1911, 1880, 1855],
  },
  {
    base: { id: 'v8', categorie: 'BTS', formation: 'BTS SIO', etablissement: 'Lycée (fictif) de Saint-Nazaire', ville: 'Saint-Nazaire' },
    jourProposition: 0,
    delaiReponse: 3,
    refuseeLeJour: 1,
  },
  {
    base: {
      id: 'v7',
      categorie: 'Double licence',
      formation: 'Double licence Maths-Informatique',
      etablissement: 'Université (fictive) de Paris',
      ville: 'Paris',
    },
    refuse: true,
  },
];

function construireVoeu(src: VoeuSource, jour: number): Voeu {
  const v: Voeu = { ...src.base, statut: 'en_attente' };
  if (src.refuse) {
    v.statut = 'refuse';
    return v;
  }
  if (src.rangs) {
    v.historique = src.rangs.slice(0, jour + 1).map<PointHistorique>((rang, i) => ({
      date: dateDuJour(i, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(),
      rang,
    }));
    const r = src.rangs[jour];
    if (r != null) v.rang = r;
  }
  if (src.jourProposition != null && jour >= src.jourProposition) {
    v.statut =
      src.accepteeLeJour != null && jour >= src.accepteeLeJour
        ? 'proposition_acceptee'
        : src.refuseeLeJour != null && jour >= src.refuseeLeJour
          ? 'refusee_par_candidat'
          : 'proposition';
    v.dateProposition = dateDuJour(src.jourProposition, HEURE_MAJ.h, HEURE_MAJ.m).toISOString();
    v.dateLimiteReponse = dateDuJour(src.jourProposition + (src.delaiReponse ?? 2), 23, 59).toISOString();
  }
  return v;
}

const FORMATIONS = new Map(SOURCES.map((src) => [src.base.id, src.base.formation]));

function construireMessages(jour: number): Message[] {
  const m: Message[] = [];
  const ajouter = (j: number, id: string, categorie: Message['categorie'], titre: string) => {
    if (j <= jour) m.push({ id, date: dateDuJour(j, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(), categorie, titre, lu: j < jour });
  };
  ajouter(0, 'm-debut', 'admission', 'Les premières réponses sont arrivées');
  for (const src of SOURCES) {
    if (src.jourProposition != null) {
      ajouter(src.jourProposition, `m-prop-${src.base.id}`, 'proposition', `Proposition d’admission : ${FORMATIONS.get(src.base.id)}`);
    }
  }
  ajouter(4, 'm-jpo', 'etablissement', 'IUT de Nantes : journée découverte le 19 juin');
  if (jour >= 1) ajouter(jour, `m-rangs-${jour}`, 'info', 'Vos positions en liste d’attente ont évolué');
  return m.sort((a, b) => b.date.localeCompare(a.date));
}

export function construireDossier(jour: number, debut: number, numeroDossier = '0000000'): Dossier {
  return {
    prenom: 'Camille',
    numeroDossier: `${numeroDossier} (fictif)`,
    derniereMiseAJour: dateDuJour(jour, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(),
    dateServeur: maintenantSimule(jour, debut).toISOString(),
    voeux: SOURCES.map((s) => construireVoeu(s, jour)),
    messages: construireMessages(jour),
    calendrier: [
      { date: dateDuJour(9, 9).toISOString(), libelle: 'Ouverture de la phase complémentaire' },
      { date: dateDuJour(16, 9).toISOString(), libelle: 'Point d’étape : confirmer ses vœux en attente sur le site' },
      { date: dateDuJour(39, 23, 59).toISOString(), libelle: 'Fin de la phase principale d’admission' },
    ],
  };
}
