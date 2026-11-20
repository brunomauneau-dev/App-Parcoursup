import { Redirect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LoginScreen } from '../screens/LoginScreen';
import { useSession } from '../session/SessionProvider';

// Sur le web, la page de connexion s'ouvre dans une fenêtre qui revient ici : on la referme.
WebBrowser.maybeCompleteAuthSession();

export default function Connexion() {
  const { statut, connexion } = useSession();
  const router = useRouter();
  if (statut === 'connecte') return <Redirect href="/dossier" />;
  return (
    <LoginScreen
      onLogin={async () => {
        await connexion();
        router.replace('/dossier');
      }}
    />
  );
}
