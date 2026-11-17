/**
 * Réception des avis du questionnaire intégré à l'application « Suivi Vœux ».
 * Chaque réponse envoyée par l'application ajoute une ligne dans un tableur Google.
 *
 * Mise en place (5 minutes, une seule fois) :
 *  1. Ouvrir https://script.google.com, cliquer sur « Nouveau projet ».
 *  2. Effacer le contenu, coller tout ce fichier, enregistrer (icône disquette).
 *  3. Choisir la fonction « installer » dans la liste en haut, cliquer sur « Exécuter »,
 *     accepter les autorisations. Le journal affiche le lien du tableur des réponses.
 *  4. Cliquer sur « Déployer » > « Nouveau déploiement » > roue dentée > « Application web » :
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *     puis « Déployer ». Copier l'« URL de l'application web » (elle finit par /exec)
 *     et la transmettre : c'est l'adresse à laquelle l'application envoie les réponses.
 *
 * Les réponses sont anonymes : l'application n'envoie aucune donnée d'identification,
 * et ce script n'enregistre ni adresse IP ni compte Google.
 */

var FEUILLE = 'Réponses';
var COLONNES = [
  ['date', 'Date'],
  ['profil', 'Profil'],
  ['frequence', 'Consultations par jour'],
  ['delai', 'Délai raté ou presque'],
  ['ressenti', 'Ressenti de la phase d’admission'],
  ['inquietudes', 'Inquiétudes'],
  ['facilite', 'Facilité de compréhension (1-5)'],
  ['utiliserait', 'Utiliserait l’application (1-5)'],
  ['utile', 'Le plus utile'],
  ['manques', 'Manques ou gênes'],
  ['citation', 'Accepte d’être cité'],
  ['version', 'Version du questionnaire'],
];

function installer() {
  var tableur = SpreadsheetApp.create('Réponses – prototype Suivi Vœux');
  var feuille = tableur.getSheets()[0];
  feuille.setName(FEUILLE);
  feuille.appendRow(COLONNES.map(function (c) { return c[1]; }));
  feuille.setFrozenRows(1);
  feuille.getRange(1, 1, 1, COLONNES.length).setFontWeight('bold');
  PropertiesService.getScriptProperties().setProperty('TABLEUR', tableur.getId());
  Logger.log('Tableur des réponses : ' + tableur.getUrl());
  Logger.log('Étape suivante : Déployer > Nouveau déploiement > Application web (accès : Tout le monde).');
}

function doPost(e) {
  var verrou = LockService.getScriptLock();
  try {
    verrou.waitLock(10000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var id = PropertiesService.getScriptProperties().getProperty('TABLEUR');
    var feuille = SpreadsheetApp.openById(id).getSheetByName(FEUILLE);
    var ligne = COLONNES.map(function (c) {
      if (c[0] === 'date') return new Date();
      return nettoyer(d[c[0]]);
    });
    feuille.appendRow(ligne);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false });
  } finally {
    try { verrou.releaseLock(); } catch (e2) {}
  }
}

/** Texte court et sans formule : une réponse commençant par « = » ne doit pas être exécutée par le tableur. */
function nettoyer(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) v = v.join(' ; ');
  if (typeof v === 'number') return v;
  var s = String(v).slice(0, 1500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
