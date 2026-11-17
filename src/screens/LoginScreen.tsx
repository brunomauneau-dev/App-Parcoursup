import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { apiSimulee, modeDemo } from '../api';
import { messageErreur } from '../api/erreurs';
import { Button, Logo } from '../components/ui';
import { Cible, useDemoAuto } from '../demo/DemoAuto';
import { police, useTheme } from '../theme';

export function LoginScreen({ onLogin }: { onLogin: (numero: string, mdp: string) => Promise<void> }) {
  const t = useTheme();
  const [numero, setNumero] = useState('');
  const [mdp, setMdp] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const demoAuto = useDemoAuto();

  const champ = {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: t.text,
    ...police('500'),
  } as const;

  const valider = async (n = numero, m = mdp) => {
    setChargement(true);
    setErreur(null);
    try {
      await onLogin(n, m);
    } catch (e) {
      setErreur(messageErreur(e));
      setChargement(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
                  <Button label="Découvrir la démo" onPress={() => void valider('0000000', 'demo')} />
                </Cible>
                {demoAuto && <Button label="Voir la démo animée (1 min)" variant="secondary" onPress={demoAuto.lancer} />}
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
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: t.text, ...police('600') }}>Numéro de dossier</Text>
              <TextInput
                value={numero}
                onChangeText={setNumero}
                placeholder="Ex. 1234567"
                placeholderTextColor={t.textMuted}
                keyboardType="number-pad"
                autoComplete="username"
                style={champ}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: t.text, ...police('600') }}>Mot de passe</Text>
              <TextInput
                value={mdp}
                onChangeText={setMdp}
                placeholder="••••••••"
                placeholderTextColor={t.textMuted}
                secureTextEntry
                autoComplete="password"
                onSubmitEditing={() => void valider()}
                style={champ}
              />
            </View>
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
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: 13,
                  textAlign: 'center',
                  ...police('400'),
                }}
              >
                Démo : n’importe quel identifiant fonctionne. Ne saisissez pas vos vrais identifiants.
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
