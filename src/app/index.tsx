import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../session/SessionProvider';
import { useTheme } from '../theme';

/** Aiguillage au démarrage selon l'état de la session. */
export default function Accueil() {
  const { statut } = useSession();
  const t = useTheme();
  if (statut === 'demarrage') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }
  return <Redirect href={statut === 'connecte' ? '/dossier' : '/connexion'} />;
}
