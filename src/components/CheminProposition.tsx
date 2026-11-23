import { Text, View } from 'react-native';
import type { PointHistorique } from '../api/types';
import { dateCourte, nombre, ordinal } from '../format';
import { police, useTheme } from '../theme';

/**
 * Progression vers une proposition : ce qui compte n'est pas la courbe du rang,
 * mais la distance à la 1re place (à la 1re place, une seule place libérée suffit
 * pour recevoir une proposition). Aucune prédiction de date : on montre seulement
 * le chemin parcouru, ce qui reste, et le rythme de chaque matin.
 */
export function CheminProposition({ historique }: { historique: PointHistorique[] }) {
  const t = useTheme();
  const points = historique.filter((p): p is { date: string; rang: number } => p.rang != null);
  if (points.length < 2) return null;

  const depart = points[0].rang;
  const actuel = points[points.length - 1].rang;
  const gagnees = Math.max(0, depart - actuel);
  const devant = Math.max(0, actuel - 1);
  // Part du chemin parcouru entre la position de départ et la 1re place
  const part = depart > 1 ? Math.min(1, Math.max(0, (depart - actuel) / (depart - 1))) : 1;

  // Places gagnées chaque matin
  const gains = points.slice(1).map((p, i) => ({ date: p.date, gain: Math.max(0, points[i].rang - p.rang) }));
  const gainMax = Math.max(1, ...gains.map((g) => g.gain));

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: t.text, fontSize: 16, ...police('700') }}>Votre progression vers une proposition</Text>

      {/* Le chemin : de la position du début de phase jusqu'à la 1re place */}
      <View style={{ gap: 6 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: t.gaugeTrack, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: `${part * 100}%`, backgroundColor: t.successDot, borderRadius: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 12, ...police('500') }}>Début de phase : {ordinal(depart)}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12, ...police('700') }}>1re place 🏁</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Chiffre t={t} valeur={`▲ ${nombre(gagnees)}`} libelle="places gagnées depuis le début" couleur={t.success} />
        <Chiffre t={t} valeur={nombre(devant)} libelle={devant === 1 ? 'candidat encore devant vous' : 'candidats encore devant vous'} />
      </View>

      <Text style={{ color: t.textMuted, fontSize: 14, lineHeight: 20, ...police('400') }}>
        À la 1re place, une seule place libérée suffit pour recevoir une proposition.
      </Text>

      {/* Le rythme : places gagnées chaque matin */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: t.text, fontSize: 13.5, ...police('600') }}>Places gagnées chaque matin</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70 }}>
          {gains.map((g) => (
            <View key={g.date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ color: t.text, fontSize: 12, ...police('700') }}>+{g.gain}</Text>
              <View
                style={{
                  width: '70%',
                  height: Math.max(3, (g.gain / gainMax) * 40),
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
    </View>
  );
}

function Chiffre({ t, valeur, libelle, couleur }: { t: ReturnType<typeof useTheme>; valeur: string; libelle: string; couleur?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceAlt, borderRadius: 14, padding: 12, gap: 2 }}>
      <Text style={{ color: couleur ?? t.text, fontSize: 22, ...police('800') }}>{valeur}</Text>
      <Text style={{ color: t.textMuted, fontSize: 12.5, lineHeight: 17, ...police('500') }}>{libelle}</Text>
    </View>
  );
}
