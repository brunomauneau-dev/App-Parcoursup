import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, JOUR_MAX, maintenantSimule } from './src/api/mock';
import type { Dossier } from './src/api/types';
import { BandeauPrototype, Notification } from './src/components/ui';
import { DetailScreen } from './src/screens/DetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useTheme } from './src/theme';

function Racine() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [voeuId, setVoeuId] = useState<string | null>(null);
  const [notif, setNotif] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [maintenant, setMaintenant] = useState(() => maintenantSimule(api.jour));

  // Horloge simulée : fait vivre les comptes à rebours
  useEffect(() => {
    const id = setInterval(() => setMaintenant(maintenantSimule(api.jour)), 1000);
    return () => clearInterval(id);
  }, []);

  const charger = useCallback(async () => {
    setDossier(await api.getDossier());
    setMaintenant(maintenantSimule(api.jour));
  }, []);

  const connexion = async (numero: string, mdp: string) => {
    await api.connexion(numero, mdp);
    await charger();
  };

  const deconnexion = async () => {
    await api.deconnexion();
    setDossier(null);
    setVoeuId(null);
  };

  const rafraichir = async () => {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  };

  const simulerNuit = async () => {
    if (api.simulerNuit()) {
      await charger();
      setVoeuId(null);
      setNotif(true);
    }
  };

  const fermerNotif = useCallback(() => setNotif(false), []);
  const voeu = dossier?.voeux.find((v) => v.id === voeuId);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <StatusBar style="auto" />
      <BandeauPrototype />
      <Notification visible={notif} onClose={fermerNotif} top={insets.top + 8} />
      <View style={{ flex: 1 }}>
        {!dossier ? (
          <LoginScreen onLogin={connexion} />
        ) : voeu ? (
          <DetailScreen voeu={voeu} maintenant={maintenant} onRetour={() => setVoeuId(null)} />
        ) : (
          <HomeScreen
            dossier={dossier}
            maintenant={maintenant}
            rafraichissement={rafraichissement}
            onRefresh={rafraichir}
            onOuvrir={(v) => setVoeuId(v.id)}
            onSimuler={api.jour < JOUR_MAX ? simulerNuit : undefined}
            onDeconnexion={deconnexion}
          />
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Racine />
    </SafeAreaProvider>
  );
}
