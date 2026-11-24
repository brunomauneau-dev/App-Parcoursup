import { useRouter } from 'expo-router';
import { AccueilScreen } from '../../../screens/AccueilScreen';
import { useMaintenant, useSession } from '../../../session/SessionProvider';

export default function Accueil() {
  const s = useSession();
  const maintenant = useMaintenant();
  const router = useRouter();
  if (!s.dossier) return null;
  return (
    <AccueilScreen
      dossier={s.dossier}
      maintenant={maintenant}
      rafraichissement={s.rafraichissement}
      erreur={s.erreur}
      affluence={s.affluence}
      onAffluence={s.basculerAffluence}
      onRefresh={s.rafraichir}
      onOuvrir={(v) => router.push({ pathname: '/dossier/[id]', params: { id: v.id } })}
      onVoirVoeux={(filtre) => router.navigate({ pathname: '/dossier/voeux', params: { filtre } })}
      onMessages={() => router.navigate('/dossier/messages')}
      onSimuler={s.simulerNuit ? () => void s.simulerNuit?.() : undefined}
      onChangerProfil={s.changerProfil ? () => void s.changerProfil?.() : undefined}
      onDeconnexion={async () => {
        await s.deconnexion();
        router.replace('/connexion');
      }}
    />
  );
}
