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

/** Notification envoyée après la mise à jour du matin. */
export function messageDuMatin(dossier: Dossier, maintenant: Date): string {
  return rappelClassement(dossier, maintenant) ?? MESSAGE_MISE_A_JOUR;
}
