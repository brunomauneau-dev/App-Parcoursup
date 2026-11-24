import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PointHistorique } from '../api/types';
import { dateCourte, nombre, ordinal } from '../format';
import { police, useTheme } from '../theme';

/**
 * Progression vers une proposition. Ce qui compte pour le candidat n'est pas la
 * courbe du rang, mais la distance à la 1re place : à la 1re place, une seule
 * place libérée suffit pour recevoir une proposition. Aucune prédiction de date.
 */
export function progression(historique: PointHistorique[] | undefined, rang: number) {
  const points = (historique ?? []).filter((p): p is { date: string; rang: number } => p.rang != null);
  const depart = Math.max(points[0]?.rang ?? rang, rang);
  return {
    points,
    depart,
    gagnees: Math.max(0, depart - rang),
    devant: Math.max(0, rang - 1),
    // Part du chemin parcouru entre la position du début de phase et la 1re place
    part: depart > 1 ? Math.min(1, Math.max(0, (depart - rang) / (depart - 1))) : 1,
  };
}

/** Couleur de la partie « candidats devant vous » sur les jauges de liste d'attente. */
export const COULEUR_DEVANT = '#9FC3D9';

/** Détail de la progression, dans la fiche du vœu : chemin, places gagnées, rythme de chaque matin. */
export function CheminProposition({ historique, rang }: { historique: PointHistorique[]; rang: number }) {
  const t = useTheme();
  // Repliée par défaut : la place et la distance à la 1re suffisent au quotidien
  const [ouvert, setOuvert] = useState(false);
  const { points, depart, gagnees } = progression(historique, rang);
  const gains = points.slice(1).map((p, i) => ({ date: p.date, gain: Math.max(0, points[i].rang - p.rang) }));
  const gainMax = Math.max(1, ...gains.map((g) => g.gain));

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: t.textMuted, fontSize: 14, lineHeight: 20, ...police('400') }}>
        À la 1re place, une seule place libérée suffit pour recevoir une proposition.
      </Text>

      {(gagnees > 0 || points.length > 1) && (
        <Pressable
          onPress={() => setOuvert(!ouvert)}
          accessibilityRole="button"
          accessibilityState={{ expanded: ouvert }}
          style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: t.border, paddingTop: 14 }}
        >
          <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Voir ma progression depuis le début</Text>
          <Text style={{ color: t.primary, fontSize: 20, lineHeight: 20, ...police('700') }}>{ouvert ? '−' : '+'}</Text>
        </Pressable>
      )}

      {ouvert && gagnees > 0 && (
        <Text style={{ color: t.success, fontSize: 15, ...police('700') }}>
          ▲ {nombre(gagnees)} places gagnées depuis le début de la phase{' '}
          <Text style={{ color: t.textMuted, ...police('500') }}>({ordinal(depart)} au départ)</Text>
        </Text>
      )}

      {ouvert && gains.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: t.text, fontSize: 13.5, ...police('600') }}>Places gagnées chaque matin</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 64 }}>
            {gains.map((g) => (
              <View key={g.date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Text style={{ color: t.text, fontSize: 12, ...police('700') }}>+{g.gain}</Text>
                <View
                  style={{
                    width: '70%',
                    height: Math.max(3, (g.gain / gainMax) * 36),
                    borderRadius: 4,
                    backgroundColor: t.successDot,
                    opacity: 0.85,
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {gains.map((g) => (
              <Text key={g.date} style={{ flex: 1, textAlign: 'center', color: t.textMuted, fontSize: 11, ...police('500') }}>
                {dateCourte(g.date)}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
