/**
 * Données entièrement FICTIVES pour la démonstration.
 * Partagées par l'API simulée de l'application (mock.ts) et par le serveur
 * de démonstration (server/). Ce fichier ne doit importer que des types.
 *
 * La phase d'admission simulée suit le calendrier officiel 2027 : début le mardi 1er juin
 * (jour 0), classement des vœux en attente du 4 au 7 juin, phase complémentaire le 10 juin,
 * fin de la phase principale le 10 juillet.
 */
import type { Dossier, Message, PointHistorique, Voeu } from './types';

/** La démonstration commence au premier jour des admissions (mardi 1er juin 2027). */
export const JOUR_INITIAL = 0;
export const JOUR_MAX = 7;
const J0 = new Date(2027, 5, 1); // mardi 1er juin 2027, heure locale
const HEURE_MAJ = { h: 9, m: 0 }; // notifications et messages : à partir de 9 h, jamais la nuit

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

const VOEUX_CAMILLE: VoeuSource[] = [
  {
    base: {
      id: 'v1',
      categorie: 'Classe prépa',
      formation: 'CPGE MPSI',
      etablissement: 'Lycée Jules Ferry',
      ville: 'Nantes',
      totalEnAttente: 640,
      places: 48,
      rangClassement: 285,
      rangDernierAppeleAnneePrecedente: 260,
    },
    rangs: [230, 198, 171, null, null, null, null, null],
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
      rangClassement: 730,
      rangDernierAppeleAnneePrecedente: 640,
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
      rangClassement: 240,
      rangDernierAppeleAnneePrecedente: 215,
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
      rangClassement: 1160,
      rangDernierAppeleAnneePrecedente: 980,
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
      rangClassement: 2900,
      rangDernierAppeleAnneePrecedente: 2400,
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

/** Yanis : bac pro, vise des BTS. Aucune proposition au départ ; la première arrive mardi. */
const VOEUX_YANIS: VoeuSource[] = [
  {
    base: {
      id: 'y1',
      categorie: 'BTS',
      formation: 'BTS Management commercial opérationnel',
      etablissement: 'Lycée (fictif) Gustave Eiffel',
      ville: 'Bordeaux',
      totalEnAttente: 190,
      places: 30,
      rangClassement: 74,
      rangDernierAppeleAnneePrecedente: 61,
    },
    rangs: [44, 38, 31, 27, 24, 19, null, null],
    jourProposition: 6,
    delaiReponse: 3,
  },
  {
    base: {
      id: 'y2',
      categorie: 'BTS',
      formation: 'BTS Négociation et digitalisation de la relation client',
      etablissement: 'Lycée (fictif) Condorcet',
      ville: 'Bordeaux',
      totalEnAttente: 330,
      places: 35,
      rangClassement: 250,
      rangDernierAppeleAnneePrecedente: 170,
    },
    rangs: [210, 198, 187, 176, 170, 161, 152, 140],
  },
  {
    base: {
      id: 'y3',
      categorie: 'BTS',
      formation: 'BTS Services informatiques aux organisations',
      etablissement: 'Lycée (fictif) Montesquieu',
      ville: 'Libourne',
      totalEnAttente: 260,
      places: 28,
      rangClassement: 185,
      rangDernierAppeleAnneePrecedente: 130,
    },
    rangs: [154, 141, 133, 126, 118, 110, 104, 97],
  },
  {
    base: {
      id: 'y4',
      categorie: 'BTS',
      formation: 'BTS Comptabilité et gestion',
      etablissement: 'Lycée (fictif) Jean Moulin',
      ville: 'Périgueux',
      totalEnAttente: 150,
      places: 24,
      rangClassement: 115,
      rangDernierAppeleAnneePrecedente: 90,
    },
    rangs: [88, 80, 77, 71, 66, 62, 57, 52],
  },
  {
    base: {
      id: 'y5',
      categorie: 'BUT',
      formation: 'BUT Gestion des entreprises et des administrations',
      etablissement: 'IUT (fictif) de Bordeaux',
      ville: 'Bordeaux',
    },
    refuse: true,
  },
];

/** Inès : étudiante en réorientation. Une place déjà acceptée, un vœu encore en attente. */
const VOEUX_INES: VoeuSource[] = [
  {
    base: {
      id: 'i1',
      categorie: 'BUT',
      formation: 'BUT Information-Communication',
      etablissement: 'IUT (fictif) de Tours',
      ville: 'Tours',
    },
    jourProposition: 0,
    delaiReponse: 3,
    accepteeLeJour: 1,
  },
  {
    base: {
      id: 'i2',
      categorie: 'Licence',
      formation: 'Licence Psychologie',
      etablissement: 'Université (fictive) de Tours',
      ville: 'Tours',
      totalEnAttente: 2100,
      places: 380,
      rangClassement: 1850,
      rangDernierAppeleAnneePrecedente: 1100,
    },
    rangs: [1450, 1402, 1377, 1350, 1321, 1296, 1270, 1251],
  },
  {
    base: {
      id: 'i3',
      categorie: 'Licence',
      formation: 'Licence Information-Communication',
      etablissement: 'Université (fictive) de Poitiers',
      ville: 'Poitiers',
      totalEnAttente: 640,
      places: 160,
      rangClassement: 570,
      rangDernierAppeleAnneePrecedente: 420,
    },
    rangs: [402, 385, 371, 360, 352, 343, 336, 330],
  },
  {
    base: {
      id: 'i4',
      categorie: 'BTS',
      formation: 'BTS Communication',
      etablissement: 'Lycée (fictif) Choiseul',
      ville: 'Tours',
      totalEnAttente: 80,
      places: 24,
      rangClassement: 34,
      rangDernierAppeleAnneePrecedente: 30,
    },
    rangs: [9, 5, null, null, null, null, null, null],
    jourProposition: 2,
    delaiReponse: 3,
    refuseeLeJour: 3,
  },
];

/** Lucas : terminale STMG. Des refus et des listes d'attente loin du dernier appelé. */
const VOEUX_LUCAS: VoeuSource[] = [
  {
    base: {
      id: 'l1',
      categorie: 'BTS',
      formation: 'BTS Banque, conseiller de clientèle',
      etablissement: 'Lycée (fictif) Gaston Berger',
      ville: 'Lille',
      totalEnAttente: 520,
      places: 35,
      rangClassement: 380,
      rangDernierAppeleAnneePrecedente: 140,
    },
    rangs: [342, 331, 323, 317, 312, 306, 301, 297],
  },
  {
    base: {
      id: 'l2',
      categorie: 'Licence',
      formation: 'Licence Administration économique et sociale',
      etablissement: 'Université (fictive) de Lille',
      ville: 'Lille',
      totalEnAttente: 1300,
      places: 300,
      rangClassement: 1210,
      rangDernierAppeleAnneePrecedente: 640,
    },
    rangs: [905, 880, 866, 851, 840, 829, 818, 806],
  },
  {
    base: {
      id: 'l3',
      categorie: 'BUT',
      formation: 'BUT Techniques de commercialisation',
      etablissement: 'IUT (fictif) de Lille',
      ville: 'Lille',
    },
    refuse: true,
  },
  {
    base: {
      id: 'l4',
      categorie: 'BTS',
      formation: 'BTS Management commercial opérationnel',
      etablissement: 'Lycée (fictif) Baggio',
      ville: 'Lille',
    },
    refuse: true,
  },
  {
    base: { id: 'l5', categorie: 'BTS', formation: 'BTS Gestion de la PME', etablissement: 'Lycée (fictif) Pasteur', ville: 'Lille' },
    refuse: true,
  },
];

interface ProfilDemo {
  id: string;
  prenom: string;
  presentation: string;
  numero: string;
  voeux: VoeuSource[];
  /** Message d'un établissement, propre au profil */
  messageEtablissement?: { jour: number; titre: string };
}

export const PROFILS_DEMO: ProfilDemo[] = [
  {
    id: 'camille',
    prenom: 'Camille',
    presentation: 'Camille, terminale générale, Nantes',
    numero: '1000001',
    voeux: VOEUX_CAMILLE,
    messageEtablissement: { jour: 4, titre: 'IUT de Nantes : journée découverte le 19 juin' },
  },
  {
    id: 'yanis',
    prenom: 'Yanis',
    presentation: 'Yanis, terminale bac pro, vise un BTS, Bordeaux',
    numero: '1000002',
    voeux: VOEUX_YANIS,
    messageEtablissement: { jour: 3, titre: 'Lycée (fictif) Gustave Eiffel : réunion d’information le 15 juin' },
  },
  {
    id: 'ines',
    prenom: 'Inès',
    presentation: 'Inès, étudiante en réorientation, Tours',
    numero: '1000003',
    voeux: VOEUX_INES,
    messageEtablissement: { jour: 2, titre: 'IUT (fictif) de Tours : inscription administrative à partir du 1er juillet' },
  },
  {
    id: 'lucas',
    prenom: 'Lucas',
    presentation: 'Lucas, terminale technologique STMG, Lille',
    numero: '1000004',
    voeux: VOEUX_LUCAS,
  },
];

export const PROFIL_PAR_DEFAUT = 'camille';

function profilDemo(id: string): ProfilDemo {
  return PROFILS_DEMO.find((p) => p.id === id) ?? PROFILS_DEMO[0];
}

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

function construireMessages(profil: ProfilDemo, jour: number): Message[] {
  const m: Message[] = [];
  const ajouter = (j: number, id: string, categorie: Message['categorie'], titre: string) => {
    if (j <= jour) m.push({ id, date: dateDuJour(j, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(), categorie, titre, lu: j < jour });
  };
  ajouter(0, 'm-debut', 'admission', 'Les premières réponses sont arrivées');
  for (const src of profil.voeux) {
    if (src.jourProposition != null) {
      ajouter(src.jourProposition, `m-prop-${src.base.id}`, 'proposition', `Proposition d’admission : ${src.base.formation}`);
    }
  }
  if (profil.messageEtablissement) ajouter(profil.messageEtablissement.jour, 'm-etab', 'etablissement', profil.messageEtablissement.titre);
  if (jour >= 1) ajouter(jour, `m-rangs-${jour}`, 'info', 'Vos positions en liste d’attente ont évolué');
  return m.sort((a, b) => b.date.localeCompare(a.date));
}

export function construireDossier(jour: number, debut: number, numeroDossier?: string, idProfil = PROFIL_PAR_DEFAUT): Dossier {
  const profil = profilDemo(idProfil);
  return {
    prenom: profil.prenom,
    numeroDossier: `${numeroDossier ?? profil.numero} (fictif)`,
    derniereMiseAJour: dateDuJour(jour, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(),
    dateServeur: maintenantSimule(jour, debut).toISOString(),
    voeux: profil.voeux.map((s) => construireVoeu(s, jour)),
    messages: construireMessages(profil, jour),
    calendrier: [
      { date: dateDuJour(3, 0).toISOString(), libelle: 'Du vendredi 4 au lundi 7 juin : classer vos vœux en attente (sur le site)' },
      { date: dateDuJour(9, 9).toISOString(), libelle: 'Début de la phase complémentaire : jusqu’à 10 nouveaux vœux' },
      { date: dateDuJour(39, 23, 59).toISOString(), libelle: 'Fin de la phase principale' },
    ],
    // Calendrier officiel 2027 : classement des vœux en attente du vendredi 4 au lundi 7 juin inclus
    classementAttente: { debut: dateDuJour(3, 0).toISOString(), fin: dateDuJour(6, 23, 59).toISOString() },
    profilDemo: { id: profil.id, presentation: profil.presentation },
  };
}
