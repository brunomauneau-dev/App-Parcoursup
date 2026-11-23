import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { police, useTheme } from '../theme';

const NATIF = Platform.OS !== 'web';
const TAILLE = 112;

/**
 * Animation d'ouverture (≈ 2 s) : le logo rebondit, ses lignes se remplissent,
 * des halos de couleur s'ouvrent derrière, le nom apparaît, puis l'écran remonte
 * comme un rideau pour révéler l'application. Un toucher la passe.
 * Désactivée si le téléphone demande de réduire les animations.
 * Fond identique à l'écran de démarrage du système, pour un enchaînement sans saut.
 */
export function Lancement() {
  const t = useTheme();
  const [visible, setVisible] = useState(true);
  const { height } = useWindowDimensions();
  const [v] = useState(() => ({
    logo: new Animated.Value(0),
    lignes: [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)],
    halos: new Animated.Value(0),
    nom: new Animated.Value(0),
    sortie: new Animated.Value(0),
  }));

  useEffect(() => {
    let annule = false;
    const anim = (val: Animated.Value, duree: number, easing = Easing.out(Easing.cubic), natif = NATIF) =>
      Animated.timing(val, { toValue: 1, duration: duree, easing, useNativeDriver: natif });
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.spring(v.logo, { toValue: 1, friction: 5, tension: 70, useNativeDriver: NATIF }),
        anim(v.halos, 1100, Easing.out(Easing.exp)),
        Animated.stagger(
          130,
          v.lignes.map((l) => anim(l, 380, Easing.out(Easing.back(1.6)), false)),
        ),
        Animated.sequence([Animated.delay(420), anim(v.nom, 520)]),
      ]),
      Animated.delay(450),
      anim(v.sortie, 520, Easing.inOut(Easing.cubic)),
    ]);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduire) => {
        if (annule) return;
        if (reduire) setVisible(false);
        else sequence.start(({ finished }) => finished && setVisible(false));
      });
    return () => {
      annule = true;
      sequence.stop();
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
        transform: [
          { translateX: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: v.halos.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
        ],
      }}
    />
  );

  const largeurs = [0.6, 0.45, 0.52];
  const couleurs = [t.accent, t.primary, t.gaugeTrack];

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
        // Sortie en rideau : l'écran remonte d'un bloc et dévoile l'application
        transform: [{ translateY: v.sortie.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }],
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <Pressable
        onPress={() => setVisible(false)}
        accessibilityLabel="Passer l’animation"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Halos de couleur derrière le logo */}
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          {halo('rgba(0,93,132,0.14)', 340, -60, -90, 0)}
          {halo('rgba(215,56,23,0.12)', 220, 90, -20, 0.15)}
          {halo('rgba(20,135,78,0.12)', 260, -40, 110, 0.3)}
        </View>

        {/* Logo : rebond, puis ses lignes se remplissent */}
        <Animated.View
          style={{
            width: TAILLE,
            height: TAILLE,
            borderRadius: TAILLE * 0.24,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0B1A33',
            shadowOpacity: 0.22,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
            transform: [
              { scale: v.logo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
              { rotate: v.logo.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) },
              { translateY: v.nom.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
            ],
          }}
        >
          <View
            style={{
              width: TAILLE * 0.4,
              height: TAILLE * 0.56,
              borderRadius: TAILLE * 0.08,
              backgroundColor: '#FFFFFF',
              paddingTop: TAILLE * 0.12,
              paddingLeft: TAILLE * 0.08,
              gap: TAILLE * 0.06,
            }}
          >
            {v.lignes.map((l, i) => (
              <Animated.View
                key={i}
                style={{
                  height: TAILLE * 0.05,
                  borderRadius: TAILLE * 0.025,
                  backgroundColor: couleurs[i],
                  width: l.interpolate({ inputRange: [0, 1], outputRange: [0, TAILLE * 0.4 * largeurs[i]] }),
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* Nom et accroche */}
        <Animated.View
          style={{
            marginTop: 22,
            alignItems: 'center',
            opacity: v.nom,
            transform: [{ translateY: v.nom.interpolate({ inputRange: [0, 1], outputRange: [16, -6] }) }],
          }}
        >
          <Text style={{ color: t.text, fontSize: 30, letterSpacing: -0.5, ...police('800') }}>Suivi Vœux</Text>
          <Text style={{ color: t.textMuted, fontSize: 15, marginTop: 4, ...police('500') }}>Ton dossier, sans stress.</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
