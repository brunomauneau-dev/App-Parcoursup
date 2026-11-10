import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { URL_AVIS } from '../config';
import type { StatutVoeu } from '../api/types';
import { useTheme } from '../theme';

export const URL_PARCOURSUP = 'https://www.parcoursup.gouv.fr';

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [base, style, pressed && { opacity: 0.75 }]}
    >
      {children}
    </Pressable>
  );
}

const LIBELLES: Record<StatutVoeu, string> = {
  proposition: 'Réponse attendue',
  proposition_acceptee: 'Proposition acceptée',
  en_attente: "En liste d'attente",
  refuse: 'Refus de l’établissement',
  refusee_par_candidat: 'Refusée par vous',
};

export function StatutBadge({ statut }: { statut: StatutVoeu }) {
  const t = useTheme();
  const c = {
    proposition: [t.warning, t.warningBg],
    proposition_acceptee: [t.success, t.successBg],
    en_attente: [t.waiting, t.waitingBg],
    refuse: [t.textMuted, t.surfaceAlt],
    refusee_par_candidat: [t.textMuted, t.surfaceAlt],
  }[statut];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: c[1], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: c[0], fontSize: 12, fontWeight: '700' }}>{LIBELLES[statut]}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: primary ? t.primary : 'transparent',
        borderWidth: primary ? 0 : 1.5,
        borderColor: t.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: primary ? t.primaryText : t.primary, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Lien vers un site externe. Rendu comme un vrai lien <a> sur le web (seule
 * méthode fiable dans une page intégrée), ouvert dans le navigateur sur mobile.
 */
export function LienExterne({ url, label, variant = 'primary' }: { url: string; label: string; variant?: 'primary' | 'secondary' }) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      accessibilityRole="link"
      style={{
        backgroundColor: primary ? t.primary : 'transparent',
        borderWidth: primary ? 0 : 1.5,
        borderColor: t.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        textAlign: 'center',
        color: primary ? t.primaryText : t.primary,
        fontSize: 16,
        fontWeight: '700',
        overflow: 'hidden',
      }}
    >
      {label}
    </Link>
  );
}

export function BoutonRepondre() {
  return <LienExterne url={URL_PARCOURSUP} label="Répondre sur Parcoursup ↗" />;
}

/** Bouton vers le questionnaire d'avis, affiché seulement si un lien est configuré. */
export function BoutonAvis() {
  if (!URL_AVIS) return null;
  return <LienExterne url={URL_AVIS} label="💬 Donner mon avis (2 min) ↗" variant="secondary" />;
}

export function BandeauPrototype() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.warningBg, paddingVertical: 6, paddingHorizontal: 16 }}>
      <Text style={{ color: t.warning, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
        Prototype de démonstration · données fictives
      </Text>
    </View>
  );
}

/** Imitation d'une notification push (sans aucune donnée personnelle). */
export function Notification({ visible, onClose, top }: { visible: boolean; onClose: () => void; top: number }) {
  const t = useTheme();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: false }).start();
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
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          backgroundColor: t.surface,
          borderRadius: 18,
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
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.primaryText, fontWeight: '800' }}>SV</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 14 }}>Suivi Vœux · maintenant</Text>
          <Text style={{ color: t.textMuted, fontSize: 14 }}>Votre dossier a été mis à jour. Ouvrez l’application pour le consulter.</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
