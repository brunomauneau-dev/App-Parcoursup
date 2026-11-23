import { Text, View } from 'react-native';
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

/** Barre « chemin » : de la position du début de phase jusqu'à la 1re place. */
export function BarreChemin({ part, epaisseur = 12 }: { part: number; epaisseur?: number }) {
  const t = useTheme();
  return (
    <View
      style={{ height: epaisseur, borderRadius: epaisseur / 2, backgroundColor: t.gaugeTrack, overflow: 'hidden', flexDirection: 'row' }}
    >
      <View style={{ width: `${Math.max(part, 0.03) * 100}%`, backgroundColor: t.successDot, borderRadius: epaisseur / 2 }} />
    </View>
  );
}

/** Détail de la progression, dans la fiche du vœu : chemin, places gagnées, rythme de chaque matin. */
export function CheminProposition({ historique, rang }: { historique: PointHistorique[]; rang: number }) {
  const t = useTheme();
  const { points, depart, gagnees, part } = progression(historique, rang);
  const gains = points.slice(1).map((p, i) => ({ date: p.date, gain: Math.max(0, points[i].rang - p.rang) }));
  const gainMax = Math.max(1, ...gains.map((g) => g.gain));

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <BarreChemin part={part} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 12, ...police('500') }}>Début de phase : {ordinal(depart)}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12, ...police('700') }}>1re place 🏁</Text>
        </View>
      </View>

      {gagnees > 0 && (
        <Text style={{ color: t.success, fontSize: 15, ...police('700') }}>
          ▲ {nombre(gagnees)} places gagnées depuis le début de la phase
        </Text>
      )}

      <Text style={{ color: t.textMuted, fontSize: 14, lineHeight: 20, ...police('400') }}>
        À la 1re place, une seule place libérée suffit pour recevoir une proposition.
      </Text>

      {gains.length > 0 && (
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
