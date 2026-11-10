import { useRouter } from 'expo-router';
import { HomeScreen } from '../../screens/HomeScreen';
import { useMaintenant, useSession } from '../../session/SessionProvider';

export default function TableauDeBord() {
  const s = useSession();
  const maintenant = useMaintenant();
  const router = useRouter();
  if (!s.dossier) return null;
  return (
    <HomeScreen
      dossier={s.dossier}
      maintenant={maintenant}
      rafraichissement={s.rafraichissement}
      erreur={s.erreur}
      onRefresh={s.rafraichir}
      onOuvrir={(v) => router.push({ pathname: '/dossier/[id]', params: { id: v.id } })}
      onSimuler={s.simulerNuit}
      onDeconnexion={async () => {
        await s.deconnexion();
        router.replace('/connexion');
      }}
    />
  );
}
