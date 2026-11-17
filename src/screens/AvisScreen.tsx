import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { envoyerAvis } from '../avis/envoi';
import { type Question, questionsPour, type Reponses } from '../avis/questions';
import { Button, Logo } from '../components/ui';
import { AVIS_ACTIF } from '../config';
import { police, useTheme } from '../theme';

type Etat = 'accueil' | 'questions' | 'envoi' | 'merci' | 'erreur';

export function AvisScreen({ onFermer }: { onFermer: () => void }) {
  const t = useTheme();
  const [etat, setEtat] = useState<Etat>('accueil');
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<Reponses>({});

  const questions = questionsPour(reponses);
  const q = questions[index];
  const derniere = index === questions.length - 1;

  const repondu = (question: Question) => {
    const r = reponses[question.cle];
    return r !== undefined && r !== '' && !(Array.isArray(r) && r.length === 0);
  };
  const peutContinuer = q && (!('obligatoire' in q) || repondu(q));

  const envoyer = async () => {
    setEtat('envoi');
    // Seules les réponses aux questions posées sont envoyées
    const payload: Reponses = {};
    for (const question of questions) if (reponses[question.cle] !== undefined) payload[question.cle] = reponses[question.cle];
    try {
      await envoyerAvis(payload);
      setEtat('merci');
    } catch {
      setEtat('erreur');
    }
  };

  const suivant = () => {
    if (derniere) void envoyer();
    else setIndex(index + 1);
  };

  const conteneur = { padding: 20, gap: 20, paddingBottom: 48, maxWidth: 560, width: '100%' as const, alignSelf: 'center' as const };

  if (!AVIS_ACTIF) {
    return (
      <ScrollView contentContainerStyle={conteneur}>
        <Fermer onPress={onFermer} />
        <Text style={{ color: t.text, fontSize: 17, ...police('600') }}>Le questionnaire n’est pas disponible dans cette version.</Text>
      </ScrollView>
    );
  }

  if (etat === 'accueil') {
    return (
      <ScrollView contentContainerStyle={conteneur}>
        <Fermer onPress={onFermer} />
        <Logo taille={56} />
        <Text style={{ color: t.text, fontSize: 30, lineHeight: 35, ...police('800') }}>Votre avis compte</Text>
        <Text style={{ color: t.textMuted, fontSize: 16.5, lineHeight: 24, ...police('400') }}>
          Quelques questions sur la phase d’admission et sur ce prototype. Comptez 2 minutes.
        </Text>
        <View style={{ backgroundColor: t.surface, borderRadius: 18, padding: 16, gap: 6 }}>
          <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Anonyme</Text>
          <Text style={{ color: t.textMuted, fontSize: 14.5, lineHeight: 20, ...police('400') }}>
            Aucune question ne permet de vous identifier. N’indiquez ni votre nom, ni votre numéro de dossier, ni le nom de votre lycée.
          </Text>
        </View>
        <Button label="Commencer" onPress={() => setEtat('questions')} />
      </ScrollView>
    );
  }

  if (etat === 'envoi') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <ActivityIndicator color={t.primary} size="large" />
        <Text style={{ color: t.textMuted, fontSize: 15, ...police('500') }}>Envoi de vos réponses…</Text>
      </View>
    );
  }

  if (etat === 'merci') {
    return (
      <ScrollView contentContainerStyle={{ ...conteneur, paddingTop: 64 }}>
        <View
          style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.successBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: t.success, fontSize: 30, ...police('800') }}>✓</Text>
        </View>
        <Text style={{ color: t.text, fontSize: 30, lineHeight: 35, ...police('800') }}>Merci !</Text>
        <Text style={{ color: t.textMuted, fontSize: 16.5, lineHeight: 24, ...police('400') }}>
          Vos réponses ont bien été envoyées. Elles aideront à convaincre de l’utilité de cette application.
        </Text>
        <Button label="Retour à l’application" onPress={onFermer} />
      </ScrollView>
    );
  }

  if (etat === 'erreur') {
    return (
      <ScrollView contentContainerStyle={{ ...conteneur, paddingTop: 64 }}>
        <Text style={{ color: t.text, fontSize: 26, ...police('800') }}>L’envoi n’a pas abouti</Text>
        <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 23, ...police('400') }}>
          Vérifiez votre connexion internet, puis réessayez. Vos réponses sont conservées.
        </Text>
        <Button label="Réessayer" onPress={() => void envoyer()} />
        <Button label="Revenir aux questions" variant="secondary" onPress={() => setEtat('questions')} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={conteneur} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {index > 0 ? (
            <Pressable onPress={() => setIndex(index - 1)} accessibilityRole="button" hitSlop={10}>
              <Text style={{ color: t.primary, fontSize: 15.5, ...police('700') }}>‹ Précédent</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Fermer onPress={onFermer} />
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.gaugeTrack, overflow: 'hidden' }}>
            <View style={{ width: `${((index + 1) / questions.length) * 100}%`, height: 6, backgroundColor: t.primary }} />
          </View>
          <Text style={{ color: t.textMuted, fontSize: 13, ...police('600') }}>
            Question {index + 1} sur {questions.length}
          </Text>
        </View>

        <Text style={{ color: t.text, fontSize: 23, lineHeight: 30, ...police('800') }}>{q.titre}</Text>

        <Champ question={q} reponses={reponses} onChange={(v) => setReponses({ ...reponses, [q.cle]: v })} />

        <View style={{ gap: 10, marginTop: 6 }}>
          <Button label={derniere ? 'Envoyer mes réponses' : 'Suivant'} onPress={suivant} disabled={!peutContinuer} />
          {!('obligatoire' in q) && !repondu(q) && !derniere && (
            <Pressable onPress={suivant} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: 15, ...police('600') }}>Passer</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Fermer({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Fermer le questionnaire"
      hitSlop={10}
      style={{ alignSelf: 'flex-end' }}
    >
      <Text style={{ color: t.textMuted, fontSize: 15, ...police('600') }}>Fermer ✕</Text>
    </Pressable>
  );
}

function Champ({ question: q, reponses, onChange }: { question: Question; reponses: Reponses; onChange: (v: Reponses[string]) => void }) {
  const t = useTheme();
  const valeur = reponses[q.cle];

  if (q.type === 'choix' || q.type === 'multiple') {
    const choisies = q.type === 'multiple' ? ((valeur as string[] | undefined) ?? []) : [];
    return (
      <View style={{ gap: 10 }}>
        {q.type === 'multiple' && <Text style={{ color: t.textMuted, fontSize: 14, ...police('500') }}>Plusieurs réponses possibles.</Text>}
        {q.options.map((o) => {
          const actif = q.type === 'choix' ? valeur === o : choisies.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => (q.type === 'choix' ? onChange(o) : onChange(actif ? choisies.filter((c) => c !== o) : [...choisies, o]))}
              accessibilityRole={q.type === 'choix' ? 'radio' : 'checkbox'}
              accessibilityState={{ checked: actif }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: actif ? t.info : t.surface,
                borderWidth: 2,
                borderColor: actif ? t.primary : 'transparent',
                borderRadius: 16,
                padding: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: q.type === 'choix' ? 11 : 6,
                  borderWidth: 2,
                  borderColor: actif ? t.primary : t.neutralDot,
                  backgroundColor: actif ? t.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {actif && <Text style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 15, ...police('800') }}>✓</Text>}
              </View>
              <Text style={{ color: t.text, fontSize: 16, flex: 1, lineHeight: 22, ...police(actif ? '700' : '500') }}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (q.type === 'echelle') {
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const actif = valeur === n;
            return (
              <Pressable
                key={n}
                onPress={() => onChange(n)}
                accessibilityRole="radio"
                accessibilityState={{ checked: actif }}
                accessibilityLabel={`${n} sur 5`}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  maxHeight: 72,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: actif ? t.primary : t.surface,
                }}
              >
                <Text style={{ color: actif ? '#FFFFFF' : t.text, fontSize: 22, ...police('800') }}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 13.5, ...police('500') }}>1 · {q.bas}</Text>
          <Text style={{ color: t.textMuted, fontSize: 13.5, ...police('500') }}>{q.haut} · 5</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {q.aide && <Text style={{ color: t.textMuted, fontSize: 14, ...police('500') }}>{q.aide}</Text>}
      <TextInput
        value={(valeur as string | undefined) ?? ''}
        onChangeText={(v) => onChange(v.slice(0, 1000))}
        multiline
        placeholder="Votre réponse"
        placeholderTextColor={t.textMuted}
        style={{
          minHeight: 130,
          backgroundColor: t.surface,
          borderRadius: 16,
          padding: 16,
          fontSize: 16,
          lineHeight: 22,
          color: t.text,
          textAlignVertical: 'top',
          ...police('500'),
        }}
      />
    </View>
  );
}
