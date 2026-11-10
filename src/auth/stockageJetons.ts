import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage des jetons d'accès.
 * - iOS : trousseau (Keychain), accessible après le premier déverrouillage, jamais sauvegardé hors de l'appareil.
 * - Android : chiffré par une clé du Keystore.
 * - Web (démo) : en mémoire uniquement, jamais dans localStorage.
 * Le mot de passe du candidat n'est JAMAIS stocké.
 */
export interface Jetons {
  accessToken: string;
  refreshToken: string;
  /** Expiration du jeton d'accès (ms depuis l'époque) */
  expiresAt: number;
}

const CLE = 'suivi-voeux.jetons';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let memoire: Jetons | null = null;
const natif = Platform.OS === 'ios' || Platform.OS === 'android';

export async function lireJetons(): Promise<Jetons | null> {
  if (!natif) return memoire;
  try {
    const brut = await SecureStore.getItemAsync(CLE, OPTIONS);
    return brut ? (JSON.parse(brut) as Jetons) : null;
  } catch {
    // Trousseau illisible (restauration d'appareil, clé invalidée) : on repart de zéro.
    await effacerJetons();
    return null;
  }
}

export async function enregistrerJetons(j: Jetons): Promise<void> {
  if (!natif) {
    memoire = j;
    return;
  }
  await SecureStore.setItemAsync(CLE, JSON.stringify(j), OPTIONS);
}

export async function effacerJetons(): Promise<void> {
  memoire = null;
  if (!natif) return;
  try {
    await SecureStore.deleteItemAsync(CLE, OPTIONS);
  } catch {
    // rien à effacer
  }
}
