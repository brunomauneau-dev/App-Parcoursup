import { Tabs } from 'expo-router';
import { IconeOnglet } from '../../../components/ui';
import { useSession } from '../../../session/SessionProvider';
import { police, useTheme } from '../../../theme';

export default function Onglets() {
  const t = useTheme();
  const { dossier } = useSession();
  const nonLus = dossier?.messages.filter((m) => !m.lu).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: '#9AA1AD',
        tabBarLabelStyle: { fontSize: 12.5, ...police('700') },
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, height: 64, paddingTop: 6 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ color }) => <IconeOnglet nom="accueil" couleur={String(color)} /> }}
      />
      <Tabs.Screen
        name="voeux"
        options={{ title: 'Mes vœux', tabBarIcon: ({ color }) => <IconeOnglet nom="voeux" couleur={String(color)} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconeOnglet nom="messages" couleur={String(color)} />,
          tabBarBadge: nonLus > 0 ? nonLus : undefined,
          tabBarBadgeStyle: { backgroundColor: t.accent, fontSize: 11, ...police('700') },
        }}
      />
    </Tabs>
  );
}
