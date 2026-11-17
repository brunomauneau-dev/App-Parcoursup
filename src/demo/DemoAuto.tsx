import { useRouter } from 'expo-router';
import { type ComponentRef, createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiSimulee } from '../api';
import { AVIS_ACTIF } from '../config';
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

/** Position et taille de l'écran de l'application (le cadre du téléphone sur ordinateur). */
type Ecran = { ox: number; oy: number; w: number; h: number };

interface EtatDemo {
  lancer: () => void;
  arreter: () => void;
  /** Termine la démo et ouvre le questionnaire */
  donnerAvis: () => void;
  etape: number | null;
  total: number;
  legende: string | null;
  rect: Rect | null;
  toucher: boolean;
  /** Grand écran : l'application est présentée dans un cadre de téléphone, les légendes à côté. */
  large: boolean;
  definirEcran: (e: Ecran) => void;
}
const DemoCtx = createContext<EtatDemo | null>(null);

export function useDemoAuto() {
  return useContext(DemoCtx);
}

/** Largeur à partir de laquelle on présente l'application dans un cadre de téléphone. */
export const LARGEUR_CADRE = 860;

/** Marque un élément que la démo peut pointer. Sans démo, n'a aucun effet visible. */
export function Cible({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const registre = useContext(RegistreCtx);
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (!registre) return;
    return registre.enregistrer(id, async () => {
      const v = ref.current;
      if (!v) return null;
      if (Platform.OS === 'web') {
        // Sur le web, la vue est un élément HTML : on l'amène au centre de l'écran.
        (v as unknown as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        await attendre(450);
      }
      return new Promise<Rect | null>((resoudre) => v.measureInWindow((x, y, w, h) => resoudre(w > 0 && h > 0 ? { x, y, w, h } : null)));
    });
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

const HAUTEUR_ONGLETS = 64;

export function DemoAutoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const { width } = useWindowDimensions();
  const large = Platform.OS === 'web' && width >= LARGEUR_CADRE;
  const ctx = useRef<Ctx>({ router, session });
  useEffect(() => {
    ctx.current = { router, session };
  });

  const ecran = useRef<Ecran>({ ox: 0, oy: 0, w: 0, h: 0 });
  const definirEcran = useCallback((e: Ecran) => {
    ecran.current = e;
  }, []);

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

  /** Rectangle de la cible, relatif à l'écran de l'application. */
  const mesurer = useCallback(async (c?: IdCible): Promise<Rect | null> => {
    if (c == null) return null;
    const { ox, oy, w: W, h: H } = ecran.current;
    if (typeof c === 'object') {
      // Barre d'onglets : trois colonnes égales en bas de l'écran
      return { x: (W / 3) * c.onglet + 8, y: H - HAUTEUR_ONGLETS + 4, w: W / 3 - 16, h: HAUTEUR_ONGLETS - 8 };
    }
    for (let i = 0; i < 6; i++) {
      const r = await mesures.current.get(c)?.();
      if (r) return { x: r.x - ox, y: r.y - oy, w: r.w, h: r.h };
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
      setToucher(false);
      setRect(await mesurer(e.cible));
      if (!actif()) return;
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
      const id = setTimeout(() => void lancer(), 600);
      return () => clearTimeout(id);
    }
  }, [session.statut, lancer]);

  const valeur: EtatDemo = {
    lancer: () => void lancer(),
    arreter,
    donnerAvis: () => {
      arreter();
      ctx.current.router.push('/avis');
    },
    etape,
    total: ETAPES.length,
    legende: etape != null ? ETAPES[etape].legende : null,
    rect,
    toucher,
    large,
    definirEcran,
  };

  return (
    <RegistreCtx.Provider value={registre}>
      <DemoCtx.Provider value={valeur}>{children}</DemoCtx.Provider>
    </RegistreCtx.Provider>
  );
}

// --- Calque dans l'écran de l'application : voile, halo, toucher ----------

const VOILE = 'rgba(12,18,32,0.6)';
const MARGE = 6;

/** À placer en dernier enfant de l'écran de l'application. */
export function CalqueDemo() {
  const demo = useDemoAuto();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [taille, setTaille] = useState({ w: 0, h: 0 });

  const relever = () => {
    ref.current?.measureInWindow((ox, oy, w, h) => {
      demo?.definirEcran({ ox, oy, w, h });
      setTaille({ w, h });
    });
  };

  const actif = demo?.etape != null;
  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={relever}
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}
    >
      {actif && demo && <Voile demo={demo} W={taille.w} H={taille.h} />}
      {actif && demo && !demo.large && <BulleLegende demo={demo} H={taille.h} />}
    </View>
  );
}

function Voile({ demo, W, H }: { demo: EtatDemo; W: number; H: number }) {
  const { rect, toucher } = demo;
  const derniere = demo.etape === demo.total - 1;

  const [pos] = useState(() => ({
    x: new Animated.Value(W / 2),
    y: new Animated.Value(H / 2),
    w: new Animated.Value(0),
    h: new Animated.Value(0),
  }));
  const [opacite] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacite, { toValue: derniere ? 0 : 1, duration: 350, useNativeDriver: false }).start();
  }, [derniere, opacite]);
  useEffect(() => {
    const c = rect
      ? { x: rect.x - MARGE, y: rect.y - MARGE, w: rect.w + 2 * MARGE, h: rect.h + 2 * MARGE }
      : { x: W / 2, y: H / 2, w: 0, h: 0 };
    const anim = (v: Animated.Value, to: number) =>
      Animated.timing(v, { toValue: to, duration: 480, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    Animated.parallel([anim(pos.x, c.x), anim(pos.y, c.y), anim(pos.w, c.w), anim(pos.h, c.h)]).start();
  }, [rect, pos, W, H]);

  const [pulsation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsation, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulsation, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  const [appui] = useState(() => new Animated.Value(0));
  useEffect(() => {
    appui.setValue(0);
    if (toucher) Animated.timing(appui, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [toucher, appui]);

  const droite = Animated.add(pos.x, pos.w);
  const bas = Animated.add(pos.y, pos.h);
  const bande = { position: 'absolute' as const, backgroundColor: VOILE };

  return (
    <Animated.View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: opacite }}
      pointerEvents={derniere ? 'none' : 'auto'}
    >
      <Animated.View style={{ ...bande, left: 0, right: 0, top: 0, height: pos.y }} />
      <Animated.View style={{ ...bande, left: 0, right: 0, top: bas, bottom: 0 }} />
      <Animated.View style={{ ...bande, left: 0, width: pos.x, top: pos.y, height: pos.h }} />
      <Animated.View style={{ ...bande, left: droite, right: 0, top: pos.y, height: pos.h }} />
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
          opacity: rect ? 1 : 0,
          borderColor: pulsation.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.95)', 'rgba(159,211,236,0.95)'] }),
        }}
      />
      {toucher && rect && (
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
            opacity: appui.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0.2] }),
            transform: [{ scale: appui.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.6, 0.8, 1.3] }) }],
          }}
        />
      )}
    </Animated.View>
  );
}

/** Légende dans l'écran (téléphone) : en haut si l'élément est en bas, sinon en bas. */
function BulleLegende({ demo, H }: { demo: EtatDemo; H: number }) {
  const insets = useSafeAreaInsets();
  const { rect } = demo;
  const enHaut = rect != null && rect.y + rect.h / 2 > H * 0.5;
  const position: ViewStyle = enHaut ? { top: insets.top + 34 } : { bottom: insets.bottom + 80 };
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, ...position }}>
      <ContenuLegende demo={demo} />
    </View>
  );
}

/** Légende : progression, texte, boutons. Fond sombre. */
function ContenuLegende({ demo, grand = false }: { demo: EtatDemo; grand?: boolean }) {
  const derniere = demo.etape === demo.total - 1;
  const [apparition] = useState(() => new Animated.Value(0));
  useEffect(() => {
    apparition.setValue(0);
    Animated.timing(apparition, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [demo.etape, apparition]);
  return (
    <Animated.View
      style={{
        backgroundColor: 'rgba(24,31,46,0.96)',
        borderRadius: grand ? 24 : 20,
        padding: grand ? 24 : 16,
        gap: grand ? 16 : 10,
        opacity: apparition,
        transform: [{ translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      }}
      accessibilityLiveRegion="polite"
    >
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: demo.total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: grand ? 4 : 3,
              borderRadius: 2,
              backgroundColor: i <= (demo.etape ?? -1) ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </View>
      {grand && (
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', ...police('700') }}>
          Étape {(demo.etape ?? 0) + 1} sur {demo.total}
        </Text>
      )}
      <Text style={{ color: '#FFFFFF', fontSize: grand ? 22 : 16, lineHeight: grand ? 30 : 22, ...police('600') }}>{demo.legende}</Text>
      {derniere && AVIS_ACTIF && (
        <Pressable
          onPress={demo.donnerAvis}
          accessibilityRole="button"
          style={({ pressed }) => ({
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: '#181F2E', fontSize: grand ? 17 : 15, ...police('700') }}>Donner mon avis (2 min)</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 18 }}>
        {derniere ? (
          <>
            <Pressable onPress={demo.lancer} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: '#9FD3EC', fontSize: grand ? 17 : 15, ...police('700') }}>Rejouer</Text>
            </Pressable>
            <Pressable onPress={demo.arreter} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: '#FFFFFF', fontSize: grand ? 17 : 15, ...police('700') }}>Explorer</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={demo.arreter} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: grand ? 15 : 14, ...police('600') }}>Quitter la démo</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// --- Présentation sur grand écran : panneau + cadre de téléphone ----------

/**
 * Sur ordinateur, présente l'application dans un cadre de téléphone, avec à
 * côté un panneau de présentation et, pendant la démo, les légendes en grand.
 * Sur téléphone, affiche l'application en plein écran.
 */
export function PresentationEcran({ children }: { children: ReactNode }) {
  const demo = useDemoAuto();
  const { height } = useWindowDimensions();
  if (!demo?.large) return <>{children}</>;
  const hauteurTel = Math.min(844, height - 48);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#E6EAF0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        padding: 24,
      }}
    >
      <View style={{ width: 380, gap: 18 }}>
        <Text style={{ color: '#005D84', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', ...police('700') }}>
          Prototype · consultation seule
        </Text>
        <Text style={{ color: '#181F2E', fontSize: 38, lineHeight: 44, ...police('800') }}>Suivre son dossier, sans stress.</Text>
        {demo.etape == null ? (
          <>
            <Text style={{ color: '#5B6375', fontSize: 17, lineHeight: 26, ...police('400') }}>
              Une application pour consulter son dossier Parcoursup pendant la phase d’admission : propositions, délais de réponse et listes
              d’attente. Toutes les données sont fictives.
            </Text>
            <Pressable
              onPress={demo.lancer}
              accessibilityRole="button"
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                backgroundColor: '#005D84',
                borderRadius: 16,
                paddingVertical: 15,
                paddingHorizontal: 22,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, ...police('700') }}>Lancer la démo guidée (1 min)</Text>
            </Pressable>
            <Text style={{ color: '#5B6375', fontSize: 14, lineHeight: 20, ...police('400') }}>
              Ou manipulez librement le téléphone ci-contre. Pour l’essayer sur votre propre téléphone, ouvrez ce même lien.
            </Text>
          </>
        ) : (
          <ContenuLegende demo={demo} grand />
        )}
      </View>
      <View
        style={{
          width: 390,
          height: hauteurTel,
          borderRadius: 48,
          borderWidth: 11,
          borderColor: '#111827',
          backgroundColor: '#111827',
          overflow: 'hidden',
          shadowColor: '#0B1A33',
          shadowOpacity: 0.28,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 20 },
        }}
      >
        <View style={{ flex: 1, borderRadius: 38, overflow: 'hidden' }}>{children}</View>
      </View>
    </View>
  );
}
