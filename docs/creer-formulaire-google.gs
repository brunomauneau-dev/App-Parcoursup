/**
 * Crée le questionnaire testeurs « Suivi Vœux » dans Google Forms,
 * avec un tableur Google Sheets où arrivent les réponses.
 *
 * Mode d'emploi :
 *  1. Ouvrir https://script.google.com et cliquer sur « Nouveau projet ».
 *  2. Effacer le contenu, coller tout ce fichier, enregistrer (icône disquette).
 *  3. Cliquer sur « Exécuter » (fonction creerFormulaire) et accepter les autorisations
 *     demandées (créer un formulaire et un tableur dans votre Google Drive).
 *  4. Ouvrir le « Journal d'exécution » en bas : il affiche le lien à transmettre.
 *
 * Le formulaire est anonyme : aucune adresse e-mail n'est collectée.
 */
function creerFormulaire() {
  var form = FormApp.create('Avis sur le prototype « Suivi Vœux »');
  form.setDescription(
    "Merci d'avoir essayé ce prototype d'application pour suivre son dossier Parcoursup pendant la phase d'admission. " +
      'Toutes les données affichées sont fictives.\n\n' +
      "Ce questionnaire est anonyme et prend 2 à 3 minutes. N'indiquez ni votre nom, ni votre numéro de dossier Parcoursup, " +
      'ni le nom de votre lycée, ni aucune information personnelle, y compris dans les réponses libres.',
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false); // sinon une connexion Google est exigée
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Merci ! Vos réponses aideront à améliorer le suivi des candidatures sur Parcoursup.');
  try {
    form.setRequireLogin(false); // n'existe que pour les comptes Google Workspace
  } catch (e) {}

  // --- Section 1 : profil (oriente vers la section 2 ou 3) ---
  var profil = form.addMultipleChoiceItem().setTitle('Vous êtes…').setRequired(true);

  // --- Section 2 : a déjà vécu la phase d'admission ---
  var section2 = form.addPageBreakItem().setTitle('Votre expérience de la phase d’admission');
  form
    .addMultipleChoiceItem()
    .setTitle('Pendant la phase d’admission, combien de fois par jour consultiez-vous le dossier Parcoursup ?')
    .setChoiceValues(['Moins d’une fois', '1 à 2 fois', '3 à 5 fois', 'Plus de 5 fois'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Avez-vous déjà raté, ou failli rater, un délai de réponse à une proposition ?')
    .setChoiceValues(['Oui, j’en ai raté un', 'J’ai failli', 'Non', 'Je ne sais pas'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('En une phrase, comment avez-vous vécu la phase d’admission ?');

  // --- Section 3 : va vivre la phase d'admission ---
  var section3 = form.addPageBreakItem().setTitle('Vous allez vivre la phase d’admission');
  form
    .addMultipleChoiceItem()
    .setTitle('Pendant la phase d’admission, combien de fois par jour pensez-vous consulter votre dossier ?')
    .setChoiceValues(['Moins d’une fois', '1 à 2 fois', '3 à 5 fois', 'Plus de 5 fois', 'Je ne sais pas'])
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('Qu’est-ce qui vous inquiète le plus dans la phase d’admission ?')
    .setChoiceValues([
      'Rater un délai de réponse',
      'Ne pas comprendre où j’en suis sur les listes d’attente',
      'Devoir consulter le site très souvent',
      'Recevoir les réponses pendant les vacances ou les examens',
    ])
    .showOtherOption(true);

  // --- Section 4 : le prototype ---
  var section4 = form.addPageBreakItem().setTitle('Le prototype');
  form
    .addScaleItem()
    .setTitle('L’application est-elle facile à comprendre ?')
    .setBounds(1, 5)
    .setLabels('Pas du tout', 'Tout à fait')
    .setRequired(true);
  form
    .addScaleItem()
    .setTitle('Si cette application existait, l’utiliseriez-vous ?')
    .setBounds(1, 5)
    .setLabels('Certainement pas', 'Certainement')
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('Qu’est-ce qui vous paraît le plus utile ?')
    .setChoiceValues([
      'Voir toutes ses propositions et ses vœux en un coup d’œil',
      'Le compte à rebours avant la date limite de réponse',
      'La jauge et la courbe d’évolution de la position en liste d’attente',
      'La comparaison avec le rang du dernier appelé l’an dernier',
      'Être prévenu par une notification quand le dossier change',
      'Rester connecté sans ressaisir son mot de passe',
    ]);
  form.addParagraphTextItem().setTitle('Qu’est-ce qui vous a manqué, ou gêné ?');
  form
    .addMultipleChoiceItem()
    .setTitle('Acceptez-vous que vos réponses écrites soient citées, de façon anonyme, dans une note destinée au ministère ?')
    .setChoiceValues(['Oui', 'Non'])
    .setRequired(true);

  // --- Navigation : chaque profil va à sa section, puis tout le monde finit par « Le prototype » ---
  profil.setChoices([
    profil.createChoice('Lycéen(ne) en terminale', section3),
    profil.createChoice('Étudiant(e), j’ai utilisé Parcoursup l’an dernier', section2),
    profil.createChoice('Étudiant(e), j’ai utilisé Parcoursup il y a plus d’un an', section2),
    profil.createChoice('Parent d’un(e) candidat(e)', section2),
    profil.createChoice('Autre', section3),
  ]);
  section3.setGoToPage(section4); // la fin de la section 2 saute directement à « Le prototype »

  // --- Réponses dans un tableur ---
  var tableur = SpreadsheetApp.create('Réponses – prototype Suivi Vœux');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tableur.getId());

  // Formulaires créés après 2025 : publication explicite, si la méthode existe
  try {
    if (form.setPublished) form.setPublished(true);
  } catch (e) {}

  var lien = form.getPublishedUrl();
  try {
    lien = form.shortenFormUrl(lien);
  } catch (e) {}
  Logger.log('LIEN À TRANSMETTRE (testeurs) : ' + lien);
  Logger.log('Modifier le formulaire : ' + form.getEditUrl());
  Logger.log('Voir les réponses : ' + tableur.getUrl());
}
