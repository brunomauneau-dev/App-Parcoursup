import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { police, useTheme } from '../theme';
import { cheminChevron, CHEVRONS } from './ui';

const NATIF = Platform.OS !== 'web';
const TAILLE = 120;
const DEPART = 119;
const ARRIVEE = 107;

/**
 * Animation d'ouverture (≈ 2,5 s), qui raconte ce que fait l'application :
 * le carré du logo apparaît, trois chevrons montent un à un et s'empilent,
 * comme une liste d'attente qui avance ; un compteur passe de 119e à 107e,
 * puis le nom apparaît et l'écran remonte comme un rideau.
 * Un toucher la passe. Si l'appareil demande de réduire les animations :
 * version douce, uniquement des fondus.
 * Logo original, volontairement sans rapport avec le logo officiel de Parcoursup.
 */
export function Lancement() {
  const t = useTheme();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [doux, setDoux] = useState(false);
  const [rang, setRang] = useState(DEPART);
  const [v] = useState(() => ({
    carre: new Animated.Value(0),
    chevrons: CHEVRONS.map(() => new Animated.Value(0)),
    halos: new Animated.Value(0),
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
    const ressort = (val: Animated.Value) =>
      Animated.spring(val, {
        toValue: 1,
        friction: 6,
        tension: 110,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.05,
        useNativeDriver: NATIF,
      });

    // Les chevrons montent du bas, le plus bas d'abord : la pile se construit vers le haut
    const ordre = [...v.chevrons].reverse();
    const complete = Animated.sequence([
      Animated.parallel([
        ressort(v.carre),
        anim(v.halos, 1200, Easing.out(Easing.exp)),
        Animated.sequence([Animated.delay(220), Animated.stagger(140, ordre.map(ressort))]),
        Animated.sequence([
          Animated.delay(800),
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
        anim(v.halos, 800, Easing.out(Easing.quad)),
        Animated.stagger(
          180,
          ordre.map((c) => anim(c, 400, Easing.out(Easing.quad))),
        ),
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

  const halo = (couleur: string, diametre: number, dx: number, dy: number, retard: number) => (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: diametre,
        height: diametre,
        borderRadius: diametre / 2,
        backgroundColor: couleur,
        opacity: v.halos.interpolate({ inputRange: [0, retard, 1], outputRange: [0, 0, 1] }),
        transform: doux
          ? [{ translateX: dx }, { translateY: dy }]
          : [
              { translateX: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
              { translateY: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
              { scale: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            ],
      }}
    />
  );

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: t.bg,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Sortie en rideau (version douce : fondu)
        opacity: doux ? v.sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1,
        transform: [{ translateY: doux ? 0 : v.sortie.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }],
      }}
    >
      <Pressable
        onPress={() => setVisible(false)}
        accessibilityLabel="Passer l’animation"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          {halo('rgba(0,93,132,0.14)', 340, -60, -90, 0)}
          {halo('rgba(20,135,78,0.14)', 260, 70, 70, 0.2)}
          {halo('rgba(159,211,236,0.30)', 200, -80, 120, 0.35)}
        </View>

        {/* Logo : le carré, puis les chevrons qui montent et s'empilent */}
        <Animated.View
          style={{
            width: TAILLE,
            height: TAILLE,
            borderRadius: TAILLE * 0.24,
            backgroundColor: t.primary,
            overflow: 'hidden',
            shadowColor: '#0B1A33',
            shadowOpacity: 0.22,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
            transform: [{ scale: v.carre.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        >
          {CHEVRONS.map((y, i) => (
            <Animated.View
              key={y}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: v.chevrons[i],
                transform: [{ translateY: doux ? 0 : v.chevrons[i].interpolate({ inputRange: [0, 1], outputRange: [TAILLE * 0.6, 0] }) }],
              }}
            >
              <Svg width={TAILLE} height={TAILLE} viewBox="0 0 100 100">
                <Path
                  d={cheminChevron(y)}
                  stroke={i === 0 ? t.gaugeZone : '#FFFFFF'}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Compteur : la position qui gagne des places */}
        <Animated.View
          style={{
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            opacity: v.compteur.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
          }}
        >
          <Text style={{ color: t.text, fontSize: 26, fontVariant: ['tabular-nums'], ...police('800') }}>{rang}e</Text>
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
          <Text style={{ color: t.text, fontSize: 30, letterSpacing: -0.5, ...police('800') }}>Parcours’app</Text>
          <Text style={{ color: t.textMuted, fontSize: 15, marginTop: 4, ...police('500') }}>Votre dossier, sans stress.</Text>
          <Text
            style={{ color: t.textMuted, fontSize: 12, marginTop: 14, letterSpacing: 0.6, textTransform: 'uppercase', ...police('600') }}
          >
            Prototype non officiel
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
