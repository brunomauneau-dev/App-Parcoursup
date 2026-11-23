import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { apiSimulee, modeDemo } from '../api';
import { messageErreur } from '../api/erreurs';
import { Button, EncartConsultation, Logo } from '../components/ui';
import { Cible, useDemoAuto } from '../demo/DemoAuto';
import { police, useTheme } from '../theme';
import { Droits } from '../components/Droits';

export function LoginScreen({ onLogin }: { onLogin: () => Promise<void> }) {
  const t = useTheme();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const demoAuto = useDemoAuto();
  const router = useRouter();

  const valider = async () => {
    setChargement(true);
    setErreur(null);
    try {
      await onLogin();
    } catch (e) {
      setErreur(messageErreur(e));
      setChargement(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 48,
          gap: 28,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ gap: 14 }}>
          <Logo taille={64} />
          <Text
            style={{
              color: t.primary,
              fontSize: 12.5,
              letterSpacing: 1,
              textTransform: 'uppercase',
              ...police('700'),
            }}
          >
            Consultation seule
          </Text>
          <Text
            style={{
              color: t.text,
              fontSize: 34,
              lineHeight: 38,
              ...police('800'),
            }}
          >
            Suivez votre admission, jour après jour.
          </Text>
          <Text
            style={{
              color: t.textMuted,
              fontSize: 16,
              lineHeight: 23,
              ...police('400'),
            }}
          >
            Vos propositions, vos délais de réponse et l’évolution de vos listes d’attente, en un coup d’œil.
          </Text>
        </View>

        <EncartConsultation
          titre="Consultation uniquement"
          texte="L’application ne permet ni d’accepter ni de refuser une proposition. Pour répondre, elle vous renvoie vers le site officiel Parcoursup."
        />

        {apiSimulee ? (
          <View style={{ gap: 12 }}>
            {chargement ? (
              <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
            ) : (
              <>
                {/* La visite guidée d'abord : le meilleur point d'entrée pour découvrir l'application */}
                {demoAuto && <Button label="Visite guidée, pas à pas" onPress={demoAuto.lancer} />}
                <Cible id="connexion-demo">
                  <Button label="Explorer un dossier fictif" variant={demoAuto ? 'secondary' : 'primary'} onPress={() => void valider()} />
                </Cible>
              </>
            )}
            <Text
              style={{
                color: t.textMuted,
                fontSize: 13.5,
                textAlign: 'center',
                lineHeight: 19,
                ...police('400'),
              }}
            >
              Tout est fictif : aucun identifiant n’est demandé.
            </Text>
            <Pressable
              onPress={() => router.push('/connexion-simulee')}
              accessibilityRole="link"
              style={{ alignSelf: 'center', padding: 6 }}
            >
              <Text style={{ color: t.primary, fontSize: 14, textDecorationLine: 'underline', ...police('600') }}>
                Voir comment lier son compte Parcoursup
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={{ color: t.textMuted, fontSize: 14.5, lineHeight: 21, ...police('400') }}>
              Une seule fois : la page de connexion officielle s’ouvre dans le navigateur de votre téléphone. Vous y saisissez votre mot de
              passe et votre code de vérification, puis vous autorisez l’application à consulter votre dossier. Elle ne voit jamais votre
              mot de passe.
            </Text>
            {erreur && (
              <Text
                accessibilityRole="alert"
                style={{
                  color: t.danger,
                  backgroundColor: t.dangerBg,
                  borderRadius: 12,
                  padding: 12,
                  ...police('500'),
                }}
              >
                {erreur}
              </Text>
            )}
            {chargement ? (
              <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
            ) : (
              <Button label="Lier mon compte Parcoursup" onPress={() => void valider()} />
            )}
            {modeDemo && (
              <Text style={{ color: t.textMuted, fontSize: 13, textAlign: 'center', ...police('400') }}>
                Serveur de démonstration : n’importe quel identifiant fonctionne. Ne saisissez pas vos vrais identifiants.
              </Text>
            )}
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <Droits />
        </View>
      </ScrollView>
    </View>
  );
}
