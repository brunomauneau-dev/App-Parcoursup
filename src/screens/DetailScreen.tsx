import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Voeu } from '../api/types';
import { Jauge } from '../components/Jauge';
import { Cible } from '../demo/DemoAuto';
import { RankChart } from '../components/RankChart';
import { BoutonRepondre, Card, StatutBadge, Variation } from '../components/ui';
import { compteARebours, echeance, nombre, ordinal, resteAvant } from '../format';
import { police, useTheme } from '../theme';
import { variationVeille } from './AccueilScreen';

export function DetailScreen({ voeu, maintenant, onRetour }: { voeu: Voeu; maintenant: Date; onRetour: () => void }) {
  const t = useTheme();
  const corps = {
    color: t.text,
    fontSize: 15.5,
    lineHeight: 23,
    ...police('400'),
  } as const;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 14,
        paddingBottom: 48,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Pressable
        onPress={onRetour}
        accessibilityRole="button"
        style={{
          alignSelf: 'flex-start',
          backgroundColor: t.surface,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: t.primary, fontSize: 15.5, ...police('700') }}>‹ Mes vœux</Text>
      </Pressable>

      <View style={{ gap: 4 }}>
        <Text style={{ color: t.textMuted, fontSize: 13.5, ...police('600') }}>
          {voeu.categorie} · {voeu.ville}
        </Text>
        <Text
          style={{
            color: t.text,
            fontSize: 27,
            lineHeight: 32,
            ...police('800'),
          }}
        >
          {voeu.formation}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 16, ...police('400') }}>{voeu.etablissement}</Text>
        <View style={{ marginTop: 6 }}>
          <StatutBadge statut={voeu.statut} />
        </View>
      </View>

      {voeu.statut === 'en_attente' && voeu.rang != null && <BlocAttente voeu={voeu} />}

      {voeu.statut === 'proposition' && voeu.dateLimiteReponse && (
        <>
          <Text style={corps}>
            {voeu.etablissement} vous fait une proposition d’admission. Vous pouvez l’accepter tout en gardant vos vœux en attente : rien ne
            presse avant la date limite.
          </Text>
          <Echeance limite={voeu.dateLimiteReponse} maintenant={maintenant} />
          <Mention />
          <Cible id="detail-repondre">
            <BoutonRepondre />
          </Cible>
        </>
      )}

      {voeu.statut === 'proposition_acceptee' && (
        <>
          <Text style={corps}>
            Vous avez accepté cette proposition : votre place est réservée. Si vous acceptez une autre proposition plus tard, celle-ci sera
            libérée.
          </Text>
          <Text style={corps}>Pensez à consulter les modalités d’inscription administrative de l’établissement.</Text>
          <Mention />
          <BoutonRepondre label="Gérer ce vœu sur le site ↗" />
        </>
      )}

      {voeu.statut === 'refuse' && (
        <Text style={corps}>La formation n’a pas retenu votre candidature. Ce vœu ne demande plus aucune action de votre part.</Text>
      )}

      {voeu.statut === 'refusee_par_candidat' && (
        <Text style={corps}>Vous avez refusé cette proposition. Ce choix est définitif : la place a été proposée à un autre candidat.</Text>
      )}

      <Text
        style={{
          color: t.textMuted,
          fontSize: 12.5,
          textAlign: 'center',
          marginTop: 6,
          ...police('400'),
        }}
      >
        Consultation uniquement. Seul votre dossier sur le site officiel fait foi.
      </Text>
    </ScrollView>
  );
}

function BlocAttente({ voeu }: { voeu: Voeu }) {
  const t = useTheme();
  const [aide, setAide] = useState(false);
  const rang = voeu.rang!;
  const ref = voeu.rangDernierAppeleAnneePrecedente;
  const d = variationVeille(voeu);

  return (
    <>
      <Card style={{ gap: 14, padding: 18 }}>
        <Cible id="detail-jauge" style={{ gap: 14 }}>
          <Text style={{ color: t.textMuted, fontSize: 14, ...police('600') }}>Position dans la liste d’attente</Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: t.text,
                fontSize: 48,
                lineHeight: 52,
                ...police('800'),
              }}
            >
              {ordinal(rang)}
            </Text>
            {d != null && <Variation valeur={d} />}
          </View>
          {voeu.totalEnAttente != null && <Jauge rang={rang} total={voeu.totalEnAttente} zone={ref} grande />}
          {ref != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 14,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: t.gaugeZone,
                }}
              />
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: 13,
                  flex: 1,
                  ...police('400'),
                }}
              >
                Jusqu’au rang du dernier candidat appelé l’an dernier
              </Text>
            </View>
          )}
        </Cible>
        {ref != null && (
          <Text
            style={{
              color: t.text,
              fontSize: 15.5,
              lineHeight: 23,
              ...police('400'),
            }}
          >
            L’an dernier, la formation a appelé jusqu’au {ordinal(ref)} candidat. Vous êtes {ordinal(rang)}
            {rang > ref ? ` : il vous reste ${nombre(rang - ref)} places pour atteindre ce rang.` : '.'} Ce n’est qu’un ordre d’idée.
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {voeu.totalEnAttente != null && <Chiffre valeur={nombre(voeu.totalEnAttente)} libelle="candidats en liste d’attente" />}
          {voeu.places != null && <Chiffre valeur={nombre(voeu.places)} libelle="places dans la formation" />}
          {ref != null && <Chiffre valeur={ordinal(ref)} libelle="rang du dernier appelé l’an dernier" />}
        </View>
        <Cible id="detail-aide">
          <Pressable
            onPress={() => setAide(!aide)}
            accessibilityRole="button"
            accessibilityState={{ expanded: aide }}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderColor: t.border,
              paddingTop: 14,
            }}
          >
            <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Comment lire ces chiffres ?</Text>
            <Text
              style={{
                color: t.primary,
                fontSize: 20,
                lineHeight: 20,
                ...police('700'),
              }}
            >
              {aide ? '−' : '+'}
            </Text>
          </Pressable>
        </Cible>
        {aide && (
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: t.textMuted,
                fontSize: 14.5,
                lineHeight: 21,
                ...police('400'),
              }}
            >
              La position dans la liste d’attente, c’est votre place parmi les candidats encore en attente. Elle baisse à chaque fois qu’un
              candidat devant vous accepte une autre formation ou renonce.
            </Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: 14.5,
                lineHeight: 21,
                ...police('400'),
              }}
            >
              Le rang du dernier candidat appelé l’an dernier donne un ordre d’idée, pas une garantie : chaque année est différente.
            </Text>
          </View>
        )}
      </Card>

      {voeu.historique && voeu.historique.length > 1 && (
        <Card style={{ gap: 8 }}>
          <Text style={{ color: t.text, fontSize: 16, ...police('700') }}>Évolution de votre position</Text>
          <RankChart historique={voeu.historique} reference={ref} />
        </Card>
      )}

      <BoutonRepondre label="Gérer ce vœu sur le site ↗" />
    </>
  );
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surfaceAlt,
        borderRadius: 14,
        padding: 12,
        gap: 2,
      }}
    >
      <Text style={{ color: t.text, fontSize: 19, ...police('800') }}>{valeur}</Text>
      <Text
        style={{
          color: t.textMuted,
          fontSize: 12.5,
          lineHeight: 16,
          ...police('400'),
        }}
      >
        {libelle}
      </Text>
    </View>
  );
}

function Echeance({ limite, maintenant }: { limite: string; maintenant: Date }) {
  const t = useTheme();
  const c = compteARebours(new Date(limite), maintenant);
  return (
    <Card style={{ gap: 4, padding: 18 }}>
      <Text style={{ color: t.textMuted, fontSize: 14, ...police('600') }}>Date limite de réponse</Text>
      <Text style={{ color: t.text, fontSize: 28, ...police('800') }}>{echeance(limite)}</Text>
      <Text
        style={{
          color: c.urgent ? t.danger : t.textMuted,
          fontSize: 15,
          ...police('600'),
        }}
      >
        {resteAvant(new Date(limite), maintenant)} · {c.texte}
      </Text>
    </Card>
  );
}

function Mention() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.neutralBg, borderRadius: 16, padding: 14 }}>
      <Text
        style={{
          color: t.textMuted,
          fontSize: 14,
          lineHeight: 20,
          ...police('400'),
        }}
      >
        Cette application sert à consulter votre dossier. Pour accepter ou refuser, connectez-vous à votre dossier sur le site.
      </Text>
    </View>
  );
}
