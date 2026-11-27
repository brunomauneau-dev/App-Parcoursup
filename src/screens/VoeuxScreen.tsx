import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Dossier, Voeu } from '../api/types';
import { Card, StatutBadge, Variation } from '../components/ui';
import { Cible } from '../demo/DemoAuto';
import { echeance, nombre, ordinal, resteAvant } from '../format';
import { COULEUR_DEVANT } from '../components/CheminProposition';
import { Jauge } from '../components/Jauge';
import { police, useTheme } from '../theme';
import { type Filtre, variationVeille } from './AccueilScreen';

const ORDRE = {
  proposition: 0,
  proposition_acceptee: 1,
  en_attente: 2,
  refuse: 3,
  refusee_par_candidat: 3,
} as const;

function correspond(v: Voeu, f: Filtre): boolean {
  if (f === 'tous') return true;
  if (f === 'propositions') return v.statut === 'proposition' || v.statut === 'proposition_acceptee';
  if (f === 'attente') return v.statut === 'en_attente';
  return v.statut === 'refuse' || v.statut === 'refusee_par_candidat';
}

export function VoeuxScreen({
  dossier,
  maintenant,
  filtre,
  onFiltre,
  onOuvrir,
}: {
  dossier: Dossier;
  maintenant: Date;
  filtre: Filtre;
  onFiltre: (f: Filtre) => void;
  onOuvrir: (v: Voeu) => void;
}) {
  const t = useTheme();
  const voeux = [...dossier.voeux].sort(
    (a, b) =>
      ORDRE[a.statut] - ORDRE[b.statut] ||
      (a.dateLimiteReponse ?? '').localeCompare(b.dateLimiteReponse ?? '') ||
      (a.rang ?? 0) - (b.rang ?? 0),
  );
  const filtres: { cle: Filtre; libelle: string }[] = [
    { cle: 'tous', libelle: 'Tous' },
    { cle: 'propositions', libelle: 'Propositions' },
    { cle: 'attente', libelle: 'En attente' },
    { cle: 'refusees', libelle: 'Refusées' },
  ];
  const affiches = voeux.filter((v) => correspond(v, filtre));

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        paddingBottom: 40,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 4,
        }}
      >
        <Text style={{ color: t.text, fontSize: 30, ...police('800') }}>Mes vœux</Text>
        <Text style={{ color: t.textMuted, fontSize: 14, ...police('500') }}>{dossier.voeux.length} vœux</Text>
      </View>

      <Cible id="voeux-filtres">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          style={{ marginHorizontal: -16, paddingLeft: 16, flexGrow: 0 }}
        >
          {filtres.map((f) => {
            const actif = f.cle === filtre;
            const n = voeux.filter((v) => correspond(v, f.cle)).length;
            return (
              <Pressable
                key={f.cle}
                onPress={() => onFiltre(f.cle)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={{
                  backgroundColor: actif ? t.text : t.surface,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    color: actif ? '#FFFFFF' : t.text,
                    fontSize: 14.5,
                    ...police('700'),
                  }}
                >
                  {f.libelle} · {n}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Cible>

      {affiches.map((v) => {
        const d = variationVeille(v);
        return (
          <Cible key={v.id} id={`voeu-${v.id}`}>
            <Card onPress={() => onOuvrir(v)} style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <StatutBadge statut={v.statut} ouiSi={v.ouiSi === true} />
                {v.statut === 'en_attente' && v.rang != null && (
                  <Text style={{ color: t.text, fontSize: 18, ...police('800') }}>
                    <Text style={{ color: t.textMuted, fontSize: 12, ...police('600') }}>Votre place </Text>
                    {ordinal(v.rang)}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  color: t.text,
                  fontSize: 17,
                  marginTop: 4,
                  ...police('700'),
                }}
              >
                {v.formation}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 14, ...police('400') }}>
                {v.etablissement} · {v.ville}
              </Text>
              {v.statut === 'proposition' && v.dateLimiteReponse && (
                <Text style={{ color: t.danger, fontSize: 14, ...police('600') }}>
                  Réponse sur le site avant le {echeance(v.dateLimiteReponse)} · {resteAvant(new Date(v.dateLimiteReponse), maintenant)}
                </Text>
              )}
              {v.statut === 'proposition_acceptee' && (
                <Text style={{ color: t.success, fontSize: 14, ...police('600') }}>Vous avez accepté cette proposition</Text>
              )}
              {v.statut === 'en_attente' && v.rang != null && (
                <>
                  {d != null && <Variation valeur={d} suffixe="hier" fond={false} />}
                  {v.totalEnAttente != null && (
                    <View style={{ marginTop: 4 }}>
                      <Jauge rang={v.rang} total={v.totalEnAttente} zone={v.rang} couleurZone={COULEUR_DEVANT} />
                    </View>
                  )}
                  <Text style={{ color: t.textMuted, fontSize: 13.5, ...police('400') }}>
                    <Text style={{ color: t.text, ...police('700') }}>{nombre(Math.max(0, v.rang - 1))}</Text>{' '}
                    {v.rang - 1 === 1 ? 'candidat devant vous' : 'candidats devant vous'}
                    {v.totalEnAttente != null ? `, sur ${nombre(v.totalEnAttente)} en attente` : ''}
                  </Text>
                </>
              )}
            </Card>
          </Cible>
        );
      })}
      {affiches.length === 0 && (
        <Text
          style={{
            color: t.textMuted,
            fontSize: 15,
            textAlign: 'center',
            marginTop: 24,
            ...police('400'),
          }}
        >
          {dossier.avantPhase
            ? 'La phase d’admission commence le mardi 1er juin. Vos résultats s’afficheront ici.'
            : dossier.resultatsAttendus
              ? 'Vos résultats arrivent aujourd’hui, à l’ouverture du site. Une notification vous préviendra.'
              : 'Aucun vœu dans cette catégorie.'}
        </Text>
      )}
    </ScrollView>
  );
}
