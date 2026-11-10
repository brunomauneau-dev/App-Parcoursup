import { Redirect, useRouter } from 'expo-router';
import { LoginScreen } from '../screens/LoginScreen';
import { useSession } from '../session/SessionProvider';

export default function Connexion() {
  const { statut, connexion } = useSession();
  const router = useRouter();
  if (statut === 'connecte') return <Redirect href="/dossier" />;
  return (
    <LoginScreen
      onLogin={async (numero, mdp) => {
        await connexion(numero, mdp);
        router.replace('/dossier');
      }}
    />
  );
}
