import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Dossier, Voeu } from '../api/types';
import { Sparkline } from '../components/RankChart';
import { Card, StatutBadge } from '../components/ui';
import { compteARebours, dateLongue, heure, nombre } from '../format';
import { useTheme } from '../theme';

interface Props {
  dossier: Dossier;
  maintenant: Date;
  rafraichissement: boolean;
  /** Erreur du dernier rafraîchissement : le dossier affiché peut être ancien */
  erreur?: string | null;
  onRefresh: () => void;
  onOuvrir: (v: Voeu) => void;
  onSimuler?: () => void;
  onDeconnexion: () => void;
}

function variation(v: Voeu): number | null {
  const h = v.historique?.filter((p) => p.rang != null) ?? [];
  if (h.length < 2) return null;
  return (h[h.length - 2].rang as number) - (h[h.length - 1].rang as number);
}

export function HomeScreen({ dossier, maintenant, rafraichissement, erreur, onRefresh, onOuvrir, onSimuler, onDeconnexion }: Props) {
  const t = useTheme();
  const aRepondre = dossier.voeux
    .filter((v) => v.statut === 'proposition')
    .sort((a, b) => a.dateLimiteReponse!.localeCompare(b.dateLimiteReponse!));
  const acceptees = dossier.voeux.filter((v) => v.statut === 'proposition_acceptee');
  const attente = dossier.voeux.filter((v) => v.statut === 'en_attente').sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0));
  const refuses = dossier.voeux.filter((v) => v.statut === 'refuse');

  const Titre = ({ children, n }: { children: string; n: number }) => (
    <Text style={{ fontSize: 13, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 }}>
      {children} · {n}
    </Text>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: t.text }}>Bonjour {dossier.prenom}</Text>
          <Text style={{ color: t.textMuted, marginTop: 2 }}>
            Mis à jour {dateLongue(dossier.derniereMiseAJour)} à {heure(dossier.derniereMiseAJour)}
          </Text>
        </View>
        <Pressable onPress={onDeconnexion} hitSlop={10} accessibilityRole="button">
          <Text style={{ color: t.primary, fontWeight: '600', paddingTop: 6 }}>Déconnexion</Text>
        </Pressable>
      </View>

      {erreur && (
        <View accessibilityRole="alert" style={{ backgroundColor: t.dangerBg, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ color: t.danger, fontWeight: '700' }}>{erreur}</Text>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            Les informations ci-dessous datent du {dateLongue(dossier.derniereMiseAJour)}. Tirez vers le bas pour réessayer.
          </Text>
        </View>
      )}

      {aRepondre.length > 0 && (
        <>
          <Titre n={aRepondre.length}>Réponse attendue</Titre>
          {aRepondre.map((v) => {
            const c = compteARebours(new Date(v.dateLimiteReponse!), maintenant);
            return (
              <Card key={v.id} onPress={() => onOuvrir(v)} style={{ borderColor: t.warning, borderWidth: 1.5, gap: 8 }}>
                <StatutBadge statut={v.statut} />
                <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{v.formation}</Text>
                <Text style={{ color: t.textMuted }}>
                  {v.etablissement} · {v.ville}
                </Text>
                <View style={{ backgroundColor: c.urgent ? t.dangerBg : t.warningBg, borderRadius: 10, padding: 10, marginTop: 4 }}>
                  <Text style={{ color: c.urgent ? t.danger : t.warning, fontWeight: '700' }}>
                    ⏱ {c.expire ? c.texte : `Plus que ${c.texte}`}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>
                    Répondre avant le {dateLongue(v.dateLimiteReponse!)} à {heure(v.dateLimiteReponse!)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </>
      )}

      {acceptees.length > 0 && (
        <>
          <Titre n={acceptees.length}>Proposition acceptée</Titre>
          {acceptees.map((v) => (
            <Card key={v.id} onPress={() => onOuvrir(v)} style={{ gap: 6 }}>
              <StatutBadge statut={v.statut} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{v.formation}</Text>
              <Text style={{ color: t.textMuted }}>
                {v.etablissement} · {v.ville}
              </Text>
            </Card>
          ))}
        </>
      )}

      {attente.length > 0 && (
        <>
          <Titre n={attente.length}>En liste d'attente</Titre>
          {attente.map((v) => {
            const d = variation(v);
            return (
              <Card key={v.id} onPress={() => onOuvrir(v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{v.formation}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 13 }}>
                    {v.etablissement} · {v.ville}
                  </Text>
                  {d != null && d > 0 && (
                    <Text style={{ color: t.success, fontWeight: '600', fontSize: 13 }}>▲ {nombre(d)} places depuis hier</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: t.textMuted, fontSize: 12 }}>Rang</Text>
                  <Text style={{ color: t.waiting, fontSize: 22, fontWeight: '800' }}>{nombre(v.rang!)}</Text>
                  {v.historique && <Sparkline historique={v.historique} color={t.waiting} />}
                </View>
              </Card>
            );
          })}
        </>
      )}

      {refuses.length > 0 && (
        <>
          <Titre n={refuses.length}>Non retenus</Titre>
          {refuses.map((v) => (
            <Card key={v.id} style={{ gap: 4, opacity: 0.7 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: t.text }}>{v.formation}</Text>
              <Text style={{ color: t.textMuted, fontSize: 13 }}>
                {v.etablissement} · {v.ville}
              </Text>
            </Card>
          ))}
        </>
      )}

      {onSimuler && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: t.border, paddingTop: 16, gap: 8 }}>
          <Text style={{ color: t.textMuted, fontSize: 13, textAlign: 'center' }}>Outil de démonstration</Text>
          <Pressable
            onPress={onSimuler}
            accessibilityRole="button"
            style={({ pressed }) => ({
              borderRadius: 12,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: t.textMuted,
              padding: 14,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: t.text, fontWeight: '700' }}>🌙 Simuler la mise à jour de la nuit</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
