import { Link } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { StatutVoeu } from '../api/types';
import { URL_AVIS } from '../config';
import { Cible } from '../demo/DemoAuto';
import { police, useTheme } from '../theme';

export const URL_PARCOURSUP = 'https://www.parcoursup.gouv.fr';

/** Logo original du prototype : un dossier. Pas le logo officiel de Parcoursup. */
export function Logo({ taille = 40 }: { taille?: number }) {
  const t = useTheme();
  return (
    <Svg width={taille} height={taille} viewBox="0 0 100 100" accessibilityLabel="Suivi Vœux">
      <Rect width="100" height="100" rx="24" fill={t.primary} />
      <Rect x="30" y="22" width="40" height="56" rx="8" fill="#FFFFFF" />
      <Rect x="38" y="34" width="24" height="5" rx="2.5" fill={t.accent} />
      <Rect x="38" y="45" width="18" height="5" rx="2.5" fill={t.primary} />
      <Rect x="38" y="56" width="21" height="5" rx="2.5" fill={t.gaugeTrack} />
    </Svg>
  );
}

export function T({ style, children, ...rest }: React.ComponentProps<typeof Text>) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.text, ...police('400') }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, style, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

const LIBELLES: Record<StatutVoeu, string> = {
  proposition: 'Proposition d’admission',
  proposition_acceptee: 'Proposition acceptée',
  en_attente: 'En attente d’une place',
  refuse: 'Refus de l’établissement',
  refusee_par_candidat: 'Refusée par vous',
};

export function couleursStatut(t: ReturnType<typeof useTheme>, statut: StatutVoeu) {
  return {
    proposition: { texte: t.success, fond: t.successBg, point: t.successDot },
    proposition_acceptee: {
      texte: t.success,
      fond: t.successBg,
      point: t.successDot,
    },
    en_attente: { texte: t.warning, fond: t.warningBg, point: t.warningDot },
    refuse: { texte: t.textMuted, fond: t.neutralBg, point: t.neutralDot },
    refusee_par_candidat: {
      texte: t.textMuted,
      fond: t.neutralBg,
      point: t.neutralDot,
    },
  }[statut];
}

export function StatutBadge({ statut }: { statut: StatutVoeu }) {
  const t = useTheme();
  const c = couleursStatut(t, statut);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.fond,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: c.texte, fontSize: 12.5, ...police('700') }}>{LIBELLES[statut]}</Text>
    </View>
  );
}

/** Pastille de variation : « −16 depuis hier » (en vert, une position qui baisse est une bonne nouvelle). */
export function Variation({ valeur, suffixe = 'depuis hier', fond = true }: { valeur: number; suffixe?: string; fond?: boolean }) {
  const t = useTheme();
  if (valeur <= 0) return null;
  const style: TextStyle = { color: t.success, fontSize: 13, ...police('700') };
  if (!fond)
    return (
      <Text style={style}>
        −{valeur.toLocaleString('fr-FR')} {suffixe}
      </Text>
    );
  return (
    <View
      style={{
        backgroundColor: t.successBg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={style}>
        −{valeur.toLocaleString('fr-FR')} {suffixe}
      </Text>
    </View>
  );
}

const styleBouton = (t: ReturnType<typeof useTheme>, variante: 'primary' | 'secondary' | 'clair') => ({
  backgroundColor: variante === 'primary' ? t.primary : 'transparent',
  borderWidth: variante === 'primary' ? 0 : 1.5,
  borderColor: variante === 'clair' ? 'rgba(255,255,255,0.55)' : t.primary,
  borderRadius: 16,
  paddingVertical: 15,
  paddingHorizontal: 16,
});

const texteBouton = (t: ReturnType<typeof useTheme>, variante: 'primary' | 'secondary' | 'clair'): TextStyle => ({
  color: variante === 'secondary' ? t.primary : '#FFFFFF',
  fontSize: 16,
  textAlign: 'center',
  ...police('700'),
});

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'clair';
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styleBouton(t, variant), { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      <Text style={texteBouton(t, variant)}>{label}</Text>
    </Pressable>
  );
}

/**
 * Lien vers un site externe. Rendu comme un vrai lien <a> sur le web (seule
 * méthode fiable dans une page intégrée), ouvert dans le navigateur sur mobile.
 */
export function LienExterne({ url, label, variant = 'primary' }: { url: string; label: string; variant?: 'primary' | 'secondary' }) {
  const t = useTheme();
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      accessibilityRole="link"
      style={{
        ...styleBouton(t, variant),
        ...texteBouton(t, variant),
        overflow: 'hidden',
      }}
    >
      {label}
    </Link>
  );
}

export function BoutonRepondre({ label = 'Répondre sur le site ↗' }: { label?: string }) {
  return <LienExterne url={URL_PARCOURSUP} label={label} />;
}

export function BoutonAvis() {
  if (!URL_AVIS) return null;
  return <LienExterne url={URL_AVIS} label="Donner mon avis sur le prototype ↗" variant="secondary" />;
}

export function BandeauPrototype() {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.primaryDark,
        paddingVertical: 5,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 11.5,
          textAlign: 'center',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          ...police('700'),
        }}
      >
        Prototype · données fictives
      </Text>
    </View>
  );
}

/** Titre de section : « Listes d'attente » + mention à droite. */
export function TitreSection({ titre, aDroite }: { titre: string; aDroite?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 12,
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: t.text, fontSize: 19, ...police('800') }}>{titre}</Text>
      {aDroite && <Text style={{ color: t.textMuted, fontSize: 13, ...police('500') }}>{aDroite}</Text>}
    </View>
  );
}

/** Imitation d'une notification push (sans aucune donnée personnelle). */
export function Notification({ visible, onClose, top }: { visible: boolean; onClose: () => void; top: number }) {
  const t = useTheme();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
    if (visible) {
      const id = setTimeout(onClose, 5000);
      return () => clearTimeout(id);
    }
  }, [visible, anim, onClose]);
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top,
        zIndex: 10,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 0],
            }),
          },
        ],
      }}
    >
      <Cible id="notification">
        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: 14,
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: t.border,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Logo taille={38} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 14, ...police('700') }}>Suivi Vœux · maintenant</Text>
            <Text style={{ color: t.textMuted, fontSize: 14, ...police('400') }}>
              Votre dossier a été mis à jour. Ouvrez l’application pour le consulter.
            </Text>
          </View>
        </Pressable>
      </Cible>
    </Animated.View>
  );
}

/** Icônes des onglets, dessinées pour le prototype. */
export function IconeOnglet({ nom, couleur, taille = 24 }: { nom: 'accueil' | 'voeux' | 'messages'; couleur: string; taille?: number }) {
  const trait = {
    stroke: couleur,
    strokeWidth: 2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {nom === 'accueil' && <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" {...trait} />}
      {nom === 'voeux' && (
        <>
          <Rect x="4" y="4" width="16" height="6" rx="2" {...trait} />
          <Rect x="4" y="14" width="16" height="6" rx="2" {...trait} />
        </>
      )}
      {nom === 'messages' && (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="3" {...trait} />
          <Path d="m4 7 8 6 8-6" {...trait} />
        </>
      )}
    </Svg>
  );
}
