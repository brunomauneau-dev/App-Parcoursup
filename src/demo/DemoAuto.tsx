import { useRouter } from 'expo-router';
import { type ComponentRef, createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiSimulee } from '../api';
import { AVIS_ACTIF } from '../config';
import { useSession } from '../session/SessionProvider';
import { MENTION_DROITS } from '../components/Droits';
import { police } from '../theme';

/**
 * Visite guidée : une semaine de phase d'admission, au rythme de l'utilisateur.
 * Chaque étape met en lumière l'élément dont elle parle ; l'utilisateur touche
 * l'écran quand il a fini de lire, la visite montre alors où l'on touche et passe
 * à l'écran suivant. Rien n'avance tout seul. Se lance avec le bouton
 * « Visite guidée » ou l'adresse se terminant par #demo.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Mesure = () => Promise<Rect | null>;
/** Un élément marqué avec <Cible id="…">, ou un onglet de la barre du bas. */
type IdCible = string | { onglet: 0 | 1 | 2 };

interface Ctx {
  router: ReturnType<typeof useRouter>;
  session: ReturnType<typeof useSession>;
}

type Route = Parameters<ReturnType<typeof useRouter>['navigate']>[0];

/**
 * Chaque étape décrit l'état complet de l'application (connexion, jour simulé,
 * écran affiché) : on peut donc y aller directement, en avant comme en arrière.
 */
interface Etape {
  /** Jour simulé de la phase d'admission ; absent = écran de connexion (déconnecté) */
  jour?: number;
  route: Route;
  cible?: IdCible;
  legende: string;
  /** Au passage à l'étape suivante : montrer un toucher sur la cible */
  toucher?: boolean;
  /** Afficher la notification « dossier mis à jour » */
  notification?: boolean;
}

const VOEUX_PROPOSITIONS: Route = { pathname: '/dossier/voeux', params: { filtre: 'propositions' } };

const ETAPES: Etape[] = [
  // 1. Ouvrir l'application (dimanche)
  {
    route: '/connexion',
    cible: 'connexion-demo',
    legende: 'Voici Camille, en terminale comme toi. C’est la phase d’admission, et elle suit son dossier depuis son téléphone. Suis-la !',
    toucher: true,
  },
  {
    jour: 4,
    route: '/dossier',
    cible: 'accueil-echeance',
    legende:
      'Dimanche 6 juin. Dès qu’elle ouvre l’appli : une proposition l’attend, avec le temps qu’il lui reste pour répondre. Pas de mauvaise surprise.',
  },
  {
    jour: 4,
    route: '/dossier',
    cible: 'accueil-compteurs',
    legende: 'Tout son dossier en trois chiffres : ses propositions, ses listes d’attente et ses refus.',
  },
  // 2. Comprendre sa liste d'attente
  {
    jour: 4,
    route: '/dossier',
    cible: 'accueil-attente-0',
    legende: 'Son vœu de cœur, le BUT GEII ? En liste d’attente, 119e… mais 12 places gagnées depuis hier. Ça avance !',
    toucher: true,
  },
  {
    jour: 4,
    route: { pathname: '/dossier/[id]', params: { id: 'v4' } },
    cible: 'detail-jauge',
    legende: 'Ici, sa position : 119e sur les 410 candidats encore en attente. Chaque matin, la jauge bouge.',
  },
  {
    jour: 4,
    route: { pathname: '/dossier/[id]', params: { id: 'v4' } },
    cible: 'detail-classement',
    legende: 'Et là, son rang de classement : 240e. L’an dernier, le dernier appelé était 215e. Ça donne une idée, pas une promesse.',
  },
  // 3. Être prévenue (lundi)
  {
    jour: 5,
    route: '/dossier',
    cible: 'notification',
    notification: true,
    legende:
      'Lundi, 6h12. Pendant la nuit, son dossier a bougé : une notif la prévient, sans rien afficher de perso sur l’écran verrouillé.',
  },
  {
    jour: 5,
    route: '/dossier',
    cible: 'accueil-carte',
    legende: 'Bonne nouvelle : une place s’est libérée en BUT GEII ! Deux propositions l’attendent maintenant.',
  },
  // 4. Décider sereinement
  {
    jour: 5,
    route: '/dossier',
    cible: { onglet: 1 },
    legende: 'Direction « Mes vœux » pour retrouver toutes ses propositions.',
    toucher: true,
  },
  {
    jour: 5,
    route: VOEUX_PROPOSITIONS,
    cible: 'voeu-v4',
    legende: 'Pour chacune, la date limite est bien en vue. Difficile de passer à côté.',
    toucher: true,
  },
  {
    jour: 5,
    route: { pathname: '/dossier/[id]', params: { id: 'v4' } },
    cible: 'detail-repondre',
    legende: 'Pour accepter, elle passe par le site officiel : l’appli sert à consulter, donc zéro fausse manip possible.',
  },
  {
    jour: 5,
    route: '/dossier/messages',
    cible: 'messages-0',
    legende: 'Et tous les messages de son dossier au même endroit, les nouveaux marqués d’un point orange.',
  },
  {
    jour: 5,
    route: '/dossier',
    legende: 'C’est tout ! À toi d’explorer, ou de recommencer la visite.',
  },
];

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Laisse le temps à l'écran d'apparaître avant de mesurer. */
const STABILISATION_MS = 450;
const TOUCHER_MS = 650;

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
  /** Va directement à une étape */
  allerA: (i: number) => void;
  precedent: () => void;
  /** Passe à l'étape suivante (en montrant le toucher si l'étape en prévoit un) */
  suivant: () => void;
  etape: number | null;
  /** Vrai entre le toucher de l'utilisateur et l'affichage de l'étape suivante */
  transition: boolean;
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

  const etapeRef = useRef<number | null>(null);
  /** Vrai pendant un changement d'étape : les touchers sont ignorés (pas de double saut). */
  const occupe = useRef(false);
  const [transition, setTransition] = useState(false);

  const arreter = useCallback(() => {
    jeton.current += 1;
    etapeRef.current = null;
    occupe.current = false;
    setTransition(false);
    setEtape(null);
    setRect(null);
    setToucher(false);
  }, []);

  /** Met l'application dans l'état de l'étape i (connexion, jour, écran). */
  const preparer = useCallback(async (e: Etape) => {
    const { router: r, session: s } = ctx.current;
    if (e.jour == null) {
      await s.deconnexion();
      r.replace('/connexion');
      return;
    }
    if (s.statut !== 'connecte') await s.connexion();
    // La visite guidée raconte toujours l'histoire de Camille
    await s.definirProfil?.('camille');
    await s.definirJour?.(e.jour);
    r.navigate(e.route);
    if (e.notification) s.montrerNotification();
  }, []);

  const allerA = useCallback(
    async (i: number) => {
      if (i < 0 || i >= ETAPES.length) return;
      const monJeton = ++jeton.current;
      occupe.current = true;
      setTransition(true);
      const e = ETAPES[i];
      setToucher(false);
      try {
        await preparer(e);
        await attendre(STABILISATION_MS);
        if (jeton.current !== monJeton) return;
        const r = await mesurer(e.cible);
        if (jeton.current !== monJeton) return;
        setRect(r);
        etapeRef.current = i;
        setEtape(i);
        setTransition(false);
      } finally {
        if (jeton.current === monJeton) occupe.current = false;
      }
    },
    [preparer, mesurer],
  );

  const lancer = useCallback(() => {
    void allerA(0);
  }, [allerA]);

  /** Toucher de l'utilisateur : on montre le geste sur la cible si besoin, puis on avance. */
  const suivant = useCallback(async () => {
    const i = etapeRef.current;
    if (i == null || occupe.current || i >= ETAPES.length - 1) return;
    occupe.current = true;
    setTransition(true);
    const monJeton = jeton.current;
    const e = ETAPES[i];
    if (e.toucher && e.cible) {
      setToucher(true);
      await attendre(TOUCHER_MS);
      if (jeton.current !== monJeton) return;
    }
    await allerA(i + 1);
  }, [allerA]);

  const precedent = useCallback(() => {
    const i = etapeRef.current;
    if (i == null || i === 0) return;
    void allerA(i - 1);
  }, [allerA]);

  // Sur ordinateur : flèches, espace et Entrée pour avancer, Échap pour quitter
  useEffect(() => {
    if (Platform.OS !== 'web' || etape == null || typeof window === 'undefined') return;
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        void suivant();
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        precedent();
      } else if (ev.key === 'Escape') arreter();
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [etape, suivant, precedent, arreter]);

  // Lancement par l'adresse #demo, une fois la session initialisée
  const dejaLancee = useRef(false);
  useEffect(() => {
    if (!dejaLancee.current && apiSimulee && session.statut !== 'demarrage' && demandeeParAdresse()) {
      dejaLancee.current = true;
      const id = setTimeout(() => lancer(), 600);
      return () => clearTimeout(id);
    }
  }, [session.statut, lancer]);

  const valeur: EtatDemo = {
    lancer,
    arreter,
    donnerAvis: () => {
      arreter();
      ctx.current.router.push('/avis');
    },
    allerA: (i) => void allerA(i),
    precedent,
    suivant: () => void suivant(),
    etape,
    transition,
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
      {/* Toucher n'importe où (y compris sur l'élément mis en lumière) : étape suivante */}
      {!derniere && (
        <Pressable
          onPress={demo.suivant}
          accessibilityRole="button"
          accessibilityLabel="Étape suivante"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
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
  const premiere = demo.etape === 0;
  const [apparition] = useState(() => new Animated.Value(0));
  useEffect(() => {
    apparition.setValue(0);
    Animated.timing(apparition, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [demo.etape, apparition]);
  const taille = grand ? 17 : 15;
  return (
    <Animated.View
      style={{
        backgroundColor: 'rgba(24,31,46,0.96)',
        borderRadius: grand ? 24 : 20,
        padding: grand ? 22 : 14,
        gap: grand ? 16 : 10,
        opacity: demo.transition ? 0.2 : apparition,
        transform: [{ translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      }}
      accessibilityLiveRegion="polite"
    >
      {/* Barre de progression : chaque segment mène à son étape */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: demo.total }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => demo.allerA(i)}
            accessibilityRole="button"
            accessibilityLabel={`Aller à l’étape ${i + 1}`}
            hitSlop={{ top: 10, bottom: 10 }}
            style={{ flex: 1, paddingVertical: 4 }}
          >
            <View
              style={{
                height: grand ? 4 : 3,
                borderRadius: 2,
                backgroundColor: i <= (demo.etape ?? -1) ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              }}
            />
          </Pressable>
        ))}
      </View>
      {grand && (
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', ...police('700') }}>
          Étape {(demo.etape ?? 0) + 1} sur {demo.total}
        </Text>
      )}
      <Pressable onPress={demo.suivant} disabled={derniere} accessibilityRole="text">
        <Text style={{ color: '#FFFFFF', fontSize: grand ? 22 : 16, lineHeight: grand ? 30 : 22, ...police('600') }}>{demo.legende}</Text>
      </Pressable>
      {!derniere && !demo.transition && <Indication grand={grand} />}
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
          <Text style={{ color: '#181F2E', fontSize: taille, ...police('700') }}>Donner mon avis (2 min)</Text>
        </Pressable>
      )}

      {/* Commandes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BoutonCommande libelle="‹" description="Étape précédente" onPress={demo.precedent} desactive={premiere} grand={grand} />
        <BoutonCommande
          libelle={derniere ? 'Recommencer' : 'Suivant ›'}
          description={derniere ? 'Recommencer la visite' : 'Étape suivante'}
          onPress={derniere ? demo.lancer : demo.suivant}
          grand={grand}
          principal
        />
        <View style={{ flex: 1 }} />
        <Pressable onPress={demo.arreter} accessibilityRole="button" hitSlop={8}>
          <Text
            style={{
              color: derniere ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontSize: grand ? 15 : 14,
              ...police(derniere ? '700' : '600'),
            }}
          >
            {derniere ? 'Explorer' : 'Quitter'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** Invite discrète et pulsée : « Touchez l'écran pour continuer ». */
function Indication({ grand }: { grand: boolean }) {
  const [pulsation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsation, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulsation, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);
  return (
    <Animated.Text
      style={{
        color: '#9FD3EC',
        fontSize: grand ? 14 : 13,
        opacity: pulsation.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        ...police('600'),
      }}
    >
      {grand ? 'Clique sur le téléphone ou sur « Suivant » (ou touche →) pour continuer' : 'Touche l’écran pour continuer'}
    </Animated.Text>
  );
}

function BoutonCommande({
  libelle,
  description,
  onPress,
  desactive = false,
  principal = false,
  grand,
}: {
  libelle: string;
  description: string;
  onPress: () => void;
  desactive?: boolean;
  principal?: boolean;
  grand: boolean;
}) {
  const d = grand ? 44 : 38;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={description}
      style={({ pressed }) => ({
        minWidth: d,
        height: d,
        paddingHorizontal: principal ? 18 : 8,
        borderRadius: d / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: principal ? '#FFFFFF' : 'rgba(255,255,255,0.14)',
        opacity: desactive ? 0.35 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: principal ? '#181F2E' : '#FFFFFF', fontSize: grand ? 17 : 15, ...police('800') }}>{libelle}</Text>
    </Pressable>
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
              <Text style={{ color: '#FFFFFF', fontSize: 16, ...police('700') }}>Lancer la visite guidée</Text>
            </Pressable>
            <Text style={{ color: '#5B6375', fontSize: 14, lineHeight: 20, ...police('400') }}>
              Ou manipulez librement le téléphone ci-contre. Pour l’essayer sur votre propre téléphone, ouvrez ce même lien.
            </Text>
            <Text style={{ marginTop: 24, color: '#5B6375', fontSize: 12, opacity: 0.75, ...police('400') }}>{MENTION_DROITS}</Text>
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
