import type { Dossier, DossierApi, PointHistorique, Voeu } from './types';

/**
 * Données entièrement FICTIVES pour la démonstration.
 * La phase d'admission simulée commence le 2 juin 2027 (jour 0).
 */
const J0 = new Date(2027, 5, 2); // 2 juin 2027, heure locale
export const JOUR_INITIAL = 4;
export const JOUR_MAX = 7;
const HEURE_MAJ = { h: 6, m: 12 }; // mise à jour nocturne simulée

function dateDuJour(jour: number, h = 0, m = 0): Date {
  const d = new Date(J0);
  d.setDate(d.getDate() + jour);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Début réel de la démo, pour faire avancer l'horloge simulée en temps réel. */
const debutReel = Date.now();

/** Heure « actuelle » simulée : jour courant à 9h30 + temps réel écoulé. */
export function maintenantSimule(jour: number): Date {
  return new Date(dateDuJour(jour, 9, 30).getTime() + (Date.now() - debutReel));
}

interface VoeuSource {
  base: Omit<Voeu, 'statut' | 'rang' | 'historique' | 'dateProposition' | 'dateLimiteReponse'>;
  /** Rang par jour (index = jour). null = plus en attente. */
  rangs?: (number | null)[];
  /** Jour de réception d'une proposition */
  jourProposition?: number;
  /** Délai de réponse en jours (date limite à 23h59) */
  delaiReponse?: number;
  accepteeLeJour?: number;
  refuse?: boolean;
}

const SOURCES: VoeuSource[] = [
  {
    base: {
      id: 'v1',
      formation: 'CPGE MPSI',
      etablissement: 'Lycée Jules Ferry',
      ville: 'Nantes',
    },
    jourProposition: 3,
    delaiReponse: 3,
  },
  {
    base: {
      id: 'v2',
      formation: 'Licence Mathématiques',
      etablissement: 'Université de Nantes',
      ville: 'Nantes',
    },
    jourProposition: 0,
    delaiReponse: 3,
    accepteeLeJour: 1,
  },
  {
    base: {
      id: 'v3',
      formation: 'BUT Informatique',
      etablissement: 'IUT de Nantes',
      ville: 'Nantes',
      totalEnAttente: 1180,
      places: 104,
      rangDernierAppeleAnneePrecedente: 420,
    },
    rangs: [612, 540, 498, 455, 431, 402, 377, 351],
  },
  {
    base: {
      id: 'v4',
      formation: 'BUT GEII',
      etablissement: 'IUT de Rennes',
      ville: 'Rennes',
      totalEnAttente: 410,
      places: 56,
      rangDernierAppeleAnneePrecedente: 112,
    },
    rangs: [140, 121, 109, 95, 87, null, null, null],
    jourProposition: 5,
    delaiReponse: 2,
  },
  {
    base: {
      id: 'v5',
      formation: 'Licence Informatique',
      etablissement: 'Université de Rennes',
      ville: 'Rennes',
      totalEnAttente: 905,
      places: 240,
      rangDernierAppeleAnneePrecedente: 610,
    },
    rangs: [402, 380, 371, 352, 340, 331, 320, 309],
  },
  {
    base: {
      id: 'v6',
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
    base: {
      id: 'v7',
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
    v.statut = src.accepteeLeJour != null && jour >= src.accepteeLeJour ? 'proposition_acceptee' : 'proposition';
    v.dateProposition = dateDuJour(src.jourProposition, HEURE_MAJ.h, HEURE_MAJ.m).toISOString();
    v.dateLimiteReponse = dateDuJour(src.jourProposition + (src.delaiReponse ?? 2), 23, 59).toISOString();
  }
  return v;
}

export class MockApi implements DossierApi {
  jour = JOUR_INITIAL;
  private connecte = false;

  async connexion(_numeroDossier: string, _motDePasse: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    this.connecte = true;
  }

  async deconnexion(): Promise<void> {
    this.connecte = false;
    this.jour = JOUR_INITIAL;
  }

  async getDossier(): Promise<Dossier> {
    if (!this.connecte) throw new Error('Non connecté');
    return {
      prenom: 'Camille',
      numeroDossier: '0000000 (fictif)',
      derniereMiseAJour: dateDuJour(this.jour, HEURE_MAJ.h, HEURE_MAJ.m).toISOString(),
      voeux: SOURCES.map((s) => construireVoeu(s, this.jour)),
    };
  }

  /** Démo uniquement : simule la mise à jour de la nuit suivante. */
  simulerNuit(): boolean {
    if (this.jour >= JOUR_MAX) return false;
    this.jour += 1;
    return true;
  }
}

export const api = new MockApi();
