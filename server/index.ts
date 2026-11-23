/**
 * Serveur de DÉMONSTRATION de l'API de consultation (contrat : docs/openapi.yaml).
 * Il reproduit le comportement attendu du SCN avec des données fictives :
 *   - connexion sur une page web du serveur d'authentification, ouverte dans le
 *     navigateur du téléphone (OAuth 2, code d'autorisation + PKCE) : l'application
 *     ne voit jamais le mot de passe ;
 *   - double authentification par code à 6 chiffres (3 essais, puis blocage) ;
 *   - écran d'autorisation : le candidat voit ce que l'application pourra consulter ;
 *   - jeton d'accès limité à `dossier.read`, courte durée ;
 *     jeton de renouvellement à usage unique, avec détection de réutilisation ;
 *   - API en lecture seule : toute autre méthode que GET sur /v1 est refusée (405).
 *
 * Lancement : `npm run serveur` (Node 22.18 ou plus récent, sans dépendance).
 * Identifiants : n'importe quel numéro de dossier ; le mot de passe « incorrect »
 * simule une erreur d'identification. Le code de vérification, normalement envoyé
 * par mail, est affiché sur la page (serveur de démonstration).
 * NE PAS utiliser en production.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { construireDossier, JOUR_INITIAL, JOUR_MAX } from '../src/api/donneesDemo.ts';

const SCOPE = 'dossier.read';
const CLIENT_ID = 'suivi-voeux-mobile';
const TAILLE_MAX_CORPS = 10_000;
const ESSAIS_CODE = 3;
const DUREE_CODE_MS = 5 * 60_000;
const DUREE_CODE_AUTORISATION_MS = 60_000;
/** Adresses de retour acceptées : l'application installée, Expo Go et le développement local. */
const RETOURS_AUTORISES = [/^suivivoeux:\/\//, /^exp:\/\//, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//];

interface Options {
  /** Durée de vie du jeton d'accès, en secondes */
  dureeAcces?: number;
  /** Tentatives de connexion autorisées par minute et par adresse IP */
  tentativesParMinute?: number;
}

interface JetonAcces {
  candidat: string;
  expire: number;
}
interface JetonRenouvellement {
  candidat: string;
  famille: string;
  utilise: boolean;
}
/** Demande de connexion en cours (entre la page de connexion et le retour à l'application). */
interface Demande {
  redirectUri: string;
  state: string;
  challenge: string;
  expire: number;
  candidat?: string;
  code2fa?: string;
  /** Code de vérification validé : reste l'autorisation à donner */
  verifie?: boolean;
  essais: number;
}
interface CodeAutorisation {
  candidat: string;
  redirectUri: string;
  challenge: string;
  expire: number;
}
interface EtatCandidat {
  jour: number;
  debut: number;
}

export function creerServeur(options: Options = {}): Server {
  const dureeAcces = options.dureeAcces ?? 300;
  const tentativesParMinute = options.tentativesParMinute ?? 10;
  const acces = new Map<string, JetonAcces>();
  const renouvellements = new Map<string, JetonRenouvellement>();
  const candidats = new Map<string, EtatCandidat>();
  const tentatives = new Map<string, number[]>();
  const demandes = new Map<string, Demande>();
  const codes = new Map<string, CodeAutorisation>();

  const nouveauJeton = () => randomBytes(32).toString('base64url');

  function emettre(candidat: string, famille: string) {
    const a = nouveauJeton();
    const r = nouveauJeton();
    acces.set(a, { candidat, expire: Date.now() + dureeAcces * 1000 });
    renouvellements.set(r, { candidat, famille, utilise: false });
    return { access_token: a, token_type: 'Bearer', expires_in: dureeAcces, refresh_token: r, scope: SCOPE };
  }

  function revoquerFamille(famille: string) {
    for (const [cle, j] of renouvellements) if (j.famille === famille) renouvellements.delete(cle);
  }

  function limiteAtteinte(ip: string): boolean {
    const maintenant = Date.now();
    const recentes = (tentatives.get(ip) ?? []).filter((t) => maintenant - t < 60_000);
    recentes.push(maintenant);
    tentatives.set(ip, recentes);
    return recentes.length > tentativesParMinute;
  }

  function authentifier(req: IncomingMessage): string | null {
    const entete = req.headers.authorization ?? '';
    const m = /^Bearer (\S+)$/.exec(entete);
    if (!m) return null;
    const j = acces.get(m[1]);
    if (!j) return null;
    if (j.expire < Date.now()) {
      acces.delete(m[1]);
      return null;
    }
    return j.candidat;
  }

  function etat(candidat: string): EtatCandidat {
    let e = candidats.get(candidat);
    if (!e) {
      e = { jour: JOUR_INITIAL, debut: Date.now() };
      candidats.set(candidat, e);
    }
    return e;
  }

  async function traiter(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const chemin = url.pathname;
    const methode = req.method ?? 'GET';

    if (methode === 'OPTIONS') return envoyer(res, 204);
    if (chemin === '/sante' && methode === 'GET') return envoyer(res, 200, { ok: true });

    // --- Page de connexion (serveur d'authentification) ----------------------
    if (chemin === '/oauth/authorize' && methode === 'GET') {
      const p = url.searchParams;
      const redirectUri = p.get('redirect_uri') ?? '';
      // Adresse de retour inconnue : on ne redirige surtout pas (risque de vol du code).
      if (p.get('client_id') !== CLIENT_ID || !RETOURS_AUTORISES.some((r) => r.test(redirectUri))) {
        return envoyerPage(res, 400, pageMessage('Demande de connexion invalide.'));
      }
      if (p.get('response_type') !== 'code' || p.get('code_challenge_method') !== 'S256' || !p.get('code_challenge')) {
        return rediriger(res, redirectUri, { error: 'invalid_request', state: p.get('state') ?? '' });
      }
      if ((p.get('scope') ?? SCOPE) !== SCOPE) {
        return rediriger(res, redirectUri, { error: 'invalid_scope', state: p.get('state') ?? '' });
      }
      const id = nouveauJeton();
      demandes.set(id, {
        redirectUri,
        state: p.get('state') ?? '',
        challenge: p.get('code_challenge') ?? '',
        expire: Date.now() + DUREE_CODE_MS,
        essais: 0,
      });
      return envoyerPage(res, 200, pageIdentifiants(id));
    }

    if (chemin === '/oauth/authorize' && methode === 'POST') {
      const ip = req.socket.remoteAddress ?? '?';
      const corps = await lireFormulaire(req);
      const id = corps?.get('demande') ?? '';
      const d = demandes.get(id);
      if (!corps || !d || d.expire < Date.now()) {
        demandes.delete(id);
        return envoyerPage(res, 400, pageMessage('Cette demande de connexion a expiré. Revenez à l’application et recommencez.'));
      }
      if (limiteAtteinte(ip)) return envoyerPage(res, 429, pageMessage('Trop de tentatives. Réessayez dans une minute.'));

      // Étape 1 : numéro de dossier et mot de passe
      if (!d.candidat) {
        const candidat = (corps.get('username') ?? '').trim();
        const motDePasse = corps.get('password') ?? '';
        if (!/^\d{1,10}$/.test(candidat) || !motDePasse || motDePasse === 'incorrect') {
          return envoyerPage(res, 200, pageIdentifiants(id, 'Numéro de dossier ou mot de passe incorrect.'));
        }
        d.candidat = candidat;
        d.code2fa = String(randomInt(0, 1_000_000)).padStart(6, '0');
        return envoyerPage(res, 200, pageCode(id, d.code2fa));
      }

      // Étape 3 : autorisation de l'application (consentement)
      if (d.verifie) {
        demandes.delete(id);
        if (corps.get('decision') !== 'autoriser') {
          return rediriger(res, d.redirectUri, { error: 'access_denied', state: d.state });
        }
        const code = nouveauJeton();
        codes.set(code, {
          candidat: d.candidat,
          redirectUri: d.redirectUri,
          challenge: d.challenge,
          expire: Date.now() + DUREE_CODE_AUTORISATION_MS,
        });
        return rediriger(res, d.redirectUri, { code, state: d.state });
      }

      // Étape 2 : code de vérification (double authentification)
      if ((corps.get('code') ?? '').replace(/\s/g, '') !== d.code2fa) {
        d.essais += 1;
        if (d.essais >= ESSAIS_CODE) {
          demandes.delete(id);
          return envoyerPage(
            res,
            200,
            pageMessage('Code incorrect trois fois : la connexion est bloquée. Revenez à l’application et recommencez.'),
          );
        }
        return envoyerPage(res, 200, pageCode(id, d.code2fa ?? '', `Code incorrect. Il vous reste ${ESSAIS_CODE - d.essais} essai(s).`));
      }
      d.verifie = true;
      return envoyerPage(res, 200, pageAutorisation(id));
    }

    // --- Jetons --------------------------------------------------------------
    if (chemin === '/oauth/token') {
      if (methode !== 'POST') return envoyer(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
      const corps = await lireFormulaire(req);
      if (!corps) return envoyer(res, 400, { error: 'invalid_request' });
      if (corps.get('client_id') !== CLIENT_ID) return envoyer(res, 401, { error: 'invalid_client' });

      const type = corps.get('grant_type');
      if (type === 'authorization_code') {
        const code = corps.get('code') ?? '';
        const c = codes.get(code);
        codes.delete(code); // usage unique, même en cas d'échec
        if (!c || c.expire < Date.now()) return envoyer(res, 400, { error: 'invalid_grant' });
        if (corps.get('redirect_uri') !== c.redirectUri) return envoyer(res, 400, { error: 'invalid_grant' });
        // PKCE : seule l'application qui a lancé la connexion connaît le vérificateur.
        if (empreinte(corps.get('code_verifier') ?? '') !== c.challenge) return envoyer(res, 400, { error: 'invalid_grant' });
        return envoyer(res, 200, emettre(c.candidat, nouveauJeton()));
      }
      if (type === 'refresh_token') {
        const r = corps.get('refresh_token') ?? '';
        const j = renouvellements.get(r);
        if (!j) return envoyer(res, 400, { error: 'invalid_grant' });
        if (j.utilise) {
          // Réutilisation d'un jeton déjà consommé : vol probable, on révoque toute la session.
          revoquerFamille(j.famille);
          return envoyer(res, 400, { error: 'invalid_grant' });
        }
        j.utilise = true;
        return envoyer(res, 200, emettre(j.candidat, j.famille));
      }
      return envoyer(res, 400, { error: 'unsupported_grant_type' });
    }

    if (chemin === '/oauth/revoke') {
      if (methode !== 'POST') return envoyer(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
      const corps = await lireFormulaire(req);
      const j = corps && renouvellements.get(corps.get('token') ?? '');
      if (j) revoquerFamille(j.famille);
      return envoyer(res, 200, {});
    }

    // --- API de consultation (lecture seule) ----------------------------------
    if (chemin.startsWith('/v1/')) {
      if (methode !== 'GET') return envoyer(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET' });
      const candidat = authentifier(req);
      if (!candidat) return envoyer(res, 401, { error: 'invalid_token' }, { 'WWW-Authenticate': 'Bearer' });
      if (chemin === '/v1/dossier') {
        const e = etat(candidat);
        return envoyer(res, 200, construireDossier(e.jour, e.debut, candidat));
      }
      return envoyer(res, 404, { error: 'not_found' });
    }

    // --- Outil de démonstration (n'existera pas dans l'API réelle) ------------
    if (chemin === '/demo/nuit' && methode === 'POST') {
      const candidat = authentifier(req);
      if (!candidat) return envoyer(res, 401, { error: 'invalid_token' }, { 'WWW-Authenticate': 'Bearer' });
      const e = etat(candidat);
      const avance = e.jour < JOUR_MAX;
      if (avance) e.jour += 1;
      return envoyer(res, 200, { avance });
    }

    return envoyer(res, 404, { error: 'not_found' });
  }

  return createServer((req, res) => {
    traiter(req, res).catch(() => envoyer(res, 500, { error: 'server_error' }));
  });
}

function envoyer(res: ServerResponse, statut: number, corps?: unknown, entetes: Record<string, string> = {}) {
  if (res.headersSent) return;
  res.writeHead(statut, {
    // Démo : ouvert à tous les navigateurs. L'API réelle limitera les origines.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(corps !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    ...entetes,
  });
  res.end(corps !== undefined ? JSON.stringify(corps) : undefined);
}

function empreinte(verificateur: string): string {
  return createHash('sha256').update(verificateur).digest('base64url');
}

function rediriger(res: ServerResponse, redirectUri: string, params: Record<string, string>) {
  const cible = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) cible.searchParams.set(k, v);
  res.writeHead(302, { Location: cible.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end();
}

function envoyerPage(res: ServerResponse, statut: number, html: string) {
  res.writeHead(statut, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    // Page de connexion : aucune ressource extérieure, pas d'intégration dans un cadre.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(html);
}

function echapper(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLE = `body{font-family:system-ui,sans-serif;background:#F3F5F9;color:#181F2E;margin:0;padding:24px}
main{max-width:420px;margin:0 auto;background:#fff;border-radius:18px;padding:24px}
h1{font-size:22px;margin:0 0 6px}p{line-height:1.45;color:#5B6375}label{display:block;font-weight:600;margin:16px 0 6px}
input{width:100%;box-sizing:border-box;font-size:17px;padding:13px;border:1px solid #DDE1E8;border-radius:12px}
button{width:100%;margin-top:22px;padding:15px;border:0;border-radius:14px;background:#005D84;color:#fff;font-size:16px;font-weight:700}
.alerte{background:#FDE7E4;color:#B42318;border-radius:12px;padding:12px}.demo{background:#FFEBC2;color:#7A4D00;border-radius:12px;padding:12px;font-size:14px}
.bandeau{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#005D84;font-weight:700}`;

function page(corps: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connexion – serveur de démonstration</title><style>${STYLE}</style></head><body><main>
<div class="bandeau">Serveur d’authentification · démonstration</div>${corps}</main></body></html>`;
}

function pageIdentifiants(demande: string, erreur?: string): string {
  return page(`<h1>Connexion à votre dossier</h1>
<p>Vous êtes sur la page du serveur d’authentification, pas dans l’application : l’application ne voit jamais votre mot de passe.</p>
${erreur ? `<p class="alerte">${echapper(erreur)}</p>` : ''}
<form method="post" action="/oauth/authorize" autocomplete="on">
<input type="hidden" name="demande" value="${echapper(demande)}">
<label for="u">Numéro de dossier</label><input id="u" name="username" inputmode="numeric" autocomplete="username" required>
<label for="p">Mot de passe</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Continuer</button></form>
<p class="demo">Démonstration : n’importe quel numéro et n’importe quel mot de passe. Ne saisissez pas vos vrais identifiants.</p>`);
}

function pageCode(demande: string, code: string, erreur?: string): string {
  return page(`<h1>Code de vérification</h1>
<p>Un code à 6 chiffres vient d’être envoyé à l’adresse mail de votre dossier. Il est valable 5 minutes.</p>
${erreur ? `<p class="alerte">${echapper(erreur)}</p>` : ''}
<form method="post" action="/oauth/authorize">
<input type="hidden" name="demande" value="${echapper(demande)}">
<label for="c">Code reçu par mail</label><input id="c" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required>
<button type="submit">Valider</button></form>
<p class="demo">Serveur de démonstration : aucun mail n’est envoyé. Le code est <strong>${echapper(code)}</strong>.</p>`);
}

function pageAutorisation(demande: string): string {
  return page(`<h1>Lier votre compte à l’application</h1>
<p>L’application <strong>Parcours’app</strong> demande à consulter votre dossier.</p>
<p><strong>Elle pourra voir :</strong> vos vœux et leur statut, vos propositions et leurs dates limites, votre position en liste d’attente et votre rang de classement.</p>
<p><strong>Elle ne pourra pas :</strong> répondre à une proposition, modifier vos vœux, ni voir vos notes, bulletins ou informations personnelles sensibles.</p>
<p>Vous pourrez retirer cet accès à tout moment depuis votre profil.</p>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="demande" value="${echapper(demande)}">
<button type="submit" name="decision" value="autoriser">Autoriser la consultation</button>
<button type="submit" name="decision" value="refuser" style="background:#fff;color:#005D84;border:1px solid #005D84">Refuser</button>
</form>`);
}

function pageMessage(message: string): string {
  return page(`<h1>Connexion</h1><p class="alerte">${echapper(message)}</p>`);
}

function lireFormulaire(req: IncomingMessage): Promise<URLSearchParams | null> {
  return new Promise((resolve) => {
    let brut = '';
    req.on('data', (morceau: Buffer) => {
      brut += morceau.toString('utf8');
      if (brut.length > TAILLE_MAX_CORPS) {
        resolve(null);
        req.destroy();
      }
    });
    req.on('end', () => resolve(new URLSearchParams(brut)));
    req.on('error', () => resolve(null));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4000);
  creerServeur().listen(port, '0.0.0.0', () => {
    console.log(`Serveur de démonstration : http://localhost:${port}`);
    console.log("Dans l'application : EXPO_PUBLIC_API_URL=http://<adresse IP de cet ordinateur>:" + port);
  });
}
