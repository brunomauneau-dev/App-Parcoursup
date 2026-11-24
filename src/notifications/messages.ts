import type { Dossier } from '../api/types';

/** Message par défaut : aucune donnée personnelle sur l'écran verrouillé. */
export const MESSAGE_MISE_A_JOUR = 'Votre dossier a été mis à jour. Ouvrez l’application pour le consulter.';

const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Série de rappels pendant le classement des vœux en attente (calendrier 2027 : du 4 au 7 juin).
 * Au plus trois notifications, toujours à partir de 9 h, et seulement si le classement n'est pas fait :
 * le jour de l'ouverture, la veille de la fin, le dernier jour. Rien entre les deux, pour ne pas harceler.
 * L'échéance est la même pour tous : le message ne révèle rien de personnel.
 */
export function rappelClassement(dossier: Dossier, maintenant: Date): string | null {
  const c = dossier.classementAttente;
  if (!c || c.fait || !dossier.voeux.some((v) => v.statut === 'en_attente')) return null;
  const debut = new Date(c.debut);
  const fin = new Date(c.fin);
  if (maintenant < debut || maintenant > fin) return null;
  const veille = new Date(fin);
  veille.setDate(veille.getDate() - 1);
  if (memeJour(maintenant, debut)) {
    const jour = fin.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `C’est le moment de classer vos vœux en attente. Vous avez jusqu’au ${jour}, 23h59, sur le site.`;
  }
  if (memeJour(maintenant, veille)) return 'Plus que demain pour classer vos vœux en attente, sur le site.';
  if (memeJour(maintenant, fin)) return 'Dernier jour pour classer vos vœux en attente : jusqu’à 23h59, sur le site.';
  return null;
}

/** Premier jour, à l'ouverture des résultats (par vagues, au rythme fixé par le SCN). */
export const MESSAGE_OUVERTURE = 'Les résultats de la phase d’admission sont disponibles. Ouvrez l’application pour les consulter.';

/** Nouvelle proposition (texte générique : rien de personnel sur l'écran verrouillé). */
export const MESSAGE_NOUVEAUTE = 'Du nouveau dans votre dossier. Ouvrez l’application pour le consulter.';
/** Veille d'une date limite de réponse. */
export const MESSAGE_DATE_LIMITE = 'Une date limite de réponse approche : demain, 23h59. Ouvrez l’application pour voir laquelle.';

/**
 * Notification du matin, seulement quand il y a quelque chose à faire ou à voir (infobésité) :
 * ouverture des résultats, nouvelle proposition, veille d'une date limite, rappels du classement.
 * Les simples mouvements de liste d'attente ne déclenchent rien : on les consulte quand on veut.
 * Renvoie null s'il n'y a pas lieu de prévenir.
 */
export function messageDuMatin(avant: Dossier | null, apres: Dossier, maintenant: Date, ouverture = false): string | null {
  if (ouverture) return MESSAGE_OUVERTURE;
  const etaitProposition = new Set(avant?.voeux.filter((v) => v.statut === 'proposition').map((v) => v.id));
  if (apres.voeux.some((v) => v.statut === 'proposition' && !etaitProposition.has(v.id))) return MESSAGE_NOUVEAUTE;
  const demain = new Date(maintenant);
  demain.setDate(demain.getDate() + 1);
  if (apres.voeux.some((v) => v.statut === 'proposition' && v.dateLimiteReponse && memeJour(new Date(v.dateLimiteReponse), demain))) {
    return MESSAGE_DATE_LIMITE;
  }
  return rappelClassement(apres, maintenant);
}
