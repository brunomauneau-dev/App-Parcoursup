import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { ordinal } from '../format';
import { police, useTheme } from '../theme';

/**
 * Jauge : le repère « Vous » marque un rang sur une échelle de 1 à `total`.
 * Utilisée pour la position en liste d'attente (sans zone) et pour le rang de
 * classement, où la zone verte s'arrête au rang du dernier candidat appelé l'an dernier.
 * Ne jamais mélanger les deux : seuls des rangs de même nature se comparent.
 */
export function Jauge({
  rang,
  total,
  zone,
  grande = false,
  bornes = true,
}: {
  rang: number;
  total: number;
  zone?: number;
  grande?: boolean;
  /** Afficher « 1er » et « … (fin de liste) » sous la jauge */
  bornes?: boolean;
}) {
  const t = useTheme();
  const [largeur, setLargeur] = useState(0);
  const fin = Math.max(total, rang, zone ?? 0);
  const x = (n: number) => (Math.min(n, fin) / fin) * largeur;
  const h = grande ? 12 : 8;
  const repere = grande ? 4 : 14;

  return (
    <View style={{ gap: 6 }}>
      <View
        onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}
        style={{ height: grande ? 44 : 16, justifyContent: 'flex-end' }}
        accessibilityLabel={`Position ${rang} sur ${total}`}
      >
        <View style={{ height: h, borderRadius: h, backgroundColor: t.gaugeTrack, overflow: 'hidden' }}>
          {zone != null && <View style={{ width: x(zone), height: h, backgroundColor: t.gaugeZone, borderRadius: h }} />}
        </View>
        {largeur > 0 && grande && (
          <>
            <View
              style={{
                position: 'absolute',
                left: x(rang) - 2,
                bottom: -4,
                width: repere,
                height: h + 8,
                borderRadius: 2,
                backgroundColor: t.primary,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: Math.min(Math.max(x(rang) - 22, 0), largeur - 46),
                top: 0,
                backgroundColor: t.primary,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11.5, ...police('700') }}>Vous</Text>
            </View>
          </>
        )}
        {largeur > 0 && !grande && (
          <View
            style={{
              position: 'absolute',
              left: x(rang) - repere / 2,
              bottom: (h - repere) / 2,
              width: repere,
              height: repere,
              borderRadius: repere,
              backgroundColor: t.primary,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}
          />
        )}
      </View>
      {grande && bornes && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 12.5, ...police('500') }}>1er</Text>
          <Text style={{ color: t.textMuted, fontSize: 12.5, ...police('500') }}>{ordinal(total)} (fin de liste)</Text>
        </View>
      )}
    </View>
  );
}
