import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { creerServeur } from './index.ts';

const serveur = creerServeur({ dureeAcces: 1, tentativesParMinute: 1000 });
let base = '';

before(async () => {
  await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
});
after(() => serveur.close());

const CLIENT = 'suivi-voeux-mobile';
const RETOUR = 'suivivoeux://connexion';

const formulaire = (champs: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(champs).toString(),
  redirect: 'manual' as const,
});

const pkce = () => {
  const verificateur = randomBytes(32).toString('base64url');
  return { verificateur, defi: createHash('sha256').update(verificateur).digest('base64url') };
};

function urlAutorisation(defi: string, extra: Record<string, string> = {}) {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT,
    redirect_uri: RETOUR,
    scope: 'dossier.read',
    state: 'etat-123',
    code_challenge: defi,
    code_challenge_method: 'S256',
    ...extra,
  });
  return `${base}/oauth/authorize?${p}`;
}

const champ = (html: string, nom: string) => new RegExp(`name="${nom}" value="([^"]+)"`).exec(html)?.[1] ?? '';
const codeAffiche = (html: string) => /<strong>(\d{6})<\/strong>/.exec(html)?.[1] ?? '';

/** Parcours complet dans le navigateur : identifiants, code de vérification, retour à l'application. */
async function obtenirCode(defi: string, motDePasse = 'secret') {
  const page = await (await fetch(urlAutorisation(defi))).text();
  const demande = champ(page, 'demande');
  const etape2 = await (await fetch(`${base}/oauth/authorize`, formulaire({ demande, username: '1234567', password: motDePasse }))).text();
  const r = await fetch(`${base}/oauth/authorize`, formulaire({ demande, code: codeAffiche(etape2) }));
  return { r, etape2, demande };
}

const echanger = (code: string, verificateur: string, redirect_uri = RETOUR) =>
  fetch(
    `${base}/oauth/token`,
    formulaire({ grant_type: 'authorization_code', client_id: CLIENT, code, code_verifier: verificateur, redirect_uri }),
  );

async function connexion() {
  const { verificateur, defi } = pkce();
  const { r } = await obtenirCode(defi);
  const code = new URL(r.headers.get('location') ?? '').searchParams.get('code') ?? '';
  return echanger(code, verificateur);
}

test('la page de connexion est servie par le serveur, sans ressource extérieure ni intégration possible', async () => {
  const r = await fetch(urlAutorisation(pkce().defi));
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(await r.text(), /name="password"/);
});

test('une adresse de retour inconnue est refusée sans redirection', async () => {
  const r = await fetch(urlAutorisation(pkce().defi, { redirect_uri: 'https://pirate.example/vol' }), { redirect: 'manual' });
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('location'), null);
});

test('une portée plus large que la consultation est refusée', async () => {
  const r = await fetch(urlAutorisation(pkce().defi, { scope: 'dossier.write' }), { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(new URL(r.headers.get('location') ?? '').searchParams.get('error'), 'invalid_scope');
});

test('un mauvais mot de passe est refusé', async () => {
  const page = await (await fetch(urlAutorisation(pkce().defi))).text();
  const r = await fetch(
    `${base}/oauth/authorize`,
    formulaire({ demande: champ(page, 'demande'), username: '1234567', password: 'incorrect' }),
  );
  assert.match(await r.text(), /incorrect/);
});

test("connexion complète : code de vérification, retour à l'application, jeton limité à dossier.read", async () => {
  const { verificateur, defi } = pkce();
  const { r, etape2 } = await obtenirCode(defi);
  assert.match(etape2, /Code de vérification/);
  assert.equal(r.status, 302);
  const retour = new URL(r.headers.get('location') ?? '');
  assert.equal(retour.protocol, 'suivivoeux:');
  assert.equal(retour.searchParams.get('state'), 'etat-123');
  const j = await (await echanger(retour.searchParams.get('code') ?? '', verificateur)).json();
  assert.equal(j.scope, 'dossier.read');
  assert.ok(j.access_token && j.refresh_token);
});

test('trois codes de vérification faux bloquent la demande', async () => {
  const page = await (await fetch(urlAutorisation(pkce().defi))).text();
  const demande = champ(page, 'demande');
  await fetch(`${base}/oauth/authorize`, formulaire({ demande, username: '1234567', password: 'secret' }));
  for (let i = 0; i < 3; i++) await fetch(`${base}/oauth/authorize`, formulaire({ demande, code: '000000x' }));
  const r = await fetch(`${base}/oauth/authorize`, formulaire({ demande, code: '000000' }));
  assert.equal(r.status, 400);
  assert.match(await r.text(), /expiré/);
});

test("PKCE : un code volé est inutilisable sans le vérificateur, et ne sert qu'une fois", async () => {
  const { verificateur, defi } = pkce();
  const { r } = await obtenirCode(defi);
  const code = new URL(r.headers.get('location') ?? '').searchParams.get('code') ?? '';
  assert.equal((await echanger(code, 'mauvais-verificateur')).status, 400);
  // Le code a été consommé par la tentative frauduleuse : même le bon vérificateur échoue ensuite.
  assert.equal((await echanger(code, verificateur)).status, 400);

  const second = pkce();
  const { r: r2 } = await obtenirCode(second.defi);
  const code2 = new URL(r2.headers.get('location') ?? '').searchParams.get('code') ?? '';
  assert.equal((await echanger(code2, second.verificateur)).status, 200);
  assert.equal((await echanger(code2, second.verificateur)).status, 400);
});

test("le mot de passe n'est plus accepté par l'API de jetons", async () => {
  const r = await fetch(
    `${base}/oauth/token`,
    formulaire({ grant_type: 'password', client_id: CLIENT, scope: 'dossier.read', username: '1234567', password: 'x' }),
  );
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'unsupported_grant_type');
});

test('le dossier exige un jeton valide', async () => {
  assert.equal((await fetch(`${base}/v1/dossier`)).status, 401);
  const { access_token } = await (await connexion()).json();
  const r = await fetch(`${base}/v1/dossier`, { headers: { Authorization: `Bearer ${access_token}` } });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.ok(Array.isArray(d.voeux) && d.voeux.length > 0);
  assert.ok(d.dateServeur);
});

test("l'API est en lecture seule : toute écriture est refusée", async () => {
  const { access_token } = await (await connexion()).json();
  for (const methode of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await fetch(`${base}/v1/dossier`, { method: methode, headers: { Authorization: `Bearer ${access_token}` } });
    assert.equal(r.status, 405, methode);
  }
});

test("le jeton d'accès expire", async () => {
  const { access_token } = await (await connexion()).json();
  await new Promise((r) => setTimeout(r, 1100));
  const r = await fetch(`${base}/v1/dossier`, { headers: { Authorization: `Bearer ${access_token}` } });
  assert.equal(r.status, 401);
});

test('le jeton de renouvellement est à usage unique et sa réutilisation révoque la session', async () => {
  const premier = await (await connexion()).json();
  const renouveler = (r: string) =>
    fetch(`${base}/oauth/token`, formulaire({ grant_type: 'refresh_token', client_id: CLIENT, refresh_token: r }));

  const r1 = await renouveler(premier.refresh_token);
  assert.equal(r1.status, 200);
  const second = await r1.json();

  // Réutilisation de l'ancien jeton : refusée, et le nouveau est révoqué aussi.
  assert.equal((await renouveler(premier.refresh_token)).status, 400);
  assert.equal((await renouveler(second.refresh_token)).status, 400);
});

test('la révocation ferme la session', async () => {
  const j = await (await connexion()).json();
  await fetch(`${base}/oauth/revoke`, formulaire({ token: j.refresh_token, client_id: CLIENT }));
  const r = await fetch(
    `${base}/oauth/token`,
    formulaire({ grant_type: 'refresh_token', client_id: CLIENT, refresh_token: j.refresh_token }),
  );
  assert.equal(r.status, 400);
});
