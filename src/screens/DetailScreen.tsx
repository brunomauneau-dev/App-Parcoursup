import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Voeu } from '../api/types';
import { Jauge } from '../components/Jauge';
import { Cible } from '../demo/DemoAuto';
import { CheminProposition, COULEUR_DEVANT } from '../components/CheminProposition';
import { BoutonRepondre, Card, EncartConsultation, StatutBadge, Variation } from '../components/ui';
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
          <StatutBadge statut={voeu.statut} ouiSi={voeu.ouiSi != null} />
        </View>
      </View>

      {voeu.statut === 'en_attente' && voeu.rang != null && <BlocAttente voeu={voeu} annee={maintenant.getFullYear() - 1} />}

      {voeu.statut === 'proposition' && voeu.dateLimiteReponse && (
        <>
          <Text style={corps}>
            {voeu.etablissement} vous fait une proposition d’admission. Vous pouvez l’accepter tout en gardant vos vœux en attente : rien ne
            presse avant la date limite.
          </Text>
          {voeu.ouiSi && <ExplicationOuiSi accompagnement={voeu.ouiSi.accompagnement} />}
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
          {voeu.ouiSi && (
            <Text style={corps}>
              Votre accompagnement : {voeu.ouiSi.accompagnement}. L’établissement vous en précisera l’organisation à l’inscription.
            </Text>
          )}
          <Text style={corps}>Pensez à consulter les modalités d’inscription administrative de l’établissement.</Text>
          <Mention acceptee />
          <BoutonRepondre label="Gérer ce vœu sur Parcoursup ↗" />
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
        Seul votre dossier sur le site officiel fait foi.
      </Text>
    </ScrollView>
  );
}

function BlocAttente({ voeu, annee }: { voeu: Voeu; annee: number }) {
  const t = useTheme();
  const [aide, setAide] = useState(false);
  // Comparaison avec l'an dernier : repliée, c'est une information de plus et elle peut inquiéter
  const [comparer, setComparer] = useState(false);
  const position = voeu.rang!;
  const classement = voeu.rangClassement;
  const ref = voeu.rangDernierAppeleAnneePrecedente;
  const d = variationVeille(voeu);
  const corps = { color: t.text, fontSize: 15.5, lineHeight: 23, ...police('400') } as const;
  const discret = { color: t.textMuted, fontSize: 14.5, lineHeight: 21, ...police('400') } as const;

  return (
    <>
      {/* Position dans la liste d'attente : une seule carte, lisible — combien devant moi, et est-ce que ça avance */}
      <Card style={{ gap: 14, padding: 18 }}>
        <Cible id="detail-jauge" style={{ gap: 12 }}>
          <Text style={{ color: t.textMuted, fontSize: 14, ...police('600') }}>Votre place dans la liste d’attente</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: t.text, fontSize: 48, lineHeight: 52, ...police('800') }}>{ordinal(position)}</Text>
            {d != null && <Variation valeur={d} />}
          </View>
          {voeu.totalEnAttente != null && (
            <>
              <Jauge rang={position} total={voeu.totalEnAttente} zone={position} couleurZone={COULEUR_DEVANT} grande />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: COULEUR_DEVANT }} />
                <Text style={{ color: t.textMuted, fontSize: 13, flex: 1, ...police('400') }}>Candidats devant vous</Text>
              </View>
            </>
          )}
          <Text style={{ color: t.text, fontSize: 15.5, lineHeight: 23, ...police('400') }}>
            <Text style={police('800')}>{nombre(Math.max(0, position - 1))}</Text>{' '}
            {position - 1 === 1 ? 'candidat est devant vous' : 'candidats sont devant vous'}
            {voeu.totalEnAttente != null ? `, sur ${nombre(voeu.totalEnAttente)} encore en attente.` : '.'}
          </Text>
        </Cible>
        {voeu.historique && voeu.historique.length > 1 && <CheminProposition historique={voeu.historique} rang={position} />}
      </Card>

      {/* Rang de classement : fixe, seul comparable au rang du dernier appelé */}
      {classement != null && ref != null && (
        <Card style={{ gap: 14, padding: 18 }}>
          <Pressable
            onPress={() => setComparer(!comparer)}
            accessibilityRole="button"
            accessibilityState={{ expanded: comparer }}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ color: t.text, fontSize: 15, flex: 1, ...police('700') }}>Comparer avec l’an dernier</Text>
            <Text style={{ color: t.primary, fontSize: 20, lineHeight: 20, ...police('700') }}>{comparer ? '−' : '+'}</Text>
          </Pressable>
          {comparer && (
            <>
              <Cible id="detail-classement" style={{ gap: 14 }}>
                <Text style={{ color: t.textMuted, fontSize: 14, ...police('600') }}>Votre rang de classement</Text>
                <Text style={{ color: t.text, fontSize: 36, lineHeight: 40, ...police('800') }}>{ordinal(classement)}</Text>
                <Jauge rang={classement} total={Math.round(Math.max(classement, ref) * 1.25)} zone={ref} grande bornes="debut" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: '#C9CFD9' }} />
                  <Text style={{ color: t.textMuted, fontSize: 13, flex: 1, ...police('400') }}>
                    Rang du dernier appelé en {annee} : {ordinal(ref)}
                  </Text>
                </View>
                <Text style={corps}>
                  En {annee}, la formation a appelé jusqu’au {ordinal(ref)} candidat de son classement. Votre rang de classement est{' '}
                  {ordinal(classement)}
                  {classement > ref ? ` : il faudrait que les appels aillent un peu plus loin qu’en ${annee}.` : '.'} Ce n’est qu’un ordre
                  d’idée.
                </Text>
              </Cible>
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
                  <Text style={{ color: t.primary, fontSize: 20, lineHeight: 20, ...police('700') }}>{aide ? '−' : '+'}</Text>
                </Pressable>
              </Cible>
              {aide && (
                <View style={{ gap: 10 }}>
                  <Text style={discret}>
                    <Text style={police('700')}>La position dans la liste d’attente</Text> est votre place parmi les candidats encore en
                    attente. Elle baisse chaque fois qu’un candidat placé devant vous accepte une autre formation ou renonce.
                  </Text>
                  <Text style={discret}>
                    <Text style={police('700')}>Le rang de classement</Text> est votre place dans le classement établi par la formation. Il
                    ne change pas. C’est lui qui se compare au rang du dernier candidat appelé l’année précédente.
                  </Text>
                  <Text style={discret}>
                    Le rang du dernier appelé l’année précédente donne un ordre d’idée, pas une garantie : chaque année est différente.
                  </Text>
                </View>
              )}
            </>
          )}
        </Card>
      )}

      <BoutonRepondre label="Gérer ce vœu sur Parcoursup ↗" />
    </>
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

function Mention({ acceptee = false }: { acceptee?: boolean }) {
  return acceptee ? (
    <EncartConsultation
      titre="Pour gérer ce vœu, direction le site officiel"
      texte="L’application sert à consulter. Toute démarche se fait sur Parcoursup : le bouton ci-dessous vous y emmène."
    />
  ) : (
    <EncartConsultation
      titre="Pour répondre, direction le site officiel"
      texte="L’application sert à consulter. Accepter ou refuser se fait sur Parcoursup : le bouton ci-dessous vous y emmène."
    />
  );
}

/** « Oui-si » : une vraie proposition, avec un accompagnement pour réussir. Expliqué sans jugement. */
function ExplicationOuiSi({ accompagnement }: { accompagnement: string }) {
  const t = useTheme();
  return (
    <Card style={{ gap: 8, padding: 18 }}>
      <Text style={{ color: t.text, fontSize: 16, ...police('700') }}>« Oui-si », ça veut dire quoi ?</Text>
      <Text style={{ color: t.text, fontSize: 15, lineHeight: 22, ...police('400') }}>
        La formation vous accepte, avec un accompagnement pour vous aider à réussir : {accompagnement}.
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 14.5, lineHeight: 21, ...police('400') }}>
        C’est une vraie proposition : vous y répondez comme aux autres, dans les mêmes délais. En l’acceptant, vous acceptez aussi
        l’accompagnement. Il est là pour vous aider, pas pour vous juger.
      </Text>
    </Card>
  );
}
