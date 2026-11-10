import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/ui';
import { useTheme } from '../theme';

export function LoginScreen({ onLogin }: { onLogin: (numero: string, mdp: string) => Promise<void> }) {
  const t = useTheme();
  const [numero, setNumero] = useState('');
  const [mdp, setMdp] = useState('');
  const [chargement, setChargement] = useState(false);

  const input = {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: t.text,
  } as const;

  const valider = async () => {
    setChargement(true);
    try {
      await onLogin(numero, mdp);
    } finally {
      setChargement(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 48, gap: 28, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <View style={{ gap: 10 }}>
          <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.primaryText, fontSize: 22, fontWeight: '800' }}>SV</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>Suivi Vœux</Text>
          <Text style={{ fontSize: 16, color: t.textMuted, lineHeight: 22 }}>
            Consultez vos propositions d'admission et l'évolution de votre rang en liste d'attente.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ color: t.text, fontWeight: '600' }}>Numéro de dossier</Text>
            <TextInput
              value={numero}
              onChangeText={setNumero}
              placeholder="Ex. 1234567"
              placeholderTextColor={t.textMuted}
              keyboardType="number-pad"
              autoComplete="username"
              style={input}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: t.text, fontWeight: '600' }}>Mot de passe</Text>
            <TextInput
              value={mdp}
              onChangeText={setMdp}
              placeholder="••••••••"
              placeholderTextColor={t.textMuted}
              secureTextEntry
              autoComplete="password"
              style={input}
            />
          </View>
          {chargement ? (
            <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
          ) : (
            <Button label="Se connecter" onPress={valider} />
          )}
          <Text style={{ color: t.textMuted, fontSize: 13, textAlign: 'center' }}>
            Démo : n'importe quel identifiant fonctionne. Ne saisissez pas vos vrais identifiants.
          </Text>
        </View>

        <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 14, padding: 16, gap: 6 }}>
          <Text style={{ color: t.text, fontWeight: '700' }}>🔒 Consultation uniquement</Text>
          <Text style={{ color: t.textMuted, lineHeight: 20 }}>
            L'application ne peut ni accepter ni refuser une proposition, ni modifier votre dossier. Pour répondre, vous
            serez redirigé vers le site officiel.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
