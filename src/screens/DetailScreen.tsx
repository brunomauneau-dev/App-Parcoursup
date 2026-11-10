import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Voeu } from '../api/types';
import { RankChart } from '../components/RankChart';
import { BoutonRepondre, Card, StatutBadge } from '../components/ui';
import { compteARebours, dateLongue, heure, nombre } from '../format';
import { useTheme } from '../theme';

function Stat({ label, valeur, couleur }: { label: string; valeur: string; couleur?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 12, gap: 2 }}>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: couleur ?? t.text, fontSize: 18, fontWeight: '800' }}>{valeur}</Text>
    </View>
  );
}

export function DetailScreen({ voeu, maintenant, onRetour }: { voeu: Voeu; maintenant: Date; onRetour: () => void }) {
  const t = useTheme();

  const historique = voeu.historique?.filter((p) => p.rang != null) ?? [];
  const premier = historique[0]?.rang;
  const gagne = premier != null && voeu.rang != null ? premier - voeu.rang : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Pressable onPress={onRetour} hitSlop={10} accessibilityRole="button">
        <Text style={{ color: t.primary, fontWeight: '600', fontSize: 16 }}>‹ Mes vœux</Text>
      </Pressable>

      <View style={{ gap: 6 }}>
        <StatutBadge statut={voeu.statut} />
        <Text style={{ fontSize: 24, fontWeight: '800', color: t.text }}>{voeu.formation}</Text>
        <Text style={{ color: t.textMuted, fontSize: 15 }}>
          {voeu.etablissement} · {voeu.ville}
        </Text>
      </View>

      {voeu.statut === 'proposition' && voeu.dateLimiteReponse && (
        <PropositionBloc limite={voeu.dateLimiteReponse} maintenant={maintenant} />
      )}

      {voeu.statut === 'proposition_acceptee' && (
        <Card style={{ gap: 6 }}>
          <Text style={{ color: t.success, fontWeight: '700', fontSize: 16 }}>✓ Vous avez accepté cette proposition</Text>
          <Text style={{ color: t.textMuted, lineHeight: 20 }}>
            Si vous acceptez une autre proposition, celle-ci sera automatiquement libérée. Pensez à consulter les
            modalités d’inscription administrative de l’établissement.
          </Text>
        </Card>
      )}

      {voeu.statut === 'en_attente' && voeu.rang != null && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Votre rang" valeur={nombre(voeu.rang)} couleur={t.waiting} />
            <Stat label="Gagné depuis le début" valeur={gagne != null ? `▲ ${nombre(gagne)}` : '—'} couleur={t.success} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {voeu.totalEnAttente != null && <Stat label="Candidats en attente" valeur={nombre(voeu.totalEnAttente)} />}
            {voeu.places != null && <Stat label="Places" valeur={nombre(voeu.places)} />}
          </View>

          {voeu.historique && (
            <Card style={{ gap: 8 }}>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>Évolution de votre rang</Text>
              <RankChart historique={voeu.historique} reference={voeu.rangDernierAppeleAnneePrecedente} />
              <View style={{ gap: 4 }}>
                <Legende couleur={t.chartLine} texte="Votre rang (mis à jour chaque nuit)" />
                {voeu.rangDernierAppeleAnneePrecedente != null && (
                  <Legende pointille couleur={t.chartRef} texte="Rang du dernier candidat appelé l'an dernier" />
                )}
              </View>
            </Card>
          )}

          {voeu.rangDernierAppeleAnneePrecedente != null && (
            <Card style={{ gap: 6 }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>Pour vous situer</Text>
              <Text style={{ color: t.textMuted, lineHeight: 20 }}>
                L’an dernier, le dernier candidat ayant reçu une proposition pour cette formation était classé{' '}
                <Text style={{ fontWeight: '700', color: t.text }}>{nombre(voeu.rangDernierAppeleAnneePrecedente)}</Text>.{' '}
                {voeu.rang > voeu.rangDernierAppeleAnneePrecedente &&
                  `Il vous reste ${nombre(voeu.rang - voeu.rangDernierAppeleAnneePrecedente)} places pour atteindre ce rang. `}
                Cette indication ne garantit pas une proposition cette année.
              </Text>
            </Card>
          )}
        </>
      )}

      <Text style={{ color: t.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        Consultation uniquement. Seul votre dossier sur le site officiel fait foi.
      </Text>
    </ScrollView>
  );
}

function PropositionBloc({ limite, maintenant }: { limite: string; maintenant: Date }) {
  const t = useTheme();
  const c = compteARebours(new Date(limite), maintenant);
  return (
    <>
      <View style={{ backgroundColor: c.urgent ? t.dangerBg : t.warningBg, borderRadius: 16, padding: 18, gap: 4, alignItems: 'center' }}>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>Temps restant pour répondre</Text>
        <Text style={{ color: c.urgent ? t.danger : t.warning, fontSize: 30, fontWeight: '800' }}>{c.texte}</Text>
        <Text style={{ color: t.text, fontWeight: '600' }}>
          Avant le {dateLongue(limite)} à {heure(limite)}
        </Text>
      </View>
      <Card style={{ gap: 6 }}>
        <Text style={{ color: t.text, fontWeight: '700' }}>À savoir</Text>
        <Text style={{ color: t.textMuted, lineHeight: 20 }}>
          • Vous ne pouvez conserver qu’une seule proposition à la fois.{'\n'}• Sans réponse dans les délais, la
          proposition est perdue.{'\n'}• La réponse se fait uniquement sur le site officiel.
        </Text>
      </Card>
      <BoutonRepondre />
    </>
  );
}

function Legende({ couleur, texte, pointille }: { couleur: string; texte: string; pointille?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 18, height: 0, borderTopWidth: 2.5, borderColor: couleur, borderStyle: pointille ? 'dashed' : 'solid' }} />
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{texte}</Text>
    </View>
  );
}
