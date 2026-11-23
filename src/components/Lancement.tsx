import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { police, useTheme } from '../theme';
import { FLECHE, TRAITS } from './ui';

const NATIF = Platform.OS !== 'web';
const TAILLE = 124;
/** Couleurs vives de l'ouverture (aucune n'est le rouge ni le bleu du logo officiel) */
const VIF = { corail: '#FF7A59', soleil: '#FFC93C', menthe: '#3DDC97', ciel: '#7CD3FF', lilas: '#B79CFF' };
/** Traits de vitesse colorés : position de départ (fraction de l'écran), longueur, épaisseur, couleur, décalage */
const SILLAGES = [
  { x: 0.05, y: 0.78, l: 150, e: 12, c: VIF.corail, retard: 0 },
  { x: 0.5, y: 0.95, l: 210, e: 10, c: VIF.soleil, retard: 0.08 },
  { x: -0.15, y: 0.5, l: 180, e: 14, c: VIF.menthe, retard: 0.16 },
  { x: 0.35, y: 0.66, l: 120, e: 8, c: VIF.ciel, retard: 0.24 },
  { x: 0.72, y: 0.6, l: 170, e: 12, c: VIF.lilas, retard: 0.3 },
  { x: 0.2, y: 1.05, l: 140, e: 9, c: VIF.ciel, retard: 0.36 },
  { x: -0.05, y: 0.25, l: 130, e: 10, c: VIF.soleil, retard: 0.42 },
  { x: 0.62, y: 0.3, l: 110, e: 8, c: VIF.corail, retard: 0.48 },
];
/**
 * Animation d'ouverture (≈ 2,5 s) sur un fond en dégradé : des traits de vitesse
 * colorés traversent l'écran vers le haut à droite, le logo apparaît, sa flèche y
 * file en diagonale, deux traits colorés apparaissent, puis le nom apparaît, puis l'écran remonte comme un rideau.
 * Un toucher la passe. Si l'appareil demande de réduire les animations :
 * version douce, uniquement des fondus.
 * Logo original, sans rapport avec le logo officiel de Parcoursup.
 */
export function Lancement() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [doux, setDoux] = useState(false);
  const [v] = useState(() => ({
    sillages: new Animated.Value(0),
    carre: new Animated.Value(0),
    fleche: new Animated.Value(0),
    traits: TRAITS.map(() => new Animated.Value(0)),
    nom: new Animated.Value(0),
    sortie: new Animated.Value(0),
  }));

  useEffect(() => {
    let annule = false;
    const anim = (val: Animated.Value, duree: number, easing = Easing.out(Easing.cubic), natif = NATIF) =>
      Animated.timing(val, { toValue: 1, duration: duree, easing, useNativeDriver: natif });
    const ressort = (val: Animated.Value, friction = 6) =>
      Animated.spring(val, {
        toValue: 1,
        friction,
        tension: 110,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.05,
        useNativeDriver: NATIF,
      });

    const complete = Animated.sequence([
      Animated.parallel([
        anim(v.sillages, 1500, Easing.inOut(Easing.quad)),
        ressort(v.carre),
        Animated.sequence([Animated.delay(250), ressort(v.fleche, 5)]),
        Animated.sequence([
          Animated.delay(520),
          Animated.stagger(
            110,
            v.traits.map((x) => anim(x, 260)),
          ),
        ]),
        Animated.sequence([Animated.delay(800), anim(v.nom, 450)]),
      ]),
      Animated.delay(500),
      anim(v.sortie, 520, Easing.inOut(Easing.cubic)),
    ]);
    const douce = Animated.sequence([
      Animated.parallel([
        anim(v.sillages, 700, Easing.out(Easing.quad)),
        anim(v.fleche, 500, Easing.out(Easing.quad)),
        Animated.sequence([
          Animated.delay(250),
          Animated.stagger(
            150,
            v.traits.map((x) => anim(x, 300)),
          ),
        ]),
      ]),
      anim(v.nom, 500),
      Animated.delay(700),
      anim(v.sortie, 450, Easing.inOut(Easing.quad)),
    ]);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduire) => {
        if (annule) return;
        if (reduire) {
          v.carre.setValue(1);
          setDoux(true);
          douce.start(({ finished }) => finished && setVisible(false));
        } else complete.start(({ finished }) => finished && setVisible(false));
      });
    return () => {
      annule = true;
      complete.stop();
      douce.stop();
    };
  }, [v]);

  if (!visible) return null;

  // Distance parcourue par les traits du fond, en diagonale vers le haut à droite
  const course = Math.max(width, height) * 0.9;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: t.primary,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Sortie en rideau (version douce : fondu)
        opacity: doux ? v.sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1,
        transform: [{ translateY: doux ? 0 : v.sortie.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }],
      }}
    >
      {/* Fond en dégradé : bleu canard vers turquoise et violet */}
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
        <Defs>
          <LinearGradient id="fond" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#004C73" />
            <Stop offset="0.55" stopColor="#0A7F95" />
            <Stop offset="1" stopColor="#4B3FA8" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#fond)" />
      </Svg>

      {/* Traits de vitesse colorés */}
      {SILLAGES.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s.x * width,
            top: s.y * height,
            width: s.l,
            height: s.e,
            borderRadius: s.e / 2,
            backgroundColor: s.c,
            opacity: doux
              ? v.sillages.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] })
              : v.sillages.interpolate({ inputRange: [0, s.retard, s.retard + 0.15, 1], outputRange: [0, 0, 0.9, 0.35] }),
            transform: [
              { translateX: doux ? 0 : v.sillages.interpolate({ inputRange: [0, 1], outputRange: [0, course * 0.7] }) },
              { translateY: doux ? 0 : v.sillages.interpolate({ inputRange: [0, 1], outputRange: [0, -course * 0.7] }) },
              { rotate: '-45deg' },
            ],
          }}
        />
      ))}

      <Pressable
        onPress={() => setVisible(false)}
        accessibilityLabel="Passer l’animation"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Logo inversé : carré blanc, flèche bleue qui file en diagonale */}
        <Animated.View
          style={{
            width: TAILLE,
            height: TAILLE,
            borderRadius: TAILLE * 0.24,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            shadowColor: '#00141F',
            shadowOpacity: 0.3,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
            transform: [{ scale: v.carre.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        >
          {TRAITS.map((d, i) => (
            <Animated.View key={d} style={{ position: 'absolute', top: 0, left: 0, opacity: v.traits[i] }}>
              <Svg width={TAILLE} height={TAILLE} viewBox="0 0 100 100">
                <Path d={d} stroke={i === 0 ? VIF.corail : VIF.soleil} strokeWidth={6} strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>
          ))}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: doux ? v.fleche : v.fleche.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
              transform: doux
                ? []
                : [
                    { translateX: v.fleche.interpolate({ inputRange: [0, 1], outputRange: [-TAILLE * 0.7, 0] }) },
                    { translateY: v.fleche.interpolate({ inputRange: [0, 1], outputRange: [TAILLE * 0.7, 0] }) },
                  ],
            }}
          >
            <Svg width={TAILLE} height={TAILLE} viewBox="0 0 100 100">
              <Path d={FLECHE} stroke={t.primary} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* Nom et accroche */}
        <Animated.View
          style={{
            marginTop: 26,
            alignItems: 'center',
            opacity: v.nom,
            transform: [{ translateY: doux ? 0 : v.nom.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 32, letterSpacing: -0.5, ...police('800') }}>
            Parcours’<Text style={{ color: VIF.soleil }}>app</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4, ...police('500') }}>
            Votre admission, sans rien manquer.
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              marginTop: 14,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              ...police('600'),
            }}
          >
            Prototype non officiel
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
