const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dateCourte(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function dateLongue(iso: string): string {
  const d = new Date(iso);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function heure(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
}

export function nombre(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function compteARebours(limite: Date, maintenant: Date): { texte: string; urgent: boolean; expire: boolean } {
  const ms = limite.getTime() - maintenant.getTime();
  if (ms <= 0) return { texte: 'Délai dépassé', urgent: true, expire: true };
  const totalMin = Math.floor(ms / 60000);
  const j = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const texte = j > 0 ? `${j} j ${h} h ${m} min` : `${h} h ${String(m).padStart(2, '0')} min`;
  return { texte, urgent: ms < 24 * 3600 * 1000, expire: false };
}

const JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** « Dimanche 6 juin » */
export function jourLong(d: Date): string {
  return `${JOURS_LONGS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 8 juin, 23h59 » */
export function echeance(iso: string): string {
  return `${dateCourte(iso)}, ${heure(iso)}`;
}

/** « il reste 2 jours », « il reste 5 h », « délai dépassé » */
export function resteAvant(limite: Date, maintenant: Date): string {
  const ms = limite.getTime() - maintenant.getTime();
  if (ms <= 0) return 'délai dépassé';
  const jours = Math.floor(ms / 86_400_000);
  if (jours >= 2) return `il reste ${jours} jours`;
  if (jours === 1) return 'il reste 1 jour';
  const heures = Math.max(1, Math.floor(ms / 3_600_000));
  return `il reste ${heures} h`;
}

/** « 1er », « 468e » */
export function ordinal(n: number): string {
  return n === 1 ? '1er' : `${nombre(n)}e`;
}
