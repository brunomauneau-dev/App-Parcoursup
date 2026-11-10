import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification de démonstration, programmée par l'application elle-même
 * (notification « locale ») : aucun serveur n'est nécessaire.
 *
 * En production, la notification viendra du serveur après la mise à jour
 * nocturne (notification « push »). Le texte reste le même : aucune donnée
 * du dossier n'apparaît sur l'écran verrouillé.
 */

const natif = Platform.OS === 'ios' || Platform.OS === 'android';
const CANAL = 'mises-a-jour';
export const DELAI_NOTIFICATION_S = 5;

if (natif) {
  Notifications.setNotificationHandler({
    // Affichée même quand l'application est ouverte
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Vrai quand une vraie notification système peut être affichée (téléphone, pas le web). */
export const notificationsSysteme = natif;

async function autorisation(): Promise<boolean> {
  const actuelle = await Notifications.getPermissionsAsync();
  if (actuelle.granted) return true;
  if (!actuelle.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Programme la notification « dossier mis à jour » dans quelques secondes,
 * le temps de verrouiller l'écran. Renvoie false si l'utilisateur a refusé.
 */
export async function programmerNotificationDemo(): Promise<boolean> {
  if (!natif) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Mises à jour du dossier',
      importance: AndroidImportance.HIGH,
    });
  }
  if (!(await autorisation())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Suivi Vœux',
      body: 'Votre dossier a été mis à jour. Ouvrez l’application pour le consulter.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: DELAI_NOTIFICATION_S,
      channelId: CANAL,
    },
  });
  return true;
}
