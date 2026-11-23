import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { apiSimulee, modeDemo } from '../api';
import { messageErreur } from '../api/erreurs';
import { Button, Logo } from '../components/ui';
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
            Suivre son dossier, sans stress.
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

        {apiSimulee ? (
          <View style={{ gap: 12 }}>
            {chargement ? (
              <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
            ) : (
              <>
                <Cible id="connexion-demo">
                  <Button label="Découvrir la démo" onPress={() => void valider()} />
                </Cible>
                {demoAuto && <Button label="Visite guidée" variant="secondary" onPress={demoAuto.lancer} />}
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
              Démonstration avec un dossier fictif : aucun identifiant n’est demandé.
            </Text>
            <Pressable
              onPress={() => router.push('/connexion-simulee')}
              accessibilityRole="link"
              style={{ alignSelf: 'center', padding: 6 }}
            >
              <Text style={{ color: t.primary, fontSize: 14, textDecorationLine: 'underline', ...police('600') }}>
                Comment se connecte-t-on en toute sécurité ?
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={{ color: t.textMuted, fontSize: 14.5, lineHeight: 21, ...police('400') }}>
              La page de connexion officielle s’ouvre dans le navigateur de votre téléphone. Votre mot de passe et votre code de
              vérification y sont saisis, jamais dans l’application.
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
              <Button label="Se connecter" onPress={() => void valider()} />
            )}
            {modeDemo && (
              <Text style={{ color: t.textMuted, fontSize: 13, textAlign: 'center', ...police('400') }}>
                Serveur de démonstration : n’importe quel identifiant fonctionne. Ne saisissez pas vos vrais identifiants.
              </Text>
            )}
          </View>
        )}

        <View
          style={{
            backgroundColor: t.surface,
            borderRadius: 18,
            padding: 16,
            gap: 6,
          }}
        >
          <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Aucune action sur votre dossier</Text>
          <Text style={{ color: t.textMuted, lineHeight: 20, ...police('400') }}>
            L’application ne peut ni accepter ni refuser une proposition. Pour répondre, vous serez redirigé vers le site officiel.
          </Text>
        </View>
        <View style={{ marginTop: 20 }}>
          <Droits />
        </View>
      </ScrollView>
    </View>
  );
}
