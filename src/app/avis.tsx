import { useRouter } from 'expo-router';
import { AvisScreen } from '../screens/AvisScreen';

export default function Avis() {
  const router = useRouter();
  return <AvisScreen onFermer={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
