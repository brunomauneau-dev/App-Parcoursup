/**
 * Serveur de DÉMONSTRATION de l'API de consultation (contrat : docs/openapi.yaml).
 * Il reproduit le comportement attendu du SCN avec des données fictives :
 *   - OAuth 2 : jeton d'accès limité à `dossier.read`, courte durée ;
 *     jeton de renouvellement à usage unique, avec détection de réutilisation ;
 *   - API en lecture seule : toute autre méthode que GET sur /v1 est refusée (405).
 *
 * Lancement : `npm run serveur` (Node 22.18 ou plus récent, sans dépendance).
 * Identifiants : n'importe quel numéro de dossier ; le mot de passe « incorrect »
 * simule une erreur d'identification.
 * NE PAS utiliser en production.
 */
import { randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { construireDossier, JOUR_INITIAL, JOUR_MAX } from '../src/api/donneesDemo.ts';

const SCOPE = 'dossier.read';
const CLIENT_ID = 'suivi-voeux-mobile';
const TAILLE_MAX_CORPS = 10_000;
const TENTATIVES_PAR_MINUTE = 10;

interface Options {
  /** Durée de vie du jeton d'accès, en secondes */
  dureeAcces?: number;
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
interface EtatCandidat {
  jour: number;
  debut: number;
}

export function creerServeur(options: Options = {}): Server {
  const dureeAcces = options.dureeAcces ?? 300;
  const acces = new Map<string, JetonAcces>();
  const renouvellements = new Map<string, JetonRenouvellement>();
  const candidats = new Map<string, EtatCandidat>();
  const tentatives = new Map<string, number[]>();

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
    return recentes.length > TENTATIVES_PAR_MINUTE;
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

    // --- Authentification ----------------------------------------------------
    if (chemin === '/oauth/token') {
      if (methode !== 'POST') return envoyer(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
      const ip = req.socket.remoteAddress ?? '?';
      const corps = await lireFormulaire(req);
      if (!corps) return envoyer(res, 400, { error: 'invalid_request' });
      if (corps.get('client_id') !== CLIENT_ID) return envoyer(res, 401, { error: 'invalid_client' });

      const type = corps.get('grant_type');
      if (type === 'password') {
        if (limiteAtteinte(ip)) return envoyer(res, 429, { error: 'too_many_requests' }, { 'Retry-After': '60' });
        const scope = corps.get('scope') ?? SCOPE;
        if (scope !== SCOPE) return envoyer(res, 400, { error: 'invalid_scope' });
        const candidat = (corps.get('username') ?? '').trim();
        const motDePasse = corps.get('password') ?? '';
        if (!/^\d{1,10}$/.test(candidat) || !motDePasse || motDePasse === 'incorrect') {
          return envoyer(res, 400, { error: 'invalid_grant' });
        }
        return envoyer(res, 200, emettre(candidat, nouveauJeton()));
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
