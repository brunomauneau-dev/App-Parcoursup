import { useRouter } from 'expo-router';
import { type ComponentRef, createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiSimulee } from '../api';
import { useSession } from '../session/SessionProvider';
import { police } from '../theme';

/**
 * Démo guidée : une semaine de phase d'admission en une minute environ.
 * Chaque étape met en lumière l'élément dont elle parle, montre où l'on touche,
 * puis passe à l'écran suivant. Se lance avec le bouton « Voir la démo animée »
 * ou l'adresse se terminant par #demo.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Mesure = () => Promise<Rect | null>;
/** Un élément marqué avec <Cible id="…">, ou un onglet de la barre du bas. */
type IdCible = string | { onglet: 0 | 1 | 2 };

interface Ctx {
  router: ReturnType<typeof useRouter>;
  session: ReturnType<typeof useSession>;
}

interface Etape {
  /** Action avant la mise en lumière (changer d'écran, simuler la nuit…) */
  avant?: (ctx: Ctx) => Promise<void> | void;
  cible?: IdCible;
  legende: string;
  duree: number;
  /** Montrer un toucher sur la cible, puis exécuter `apres` */
  toucher?: boolean;
  apres?: (ctx: Ctx) => Promise<void> | void;
}

const ETAPES: Etape[] = [
  {
    avant: async ({ router, session }) => {
      await session.deconnexion();
      router.replace('/connexion');
    },
    cible: 'connexion-demo',
    legende: 'Suivi Vœux : consulter son dossier Parcoursup pendant la phase d’admission, sans stress.',
    duree: 3500,
    toucher: true,
    apres: async ({ router, session }) => {
      await session.connexion('0000000', 'demo');
      router.replace('/dossier');
    },
  },
  {
    cible: 'accueil-echeance',
    legende: 'Dès l’ouverture : la proposition reçue, la date limite et le temps qu’il reste pour répondre.',
    duree: 5000,
  },
  {
    cible: 'accueil-compteurs',
    legende: 'Tout le dossier en trois chiffres : propositions, listes d’attente, refus.',
    duree: 4000,
  },
  {
    cible: 'accueil-attente-0',
    legende: 'Chaque liste d’attente : la position du jour et les places gagnées depuis hier.',
    duree: 4500,
    toucher: true,
    apres: ({ router }) => router.push({ pathname: '/dossier/[id]', params: { id: 'v4' } }),
  },
  {
    cible: 'detail-jauge',
    legende: 'La jauge situe la position. En vert : jusqu’où la formation a appelé l’an dernier.',
    duree: 5000,
  },
  {
    cible: 'detail-aide',
    legende: 'Une aide explique chaque chiffre, en mots simples.',
    duree: 3500,
    apres: ({ router }) => router.back(),
  },
  {
    avant: async ({ router, session }) => {
      router.navigate('/dossier');
      await session.simulerNuit?.({ notificationSysteme: false });
    },
    cible: 'notification',
    legende: 'Lundi, 6h12 : mise à jour de la nuit. Une notification prévient, sans rien dévoiler sur l’écran verrouillé.',
    duree: 4500,
  },
  {
    avant: async ({ session }) => {
      await session.simulerNuit?.({ notificationSysteme: false });
    },
    cible: 'accueil-carte',
    legende: 'Mardi : une place se libère en BUT GEII. Nouvelle proposition, nouvelle date limite.',
    duree: 5000,
  },
  {
    cible: { onglet: 1 },
    legende: 'L’onglet « Mes vœux » réunit tous les vœux et leur statut.',
    duree: 3000,
    toucher: true,
    apres: ({ router }) =>
      router.navigate({
        pathname: '/dossier/voeux',
        params: { filtre: 'propositions' },
      }),
  },
  {
    cible: 'voeux-filtres',
    legende: 'Des filtres pour retrouver d’un geste ses propositions, ses attentes ou ses refus.',
    duree: 3500,
  },
  {
    cible: 'voeu-v1',
    legende: 'Chaque proposition rappelle sa date limite.',
    duree: 3000,
    toucher: true,
    apres: ({ router }) => router.push({ pathname: '/dossier/[id]', params: { id: 'v1' } }),
  },
  {
    cible: 'detail-repondre',
    legende: 'Pour répondre, direction le site officiel : l’application ne fait que consulter.',
    duree: 5000,
  },
  {
    avant: ({ router }) => router.back(),
    cible: { onglet: 2 },
    legende: 'Enfin, les messages du dossier, au même endroit.',
    duree: 3000,
    toucher: true,
    apres: ({ router }) => router.navigate('/dossier/messages'),
  },
  {
    cible: 'messages-0',
    legende: 'Les messages non lus sont signalés d’un point orange.',
    duree: 3500,
  },
  {
    avant: ({ router }) => router.navigate({ pathname: '/dossier', params: {} }),
    legende: 'À vous de jouer : explorez librement, ou rejouez la démo.',
    duree: 0,
  },
];

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Laisse le temps à l'écran d'apparaître avant de mesurer. */
const STABILISATION_MS = 450;
const TOUCHER_MS = 800;

// --- Registre des éléments pointables --------------------------------------

interface Registre {
  enregistrer: (id: string, mesure: Mesure) => () => void;
}
const RegistreCtx = createContext<Registre | null>(null);
const DemoCtx = createContext<{ lancer: () => void } | null>(null);

export function useDemoAuto() {
  return useContext(DemoCtx);
}

/** Marque un élément que la démo peut pointer. Sans démo, n'a aucun effet visible. */
export function Cible({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const registre = useContext(RegistreCtx);
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (!registre) return;
    return registre.enregistrer(
      id,
      () =>
        new Promise((resoudre) => {
          const v = ref.current;
          if (!v) return resoudre(null);
          v.measureInWindow((x, y, w, h) => resoudre(w > 0 && h > 0 ? { x, y, w, h } : null));
        }),
    );
  }, [registre, id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

function demandeeParAdresse(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#demo';
}

// --- Fournisseur -------------------------------------------------------------

export function DemoAutoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ctx = useRef<Ctx>({ router, session });
  const fenetre = useRef({ width, height, bas: insets.bottom });
  useEffect(() => {
    ctx.current = { router, session };
    fenetre.current = { width, height, bas: insets.bottom };
  });

  const mesures = useRef(new Map<string, Mesure>());
  const [registre] = useState<Registre>(() => ({
    enregistrer: (id, mesure) => {
      mesures.current.set(id, mesure);
      return () => {
        if (mesures.current.get(id) === mesure) mesures.current.delete(id);
      };
    },
  }));

  const jeton = useRef(0);
  const [etape, setEtape] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [toucher, setToucher] = useState(false);

  const mesurer = useCallback(async (c?: IdCible): Promise<Rect | null> => {
    if (c == null) return null;
    if (typeof c === 'object') {
      // Barre d'onglets : trois colonnes égales en bas de l'écran
      const { width: W, height: H, bas } = fenetre.current;
      const hauteur = 64;
      return {
        x: (W / 3) * c.onglet + 8,
        y: H - bas - hauteur + 4,
        w: W / 3 - 16,
        h: hauteur - 8,
      };
    }
    for (let i = 0; i < 6; i++) {
      const r = await mesures.current.get(c)?.();
      if (r) return r;
      await attendre(150);
    }
    return null;
  }, []);

  const arreter = useCallback(() => {
    jeton.current += 1;
    setEtape(null);
    setRect(null);
    setToucher(false);
  }, []);

  const lancer = useCallback(async () => {
    const monJeton = ++jeton.current;
    const actif = () => jeton.current === monJeton;
    for (let i = 0; i < ETAPES.length; i++) {
      const e = ETAPES[i];
      if (e.avant) await e.avant(ctx.current);
      await attendre(STABILISATION_MS);
      if (!actif()) return;
      setRect(await mesurer(e.cible));
      setToucher(false);
      setEtape(i);
      if (e.duree === 0) return;
      await attendre(e.duree);
      if (!actif()) return;
      if (e.toucher && e.cible) {
        setToucher(true);
        await attendre(TOUCHER_MS);
        if (!actif()) return;
      }
      if (e.apres) await e.apres(ctx.current);
    }
  }, [mesurer]);

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
    <RegistreCtx.Provider value={registre}>
      <DemoCtx.Provider value={{ lancer: () => void lancer() }}>
        {children}
        {etape != null && <Calque etape={etape} rect={rect} toucher={toucher} onQuitter={arreter} onRejouer={() => void lancer()} />}
      </DemoCtx.Provider>
    </RegistreCtx.Provider>
  );
}

// --- Calque : voile, halo, toucher, légende ---------------------------------

const VOILE = 'rgba(12,18,32,0.62)';
const MARGE = 6;

function Calque({
  etape,
  rect,
  toucher,
  onQuitter,
  onRejouer,
}: {
  etape: number;
  rect: Rect | null;
  toucher: boolean;
  onQuitter: () => void;
  onRejouer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  // Position animée du trou (glisse d'un élément à l'autre)
  const [pos] = useState(() => ({
    x: new Animated.Value(W / 2),
    y: new Animated.Value(H / 2),
    w: new Animated.Value(0),
    h: new Animated.Value(0),
  }));
  useEffect(() => {
    const cible = rect
      ? {
          x: rect.x - MARGE,
          y: rect.y - MARGE,
          w: rect.w + 2 * MARGE,
          h: rect.h + 2 * MARGE,
        }
      : { x: W / 2, y: H / 2, w: 0, h: 0 };
    const anim = (v: Animated.Value, to: number) =>
      Animated.timing(v, {
        toValue: to,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    Animated.parallel([anim(pos.x, cible.x), anim(pos.y, cible.y), anim(pos.w, cible.w), anim(pos.h, cible.h)]).start();
  }, [rect, pos, W, H]);

  // Halo qui respire
  const [pulsation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsation, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulsation, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  // Toucher : un disque qui se pose puis s'efface
  const [appui] = useState(() => new Animated.Value(0));
  useEffect(() => {
    appui.setValue(0);
    if (toucher)
      Animated.timing(appui, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
  }, [toucher, appui]);

  const droite = Animated.add(pos.x, pos.w);
  const bas = Animated.add(pos.y, pos.h);
  const derniere = etape === ETAPES.length - 1;

  // Légende en haut si l'élément est dans la moitié basse, sinon en bas
  const legendeEnHaut = rect != null && rect.y + rect.h / 2 > H * 0.52;
  const positionLegende: ViewStyle = legendeEnHaut ? { top: insets.top + 34 } : { bottom: insets.bottom + 80 };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
      }}
      pointerEvents="box-none"
    >
      {/* Voile en quatre bandes autour de l'élément ; bloque les touchers pendant la démo */}
      {rect ? (
        <>
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: pos.y,
              backgroundColor: VOILE,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: bas,
              bottom: 0,
              backgroundColor: VOILE,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              width: pos.x,
              top: pos.y,
              height: pos.h,
              backgroundColor: VOILE,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: droite,
              right: 0,
              top: pos.y,
              height: pos.h,
              backgroundColor: VOILE,
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: pos.w,
              height: pos.h,
              borderRadius: 18,
              borderWidth: 3,
              borderColor: pulsation.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,255,255,0.95)', 'rgba(159,211,236,0.95)'],
              }),
            }}
          />
          {toucher && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: rect.x + rect.w / 2 - 28,
                top: rect.y + rect.h / 2 - 28,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.55)',
                borderWidth: 2,
                borderColor: '#FFFFFF',
                opacity: appui.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [0, 1, 0.2],
                }),
                transform: [
                  {
                    scale: appui.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1.6, 0.8, 1.3],
                    }),
                  },
                ],
              }}
            />
          )}
        </>
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: derniere ? 'transparent' : VOILE,
          }}
          pointerEvents={derniere ? 'none' : 'auto'}
        />
      )}

      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          ...positionLegende,
          backgroundColor: 'rgba(24,31,46,0.96)',
          borderRadius: 20,
          padding: 16,
          gap: 10,
          maxWidth: 536,
          alignSelf: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
        accessibilityLiveRegion="polite"
      >
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {ETAPES.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: i <= etape ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            lineHeight: 22,
            ...police('600'),
          }}
        >
          {ETAPES[etape].legende}
        </Text>
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
              <Text
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 14,
                  ...police('600'),
                }}
              >
                Quitter la démo
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
