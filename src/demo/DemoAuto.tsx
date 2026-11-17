import { useRouter } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiSimulee } from '../api';
import { useSession } from '../session/SessionProvider';
import { police } from '../theme';

/**
 * Démo automatique : une semaine de phase d'admission en une minute,
 * pour une projection en classe ou une présentation.
 * Se lance avec le bouton « Voir la démo animée » ou l'adresse se terminant par #demo.
 */

interface Etape {
  legende: string;
  duree: number;
  action?: (ctx: Ctx) => Promise<void> | void;
}

interface Ctx {
  router: ReturnType<typeof useRouter>;
  session: ReturnType<typeof useSession>;
}

const ETAPES: Etape[] = [
  {
    legende: 'Suivi Vœux : consulter son dossier Parcoursup pendant la phase d’admission, sans stress.',
    duree: 3500,
    action: async ({ router, session }) => {
      await session.deconnexion();
      router.replace('/connexion');
    },
  },
  {
    legende: 'Dimanche 6 juin. Camille ouvre l’application : sa proposition et la date limite s’affichent tout de suite.',
    duree: 5500,
    action: async ({ router, session }) => {
      await session.connexion('0000000', 'demo');
      router.replace('/dossier');
    },
  },
  {
    legende: 'Pour chaque liste d’attente : sa position, la zone des candidats appelés l’an dernier, et l’évolution jour après jour.',
    duree: 6000,
    action: ({ router }) => router.push({ pathname: '/dossier/[id]', params: { id: 'v3' } }),
  },
  {
    legende: 'Lundi, 6h12 : mise à jour de la nuit. Une notification prévient Camille, sans rien dévoiler sur l’écran verrouillé.',
    duree: 5500,
    action: async ({ router, session }) => {
      router.navigate('/dossier');
      await session.simulerNuit?.({ notificationSysteme: false });
    },
  },
  {
    legende: 'Mardi : une place se libère en BUT GEII. Nouvelle proposition, nouvelle date limite.',
    duree: 5500,
    action: async ({ session }) => {
      await session.simulerNuit?.({ notificationSysteme: false });
    },
  },
  {
    legende: 'Toutes les propositions et leurs délais de réponse, en un coup d’œil.',
    duree: 4500,
    action: ({ router }) => router.navigate({ pathname: '/dossier/voeux', params: { filtre: 'propositions' } }),
  },
  {
    legende: 'Pour répondre, un bouton renvoie vers le site officiel : l’application ne fait que consulter.',
    duree: 5500,
    action: ({ router }) => router.push({ pathname: '/dossier/[id]', params: { id: 'v4' } }),
  },
  {
    legende: 'Les messages du dossier sont réunis au même endroit.',
    duree: 4000,
    action: ({ router }) => router.navigate('/dossier/messages'),
  },
  {
    legende: 'À vous de jouer : explorez librement, ou rejouez la démo.',
    duree: 0,
    action: ({ router }) => router.navigate({ pathname: '/dossier', params: {} }),
  },
];

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Contexte = createContext<{ lancer: () => void } | null>(null);

export function useDemoAuto() {
  return useContext(Contexte);
}

function demandeeParAdresse(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#demo';
}

export function DemoAutoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const ctx = useRef<Ctx>({ router, session });
  useEffect(() => {
    ctx.current = { router, session };
  });
  const jeton = useRef(0);
  const [etape, setEtape] = useState<number | null>(null);

  const arreter = useCallback(() => {
    jeton.current += 1;
    setEtape(null);
  }, []);

  const lancer = useCallback(async () => {
    const monJeton = ++jeton.current;
    for (let i = 0; i < ETAPES.length; i++) {
      if (jeton.current !== monJeton) return;
      // L'écran change d'abord, la légende suit.
      await ETAPES[i].action?.(ctx.current);
      if (jeton.current !== monJeton) return;
      setEtape(i);
      if (ETAPES[i].duree === 0) return;
      await attendre(ETAPES[i].duree);
    }
  }, []);

  // Lancement par l'adresse #demo, une fois la session initialisée
  const dejaLancee = useRef(false);
  useEffect(() => {
    if (!dejaLancee.current && apiSimulee && session.statut !== 'demarrage' && demandeeParAdresse()) {
      dejaLancee.current = true;
      const id = setTimeout(() => void lancer(), 300);
      return () => clearTimeout(id);
    }
  }, [session.statut, lancer]);

  return (
    <Contexte.Provider value={{ lancer: () => void lancer() }}>
      {children}
      {etape != null && <Legende etape={etape} onQuitter={arreter} onRejouer={() => void lancer()} />}
    </Contexte.Provider>
  );
}

function Legende({ etape, onQuitter, onRejouer }: { etape: number; onQuitter: () => void; onRejouer: () => void }) {
  const insets = useSafeAreaInsets();
  const derniere = etape === ETAPES.length - 1;
  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: insets.bottom + 76,
        zIndex: 20,
        backgroundColor: 'rgba(24,31,46,0.94)',
        borderRadius: 20,
        padding: 16,
        gap: 10,
        maxWidth: 536,
        alignSelf: 'center',
      }}
      accessibilityLiveRegion="polite"
    >
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {ETAPES.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= etape ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }} />
        ))}
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 22, ...police('600') }}>{ETAPES[etape].legende}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 18 }}>
        {derniere ? (
          <>
            <Pressable onPress={onRejouer} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: '#9FD3EC', fontSize: 15, ...police('700') }}>Rejouer</Text>
            </Pressable>
            <Pressable onPress={onQuitter} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, ...police('700') }}>Explorer</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={onQuitter} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, ...police('600') }}>Quitter la démo</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
