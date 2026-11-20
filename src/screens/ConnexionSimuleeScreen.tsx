import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useSession } from '../session/SessionProvider';
import { police, Theme, useTheme } from '../theme';

const CODE = '482913';

/**
 * Démonstration du parcours de connexion cible, sans serveur : la page de
 * connexion s'ouvre « dans le navigateur » (ici imitée), avec mot de passe puis
 * code de vérification, et l'application ne reçoit qu'une autorisation de consultation.
 * Les identifiants sont fictifs et pré-remplis : rien n'est saisi, pour qu'aucun
 * testeur ne tape ses vrais identifiants.
 */
export function ConnexionSimuleeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { connexion } = useSession();
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState('');
  const [chargement, setChargement] = useState(false);

  const fermer = () => (router.canGoBack() ? router.back() : router.replace('/connexion'));
  const ouvrirDossier = async () => {
    setChargement(true);
    await connexion();
    router.replace('/dossier');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <Explication t={t} etape={etape} />

        {/* Fenêtre du navigateur */}
        <View style={{ backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#E9ECF1',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ fontSize: 13 }}>🔒</Text>
            <Text numberOfLines={1} style={{ flex: 1, color: t.textMuted, fontSize: 12.5, ...police('600') }}>
              Page de connexion officielle · simulation
            </Text>
            <Pressable onPress={fermer} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
              <Text style={{ color: t.textMuted, fontSize: 18, ...police('600') }}>×</Text>
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 12 }}>
            {etape === 1 && (
              <>
                <Titre t={t}>Connexion à votre dossier</Titre>
                <Champ t={t} libelle="Numéro de dossier" valeur="1234567" />
                <Champ t={t} libelle="Mot de passe" valeur="••••••••••" />
                <Text style={{ color: t.textMuted, fontSize: 12.5, ...police('400') }}>
                  Démonstration : identifiants fictifs déjà remplis.
                </Text>
                <Button label="Continuer" onPress={() => setEtape(2)} />
              </>
            )}

            {etape === 2 && (
              <>
                <Titre t={t}>Code de vérification</Titre>
                <Text style={{ color: t.textMuted, lineHeight: 20, ...police('400') }}>
                  Un code à 6 chiffres vient d’être envoyé à l’adresse mail de votre dossier.
                </Text>
                <Pressable
                  onPress={() => setCode(CODE)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mail reçu : code ${CODE}. Toucher pour le recopier.`}
                  style={{ backgroundColor: t.info, borderRadius: 14, padding: 12, gap: 2 }}
                >
                  <Text style={{ color: t.textMuted, fontSize: 12, ...police('600') }}>✉️ MAIL REÇU (FICTIF) · touchez pour recopier</Text>
                  <Text style={{ color: t.text, ...police('500') }}>
                    Votre code de vérification : <Text style={police('800')}>482 913</Text>
                  </Text>
                </Pressable>
                <Champ t={t} libelle="Code reçu par mail" valeur={code ? '482 913' : ''} indication="Touchez le mail ci-dessus" />
                <Button label="Valider" onPress={() => setEtape(3)} disabled={code !== CODE} />
              </>
            )}

            {etape === 3 && (
              <>
                <Titre t={t}>Connexion réussie</Titre>
                <Text style={{ color: t.textMuted, lineHeight: 20, ...police('400') }}>
                  Retour à l’application. Vous n’aurez plus à vous connecter sur ce téléphone.
                </Text>
                {chargement ? (
                  <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
                ) : (
                  <Button label="Ouvrir mon dossier" onPress={() => void ouvrirDossier()} />
                )}
              </>
            )}
          </View>
        </View>

        <Text style={{ color: t.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18, ...police('400') }}>
          Étape {etape} sur 3 · simulation : aucune donnée n’est envoyée.
        </Text>
      </ScrollView>
    </View>
  );
}

const EXPLICATIONS: Record<1 | 2 | 3, { titre: string; texte: string }> = {
  1: {
    titre: 'Vous avez quitté l’application',
    texte:
      'La connexion se fait sur la page officielle, dans le navigateur du téléphone. L’application ne voit pas ce que vous tapez : une fausse application ne pourrait pas récupérer votre mot de passe.',
  },
  2: {
    titre: 'Double authentification',
    texte:
      'Même avec votre mot de passe, personne ne peut se connecter sans ce code. C’est la protection qui existe déjà sur le site : l’application en profite sans rien changer.',
  },
  3: {
    titre: 'L’application ne reçoit qu’une autorisation de consultation',
    texte:
      'Ni votre mot de passe, ni votre code : seulement un accès en lecture seule, qui ne permet aucune action sur le dossier et que vous pouvez révoquer.',
  },
};

function Explication({ t, etape }: { t: Theme; etape: 1 | 2 | 3 }) {
  const e = EXPLICATIONS[etape];
  return (
    <View style={{ backgroundColor: t.primary, borderRadius: 18, padding: 16, gap: 6 }}>
      <Text style={{ color: t.primaryText, fontSize: 16, ...police('700') }}>{e.titre}</Text>
      <Text style={{ color: t.primaryText, opacity: 0.92, lineHeight: 20, ...police('400') }}>{e.texte}</Text>
    </View>
  );
}

function Titre({ t, children }: { t: Theme; children: string }) {
  return <Text style={{ color: t.text, fontSize: 21, ...police('800') }}>{children}</Text>;
}

function Champ({ t, libelle, valeur, indication }: { t: Theme; libelle: string; valeur: string; indication?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.text, ...police('600') }}>{libelle}</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: t.bg,
        }}
      >
        <Text style={{ color: valeur ? t.text : t.textMuted, fontSize: 16, ...police('500') }}>{valeur || indication}</Text>
      </View>
    </View>
  );
}
