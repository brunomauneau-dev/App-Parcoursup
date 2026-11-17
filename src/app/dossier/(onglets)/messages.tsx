import { MessagesScreen } from '../../../screens/MessagesScreen';
import { useMaintenant, useSession } from '../../../session/SessionProvider';

export default function Messages() {
  const { dossier } = useSession();
  const maintenant = useMaintenant();
  if (!dossier) return null;
  return <MessagesScreen dossier={dossier} maintenant={maintenant} />;
}
