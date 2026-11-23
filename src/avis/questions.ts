/**
 * Questionnaire testeurs, intégré à l'application.
 * Anonyme : aucune question ne demande d'information permettant d'identifier le testeur.
 */

export type Parcours = 'vecu' | 'futur';

export type Question =
  | { cle: string; type: 'choix'; titre: string; options: string[]; obligatoire: true; pour?: Parcours }
  | { cle: string; type: 'multiple'; titre: string; options: string[]; pour?: Parcours }
  | { cle: string; type: 'echelle'; titre: string; bas: string; haut: string; obligatoire: true; pour?: Parcours }
  | { cle: string; type: 'texte'; titre: string; aide?: string; pour?: Parcours };

/** Profil → questions sur le vécu (déjà passé par Parcoursup) ou sur les attentes. */
export const PROFILS: { libelle: string; parcours: Parcours }[] = [
  { libelle: 'Lycéen(ne) en terminale', parcours: 'futur' },
  { libelle: 'Étudiant(e), Parcoursup l’an dernier', parcours: 'vecu' },
  { libelle: 'Étudiant(e), Parcoursup il y a plus d’un an', parcours: 'vecu' },
  { libelle: 'Parent d’un(e) candidat(e)', parcours: 'vecu' },
  { libelle: 'Autre', parcours: 'futur' },
];

export const QUESTIONS: Question[] = [
  { cle: 'profil', type: 'choix', titre: 'Vous êtes…', options: PROFILS.map((p) => p.libelle), obligatoire: true },
  {
    cle: 'frequence',
    type: 'choix',
    pour: 'vecu',
    titre: 'Pendant la phase d’admission, combien de fois par jour consultiez-vous le dossier ?',
    options: ['Moins d’une fois', '1 à 2 fois', '3 à 5 fois', 'Plus de 5 fois'],
    obligatoire: true,
  },
  {
    cle: 'delai',
    type: 'choix',
    pour: 'vecu',
    titre: 'Avez-vous déjà raté, ou failli rater, un délai de réponse à une proposition ?',
    options: ['Oui, j’en ai raté un', 'J’ai failli', 'Non', 'Je ne sais pas'],
    obligatoire: true,
  },
  {
    cle: 'ressenti',
    type: 'texte',
    pour: 'vecu',
    titre: 'En une phrase, comment avez-vous vécu la phase d’admission ?',
  },
  {
    cle: 'frequence',
    type: 'choix',
    pour: 'futur',
    titre: 'Pendant la phase d’admission, combien de fois par jour pensez-vous consulter votre dossier ?',
    options: ['Moins d’une fois', '1 à 2 fois', '3 à 5 fois', 'Plus de 5 fois', 'Je ne sais pas'],
    obligatoire: true,
  },
  {
    cle: 'inquietudes',
    type: 'multiple',
    pour: 'futur',
    titre: 'Qu’est-ce qui vous inquiète le plus dans la phase d’admission ?',
    options: [
      'Rater un délai de réponse',
      'Ne pas comprendre où j’en suis sur les listes d’attente',
      'Devoir consulter le site très souvent',
      'Recevoir les réponses pendant les vacances ou les examens',
    ],
  },
  {
    cle: 'facilite',
    type: 'echelle',
    titre: 'L’application est-elle facile à comprendre ?',
    bas: 'Pas du tout',
    haut: 'Tout à fait',
    obligatoire: true,
  },
  {
    cle: 'utiliserait',
    type: 'echelle',
    titre: 'Si cette application existait, l’utiliseriez-vous ?',
    bas: 'Certainement pas',
    haut: 'Certainement',
    obligatoire: true,
  },
  {
    cle: 'serenite',
    type: 'choix',
    titre: 'Avec cette application, pendant la phase d’admission, vous vous sentiriez…',
    options: ['Plus serein(e)', 'Ni plus ni moins', 'Plus stressé(e)', 'Je ne sais pas'],
    obligatoire: true,
  },
  {
    cle: 'utile',
    type: 'multiple',
    titre: 'Qu’est-ce qui vous paraît le plus utile ?',
    options: [
      'Voir propositions et vœux en un coup d’œil',
      'Le compte à rebours avant la date limite',
      'La jauge et la courbe des listes d’attente',
      'La comparaison avec le dernier appelé l’an dernier',
      'Les notifications quand le dossier change',
      'Rester connecté sans ressaisir son mot de passe',
    ],
  },
  {
    cle: 'canal',
    type: 'choix',
    titre: 'Pour être prévenu d’un changement dans votre dossier, vous préférez…',
    options: ['Une notification de l’application', 'Un SMS', 'Un mail', 'Les trois', 'Peu importe'],
    obligatoire: true,
  },
  {
    cle: 'manques',
    type: 'texte',
    titre: 'Qu’est-ce qui vous a manqué, ou gêné ?',
    aide: 'Facultatif. N’indiquez aucune information personnelle.',
  },
  {
    cle: 'citation',
    type: 'choix',
    titre: 'Acceptez-vous que vos réponses écrites soient citées, de façon anonyme, dans une note destinée au ministère ?',
    options: ['Oui', 'Non'],
    obligatoire: true,
  },
];

export type Reponses = Record<string, string | string[] | number | undefined>;

/** Questions à poser selon le profil choisi. */
export function questionsPour(reponses: Reponses): Question[] {
  // Tant que le profil n'est pas choisi, on compte le parcours « attentes » pour afficher un total stable.
  const parcours = PROFILS.find((p) => p.libelle === reponses.profil)?.parcours ?? 'futur';
  return QUESTIONS.filter((q) => !q.pour || q.pour === parcours);
}
