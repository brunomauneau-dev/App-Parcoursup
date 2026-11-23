import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { police, useTheme } from '../theme';
import { FLECHE, TRAITS } from './ui';

const NATIF = Platform.OS !== 'web';
const TAILLE = 124;
const DEPART = 119;
const ARRIVEE = 107;
/** Traits de vitesse du fond : position de départ (en fraction de l'écran), longueur, décalage */
const SILLAGES = [
  { x: 0.1, y: 0.75, l: 140, retard: 0 },
  { x: 0.55, y: 0.9, l: 200, retard: 0.12 },
  { x: -0.1, y: 0.45, l: 170, retard: 0.22 },
  { x: 0.4, y: 0.6, l: 120, retard: 0.3 },
  { x: 0.75, y: 0.55, l: 160, retard: 0.4 },
];

/**
 * Animation d'ouverture (≈ 2,5 s) sur fond bleu : des traits de vitesse
 * traversent l'écran vers le haut à droite, le logo apparaît, sa flèche y
 * file en diagonale et laisse deux traits derrière elle ; un compteur passe
 * de 119e à 107e, le nom apparaît, puis l'écran remonte comme un rideau.
 * Un toucher la passe. Si l'appareil demande de réduire les animations :
 * version douce, uniquement des fondus.
 * Logo original, sans rapport avec le logo officiel de Parcoursup.
 */
export function Lancement() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [doux, setDoux] = useState(false);
  const [rang, setRang] = useState(DEPART);
  const [v] = useState(() => ({
    sillages: new Animated.Value(0),
    carre: new Animated.Value(0),
    fleche: new Animated.Value(0),
    traits: TRAITS.map(() => new Animated.Value(0)),
    compteur: new Animated.Value(0),
    gain: new Animated.Value(0),
    nom: new Animated.Value(0),
    sortie: new Animated.Value(0),
  }));

  useEffect(() => {
    let annule = false;
    const id = v.compteur.addListener(({ value }) => setRang(Math.round(DEPART - (DEPART - ARRIVEE) * value)));
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
        Animated.sequence([
          Animated.delay(850),
          Animated.parallel([
            anim(v.compteur, 650, Easing.out(Easing.quad), false),
            Animated.sequence([Animated.delay(450), ressort(v.gain)]),
          ]),
        ]),
        Animated.sequence([Animated.delay(1300), anim(v.nom, 450)]),
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
      Animated.parallel([anim(v.compteur, 600, Easing.out(Easing.quad), false), anim(v.gain, 400), anim(v.nom, 500)]),
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
      v.compteur.removeListener(id);
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
      {/* Traits de vitesse du fond */}
      {SILLAGES.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s.x * width,
            top: s.y * height,
            width: s.l,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.10)',
            opacity: doux
              ? v.sillages
              : v.sillages.interpolate({ inputRange: [0, s.retard, s.retard + 0.15, 1], outputRange: [0, 0, 1, 0.6] }),
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
                <Path d={d} stroke={t.successDot} strokeWidth={6} strokeLinecap="round" fill="none" />
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

        {/* Compteur : la position qui gagne des places */}
        <Animated.View
          style={{
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            opacity: v.compteur.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontVariant: ['tabular-nums'], ...police('800') }}>{rang}e</Text>
          <Animated.View
            style={{
              backgroundColor: t.successBg,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              opacity: v.gain,
              transform: [{ scale: doux ? 1 : v.gain.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
            }}
          >
            <Text style={{ color: t.success, fontSize: 14, ...police('800') }}>▲ {DEPART - ARRIVEE} places</Text>
          </Animated.View>
        </Animated.View>

        {/* Nom et accroche */}
        <Animated.View
          style={{
            marginTop: 18,
            alignItems: 'center',
            opacity: v.nom,
            transform: [{ translateY: doux ? 0 : v.nom.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 30, letterSpacing: -0.5, ...police('800') }}>Parcours’app</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4, ...police('500') }}>Votre dossier, sans stress.</Text>
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
