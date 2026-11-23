import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Logo } from '../components/ui';
import { useSession } from '../session/SessionProvider';
import { police, Theme, useTheme } from '../theme';

const CODE = '482913';

type Etape = 0 | 1 | 2 | 3 | 4;

/**
 * Démonstration du parcours de liaison du compte, sans serveur.
 * 0. Dans l'application : bouton « Lier mon compte Parcoursup ».
 * 1-3. Le navigateur du téléphone s'ouvre PAR-DESSUS l'application (volet imité) :
 *      identifiants, code de vérification, autorisation. Cette page appartient au
 *      site officiel, pas à l'application.
 * 4. Le volet se referme : retour dans l'application, compte lié.
 * Les identifiants sont fictifs et pré-remplis : rien n'est saisi, pour qu'aucun
 * testeur ne tape ses vrais identifiants.
 */
export function ConnexionSimuleeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { connexion } = useSession();
  const [etape, setEtape] = useState<Etape>(0);
  const [code, setCode] = useState('');
  const [chargement, setChargement] = useState(false);
  const [volet] = useState(() => new Animated.Value(0));

  const navigateurOuvert = etape >= 1 && etape <= 3;
  useEffect(() => {
    Animated.timing(volet, {
      toValue: navigateurOuvert ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [navigateurOuvert, volet]);

  const fermer = () => (router.canGoBack() ? router.back() : router.replace('/connexion'));
  const ouvrirDossier = async () => {
    setChargement(true);
    await connexion();
    router.replace('/dossier');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* L'écran de l'application, en arrière-plan */}
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 36, gap: 18, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <Logo taille={56} />
        {etape < 4 ? (
          <>
            <Text style={{ color: t.text, fontSize: 26, lineHeight: 31, ...police('800') }}>Lier votre compte Parcoursup</Text>
            <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 22, ...police('400') }}>
              Une seule fois · 1 minute · 3 étapes. Le navigateur de votre téléphone s’ouvre sur le site officiel de Parcoursup, puis vous
              revenez ici tout seul.
            </Text>
            <Button label="Lier mon compte Parcoursup" onPress={() => setEtape(1)} />
            <Pressable onPress={fermer} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
              <Text style={{ color: t.primary, fontSize: 14, ...police('600') }}>Annuler</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: t.text, fontSize: 26, lineHeight: 31, ...police('800') }}>Compte lié ✓</Text>
            <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 22, ...police('400') }}>
              {EXPLICATIONS[4].texte} Vous n’aurez plus à vous connecter sur ce téléphone.
            </Text>
            {chargement ? (
              <ActivityIndicator color={t.primary} style={{ paddingVertical: 14 }} />
            ) : (
              <Button label="Ouvrir mon dossier" onPress={() => void ouvrirDossier()} />
            )}
          </>
        )}
        <Text style={{ color: t.textMuted, fontSize: 12.5, textAlign: 'center', ...police('400') }}>
          Simulation : aucune donnée n’est envoyée.
        </Text>
      </ScrollView>

      {/* Voile sur l'application pendant que le navigateur est ouvert */}
      <Animated.View
        pointerEvents={navigateurOuvert ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(12,18,32,0.88)',
          opacity: volet,
        }}
      >
        {/* Commentaire de la démo, au-dessus du volet */}
        {navigateurOuvert && (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 4 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, ...police('700') }}>{EXPLICATIONS[etape].titre}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, ...police('400') }}>
              {EXPLICATIONS[etape].texte}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Volet du navigateur du téléphone */}
      <Animated.View
        pointerEvents={navigateurOuvert ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: 150,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          transform: [{ translateY: volet.interpolate({ inputRange: [0, 1], outputRange: [900, 0] }) }],
        }}
      >
        {/* Barre du navigateur */}
        <View style={{ backgroundColor: '#F1F3F4', paddingTop: 8, paddingBottom: 10, paddingHorizontal: 14, gap: 8 }}>
          <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: '#C9CDD2' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => setEtape(0)} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: '#1A73E8', fontSize: 15, ...police('600') }}>Fermer</Text>
            </Pressable>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontSize: 12 }}>🔒</Text>
              <Text numberOfLines={1} style={{ flex: 1, color: '#3C4043', fontSize: 13, ...police('500') }}>
                Site officiel Parcoursup (simulation)
              </Text>
            </View>
          </View>
          <Text style={{ color: '#5F6368', fontSize: 11.5, textAlign: 'center', ...police('500') }}>
            Navigateur du téléphone · vous n’êtes plus dans l’application
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
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
              <Titre t={t}>Autoriser l’application</Titre>
              <Text style={{ color: t.textMuted, lineHeight: 20, ...police('400') }}>
                L’application Parcours’app demande à consulter votre dossier.
              </Text>
              <Liste
                t={t}
                titre="Elle pourra voir"
                signe="✓"
                couleur={t.successDot}
                elements={['vos vœux et leur statut', 'vos propositions et leurs dates limites', 'votre position en liste d’attente']}
              />
              <Liste
                t={t}
                titre="Elle ne pourra pas"
                signe="✕"
                couleur={t.danger}
                elements={['répondre à une proposition ou modifier vos vœux', 'voir vos notes, bulletins ou données sensibles']}
              />
              <Button label="Autoriser la consultation" onPress={() => setEtape(4)} />
              <Button label="Refuser" variant="secondary" onPress={() => setEtape(0)} />
            </>
          )}

          {navigateurOuvert && (
            <Text style={{ color: t.textMuted, fontSize: 12.5, textAlign: 'center', ...police('400') }}>Étape {etape} sur 3</Text>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const EXPLICATIONS: Record<Etape, { titre: string; texte: string }> = {
  0: { titre: '', texte: '' },
  1: { titre: 'Vous êtes sur le site officiel', texte: 'L’appli ne voit pas votre mot de passe.' },
  2: { titre: 'Le code reçu par mail', texte: 'Comme d’habitude sur Parcoursup.' },
  3: { titre: 'C’est vous qui choisissez', texte: 'Ce que l’appli peut voir, et ce qu’elle ne pourra jamais faire.' },
  4: {
    titre: 'C’est fait !',
    texte: 'L’appli peut consulter votre dossier, rien de plus. Vous pouvez retirer cet accès quand vous voulez.',
  },
};

function Liste({ t, titre, signe, couleur, elements }: { t: Theme; titre: string; signe: string; couleur: string; elements: string[] }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: t.text, ...police('700') }}>{titre} :</Text>
      {elements.map((e) => (
        <Text key={e} style={{ color: t.text, lineHeight: 20, ...police('400') }}>
          <Text style={{ color: couleur, ...police('800') }}>{signe} </Text>
          {e}
        </Text>
      ))}
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
