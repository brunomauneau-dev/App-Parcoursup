/**
 * Réception des avis du questionnaire intégré à l'application « Suivi Vœux ».
 * Version sans tableur : les réponses sont stockées dans le script lui-même
 * (aucun droit sur Google Drive ou Google Sheets n'est nécessaire).
 *
 * Mise en place (une seule fois) :
 *  1. Dans le projet Apps Script : tout effacer, coller ce fichier (il commence par « /** »), enregistrer.
 *  2. Choisir la fonction « installer » en haut, cliquer sur « Exécuter », accepter les autorisations.
 *     Le journal affiche une CLÉ DE CONSULTATION : la garder pour soi.
 *  3. « Déployer » > « Nouveau déploiement » > roue dentée > « Application web » :
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *     puis « Déployer ». Copier l'« URL de l'application web » (elle finit par /exec)
 *     et la transmettre : c'est l'adresse à laquelle l'application envoie les réponses.
 *
 * Consulter les réponses : ouvrir dans le navigateur
 *     <URL de l'application web>?cle=<CLÉ DE CONSULTATION>
 * Télécharger un fichier pour Excel :
 *     <URL de l'application web>?cle=<CLÉ DE CONSULTATION>&format=csv
 *
 * Les réponses sont anonymes : l'application n'envoie aucune donnée d'identification,
 * et ce script n'enregistre ni adresse IP ni compte Google.
 * Capacité : plusieurs centaines de réponses.
 */

var COLONNES = [
  ['date', 'Date'],
  ['profil', 'Profil'],
  ['frequence', 'Consultations par jour'],
  ['delai', 'Délai raté ou presque'],
  ['ressenti', 'Ressenti de la phase d’admission'],
  ['inquietudes', 'Inquiétudes'],
  ['facilite', 'Facilité de compréhension (1-5)'],
  ['utiliserait', 'Utiliserait l’application (1-5)'],
  ['serenite', 'Se sentirait (sérénité)'],
  ['utile', 'Le plus utile'],
  ['canal', 'Canal préféré pour être prévenu'],
  ['manques', 'Manques ou gênes'],
  ['citation', 'Accepte d’être cité'],
  ['version', 'Version du questionnaire (et dossier fictif vu)'],
  ['autres', 'Autres réponses'],
];

function installer() {
  var proprietes = PropertiesService.getScriptProperties();
  var cle = proprietes.getProperty('CLE');
  if (!cle) {
    cle = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    proprietes.setProperty('CLE', cle);
  }
  Logger.log('CLÉ DE CONSULTATION (à garder pour soi) : ' + cle);
  Logger.log('Étape suivante : Déployer > Nouveau déploiement > Application web (accès : Tout le monde).');
  Logger.log('Réponses reçues jusqu’ici : ' + lireReponses().length);
}

/** Reçoit une réponse envoyée par l'application. */
function doPost(e) {
  var verrou = LockService.getScriptLock();
  try {
    verrou.waitLock(10000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ligne = {};
    var connues = {};
    COLONNES.forEach(function (c) {
      connues[c[0]] = true;
      ligne[c[0]] = c[0] === 'date' ? new Date().toISOString() : nettoyer(d[c[0]]);
    });
    // Questions ajoutées plus tard à l'application : conservées sans modifier ce script
    var autres = {};
    Object.keys(d).forEach(function (k) {
      if (!connues[k]) autres[k] = d[k];
    });
    ligne.autres = Object.keys(autres).length ? nettoyer(JSON.stringify(autres)) : '';
    var proprietes = PropertiesService.getScriptProperties();
    var n = Number(proprietes.getProperty('NB') || 0) + 1;
    proprietes.setProperty('R' + ('00000' + n).slice(-5), JSON.stringify(ligne));
    proprietes.setProperty('NB', String(n));
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false });
  } finally {
    try { verrou.releaseLock(); } catch (e2) {}
  }
}

/** Consultation des réponses, protégée par la clé. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var cle = PropertiesService.getScriptProperties().getProperty('CLE');
  if (!cle || p.cle !== cle) {
    return ContentService.createTextOutput('Accès réservé.');
  }
  var reponses = lireReponses();
  if (p.format === 'csv') {
    var lignes = [COLONNES.map(function (c) { return c[1]; })].concat(
      reponses.map(function (r) { return COLONNES.map(function (c) { return r[c[0]]; }); }),
    );
    var csv = '﻿' + lignes.map(function (l) { return l.map(champCsv).join(';'); }).join('\r\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV).downloadAsFile('reponses-suivi-voeux.csv');
  }
  var html =
    '<meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:24px;color:#181F2E}' +
    'table{border-collapse:collapse;font-size:13px}th,td{border:1px solid #DDE1E8;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#F3F5F9;position:sticky;top:0}</style>' +
    '<h1>Réponses au questionnaire Suivi Vœux</h1><p>' + reponses.length + ' réponse(s). ' +
    '<a href="?cle=' + encodeURIComponent(cle) + '&format=csv">Télécharger pour Excel (CSV)</a></p>' +
    '<table><tr>' + COLONNES.map(function (c) { return '<th>' + echapper(c[1]) + '</th>'; }).join('') + '</tr>' +
    reponses
      .map(function (r) {
        return '<tr>' + COLONNES.map(function (c) {
          var v = c[0] === 'date' ? new Date(r.date).toLocaleString('fr-FR') : r[c[0]];
          return '<td>' + echapper(v) + '</td>';
        }).join('') + '</tr>';
      })
      .join('') +
    '</table>';
  return HtmlService.createHtmlOutput(html).setTitle('Réponses Suivi Vœux');
}

function lireReponses() {
  var tout = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(tout)
    .filter(function (k) { return /^R\d{5}$/.test(k); })
    .sort()
    .map(function (k) { return JSON.parse(tout[k]); });
}

/** Texte court, sans formule (une réponse commençant par « = » ne doit pas être exécutée par Excel). */
function nettoyer(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) v = v.join(' ; ');
  if (typeof v === 'number') return v;
  var s = String(v).slice(0, 1200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function champCsv(v) {
  var s = v === undefined || v === null ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}

function echapper(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
