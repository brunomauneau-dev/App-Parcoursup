import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { creerServeur } from './index.ts';

const serveur = creerServeur({ dureeAcces: 1 });
let base = '';

before(async () => {
  await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
});
after(() => serveur.close());

const formulaire = (champs: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(champs).toString(),
});

async function connexion(motDePasse = 'secret') {
  return fetch(`${base}/oauth/token`, formulaire({
    grant_type: 'password', client_id: 'suivi-voeux-mobile', scope: 'dossier.read', username: '1234567', password: motDePasse,
  }));
}

test('la connexion délivre un jeton limité à dossier.read', async () => {
  const r = await connexion();
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.scope, 'dossier.read');
  assert.ok(j.access_token && j.refresh_token);
});

test('un mauvais mot de passe est refusé', async () => {
  const r = await connexion('incorrect');
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'invalid_grant');
});

test('une portée plus large que la consultation est refusée', async () => {
  const r = await fetch(`${base}/oauth/token`, formulaire({
    grant_type: 'password', client_id: 'suivi-voeux-mobile', scope: 'dossier.write', username: '1234567', password: 'x',
  }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'invalid_scope');
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

test('le jeton d\'accès expire', async () => {
  const { access_token } = await (await connexion()).json();
  await new Promise((r) => setTimeout(r, 1100));
  const r = await fetch(`${base}/v1/dossier`, { headers: { Authorization: `Bearer ${access_token}` } });
  assert.equal(r.status, 401);
});

test('le jeton de renouvellement est à usage unique et sa réutilisation révoque la session', async () => {
  const premier = await (await connexion()).json();
  const renouveler = (r: string) =>
    fetch(`${base}/oauth/token`, formulaire({ grant_type: 'refresh_token', client_id: 'suivi-voeux-mobile', refresh_token: r }));

  const r1 = await renouveler(premier.refresh_token);
  assert.equal(r1.status, 200);
  const second = await r1.json();

  // Réutilisation de l'ancien jeton : refusée, et le nouveau est révoqué aussi.
  assert.equal((await renouveler(premier.refresh_token)).status, 400);
  assert.equal((await renouveler(second.refresh_token)).status, 400);
});

test('la révocation ferme la session', async () => {
  const j = await (await connexion()).json();
  await fetch(`${base}/oauth/revoke`, formulaire({ token: j.refresh_token, client_id: 'suivi-voeux-mobile' }));
  const r = await fetch(`${base}/oauth/token`, formulaire({ grant_type: 'refresh_token', client_id: 'suivi-voeux-mobile', refresh_token: j.refresh_token }));
  assert.equal(r.status, 400);
});
