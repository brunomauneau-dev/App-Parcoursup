import { useRouter } from 'expo-router';
import { AvisScreen } from '../screens/AvisScreen';
import { useSession } from '../session/SessionProvider';

export default function Avis() {
  const router = useRouter();
  const { dossier } = useSession();
  return <AvisScreen profilVu={dossier?.profilDemo?.id} onFermer={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
