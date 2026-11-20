import * as Crypto from 'expo-crypto';

/**
 * PKCE (RFC 7636) : l'application tire un secret à usage unique (vérificateur)
 * et n'envoie au serveur que son empreinte (défi). Un code d'autorisation
 * intercepté est inutilisable sans le vérificateur, qui ne quitte pas l'application.
 */
export async function creerPkce(): Promise<{ verificateur: string; defi: string }> {
  const verificateur = base64url(Crypto.getRandomBytes(32));
  const empreinte = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verificateur));
  return { verificateur, defi: base64url(new Uint8Array(empreinte)) };
}

export function aleatoire(octets = 16): string {
  return base64url(Crypto.getRandomBytes(octets));
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Encodage base64url sans remplissage, sans dépendre de Buffer ni de btoa. */
export function base64url(octets: Uint8Array): string {
  let sortie = '';
  let i = 0;
  for (; i + 2 < octets.length; i += 3) {
    const n = (octets[i] << 16) | (octets[i + 1] << 8) | octets[i + 2];
    sortie += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + ALPHABET[n & 63];
  }
  const reste = octets.length - i;
  if (reste === 1) {
    const n = octets[i] << 16;
    sortie += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
  } else if (reste === 2) {
    const n = (octets[i] << 16) | (octets[i + 1] << 8);
    sortie += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63];
  }
  return sortie;
}
