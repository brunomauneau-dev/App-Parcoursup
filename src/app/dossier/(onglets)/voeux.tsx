import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Filtre } from '../../../screens/AccueilScreen';
import { VoeuxScreen } from '../../../screens/VoeuxScreen';
import { useMaintenant, useSession } from '../../../session/SessionProvider';

const FILTRES: Filtre[] = ['tous', 'propositions', 'attente', 'refusees'];

export default function Voeux() {
  const { dossier } = useSession();
  const maintenant = useMaintenant();
  const router = useRouter();
  const { filtre } = useLocalSearchParams<{ filtre?: string }>();
  if (!dossier) return null;
  return (
    <VoeuxScreen
      dossier={dossier}
      maintenant={maintenant}
      filtre={FILTRES.includes(filtre as Filtre) ? (filtre as Filtre) : 'tous'}
      onFiltre={(f) => router.setParams({ filtre: f })}
      onOuvrir={(v) => router.push({ pathname: '/dossier/[id]', params: { id: v.id } })}
    />
  );
}
