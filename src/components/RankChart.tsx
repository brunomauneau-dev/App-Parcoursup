import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type { PointHistorique } from '../api/types';
import { dateCourte, nombre } from '../format';
import { useTheme } from '../theme';

interface Props {
  historique: PointHistorique[];
  /** Ligne de référence (rang du dernier appelé l'an dernier) */
  reference?: number;
  height?: number;
}

/** Courbe du rang en liste d'attente. Axe inversé : le rang 1 est en haut. */
export function RankChart({ historique, reference, height = 200 }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const points = historique.filter((p): p is { date: string; rang: number } => p.rang != null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) return null;

  const pad = { l: 8, r: 52, t: 14, b: 26 };
  const valeurs = points.map((p) => p.rang).concat(reference != null ? [reference] : []);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const marge = Math.max(1, (max - min) * 0.12);
  const yMin = Math.max(1, min - marge);
  const yMax = max + marge;
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  // rang faible (meilleur) en haut
  const y = (r: number) => pad.t + ((r - yMin) / (yMax - yMin)) * h;

  const dernier = points[points.length - 1];
  const police = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  // Évite que les deux étiquettes de droite se chevauchent
  let yRef = reference != null ? y(reference) + 4 : 0;
  const yDernier = y(dernier.rang) + 4;
  if (reference != null && Math.abs(yRef - yDernier) < 14) yRef = yDernier + (yRef <= yDernier ? -14 : 14);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {reference != null && (
            <>
              <Line
                x1={pad.l}
                x2={pad.l + w}
                y1={y(reference)}
                y2={y(reference)}
                stroke={t.chartRef}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <SvgText x={pad.l + w + 6} y={yRef} fontSize={11} fill={t.chartRef} fontFamily={police}>
                {nombre(reference)}
              </SvgText>
            </>
          )}
          <Polyline
            points={points.map((p, i) => `${x(i)},${y(p.rang)}`).join(' ')}
            fill="none"
            stroke={t.chartLine}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={p.date}
              cx={x(i)}
              cy={y(p.rang)}
              r={i === points.length - 1 ? 5 : 3}
              fill={i === points.length - 1 ? t.chartLine : t.surface}
              stroke={t.chartLine}
              strokeWidth={2}
            />
          ))}
          <SvgText
            x={pad.l + w + 6}
            y={yDernier}
            fontSize={12}
            fontFamily={police}
            fontWeight="700"
            fill={t.chartLine}
          >
            {nombre(dernier.rang)}
          </SvgText>
          {points.map((p, i) =>
            i === 0 || i === points.length - 1 || points.length <= 5 ? (
              <SvgText
                key={`l-${p.date}`}
                x={x(i)}
                y={height - 6}
                fontSize={11}
                fontFamily={police}
                fill={t.textMuted}
                textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              >
                {dateCourte(p.date)}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
      {width === 0 && <Text style={{ color: t.textMuted }}> </Text>}
    </View>
  );
}

/** Mini-courbe pour les cartes de la liste. */
export function Sparkline({ historique, color }: { historique: PointHistorique[]; color: string }) {
  const points = historique.map((p) => p.rang).filter((r): r is number => r != null);
  if (points.length < 2) return null;
  const W = 72;
  const H = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const pts = points
    .map((r, i) => `${(i / (points.length - 1)) * (W - 4) + 2},${((r - min) / span) * (H - 4) + 2}`)
    .join(' ');
  return (
    <Svg width={W} height={H}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
