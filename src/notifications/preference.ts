import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Préférence « recevoir les notifications de l'application ».
 * Activée par défaut. Enregistrée sur le téléphone (trousseau / Keystore),
 * dans le navigateur pour la démo web.
 * En production, la désactiver retirerait aussi l'appareil de la liste des
 * destinataires côté serveur ; les SMS et les mails de Parcoursup continuent.
 */
const CLE = 'suivi-voeux.notifications';
const natif = Platform.OS === 'ios' || Platform.OS === 'android';

let actives = true;
const abonnes = new Set<() => void>();

function lireStockage(): Promise<string | null> {
  if (natif) return SecureStore.getItemAsync(CLE).catch(() => null);
  try {
    return Promise.resolve(globalThis.localStorage?.getItem(CLE) ?? null);
  } catch {
    return Promise.resolve(null);
  }
}

async function ecrireStockage(valeur: string | null): Promise<void> {
  if (natif) {
    if (valeur == null) await SecureStore.deleteItemAsync(CLE).catch(() => {});
    else await SecureStore.setItemAsync(CLE, valeur).catch(() => {});
    return;
  }
  try {
    if (valeur == null) globalThis.localStorage?.removeItem(CLE);
    else globalThis.localStorage?.setItem(CLE, valeur);
  } catch {
    // stockage indisponible (navigation privée) : la préférence vaut pour la session
  }
}

function changer(v: boolean) {
  actives = v;
  abonnes.forEach((f) => f());
}

// Lecture au démarrage
void lireStockage().then((v) => {
  if (v === '0') changer(false);
});

export function notificationsActives(): boolean {
  return actives;
}

export async function definirNotifications(v: boolean): Promise<void> {
  changer(v);
  await ecrireStockage(v ? null : '0');
}

/** Au déliage du compte, on revient au réglage par défaut. */
export async function reinitialiserNotifications(): Promise<void> {
  changer(true);
  await ecrireStockage(null);
}

export function useNotificationsActives(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => actives,
    () => actives,
  );
}
