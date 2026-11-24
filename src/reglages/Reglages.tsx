import { useState } from 'react';
import { Linking, Platform, Pressable, Switch, Text, View } from 'react-native';
import { LienExterne, TitreSection, URL_PARCOURSUP } from '../components/ui';
import { demanderAutorisation, etatAutorisation } from '../notifications/notificationDemo';
import { definirNotifications, useNotificationsActives } from '../notifications/preference';
import { ReglageVerrou } from '../securite/Verrou';
import { police, useTheme } from '../theme';
import { Confirmation } from './Confirmation';

type Fenetre = null | 'desactiver-notifications' | 'notifications-bloquees' | 'deconnexion';

/** Réglages en bas de l'accueil : notifications, verrouillage, déconnexion (qui retire l'accès de l'application). */
export function Reglages({
  onDeconnexion,
  coordonnees,
}: {
  onDeconnexion: () => Promise<void>;
  coordonnees?: { mail: string; telephone: string };
}) {
  const t = useTheme();
  const notifications = useNotificationsActives();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const fermer = () => setFenetre(null);

  const basculerNotifications = async () => {
    if (notifications) {
      setFenetre('desactiver-notifications');
      return;
    }
    // Réactivation : il faut aussi l'autorisation du téléphone
    if ((await etatAutorisation()) === 'bloquee') {
      setFenetre('notifications-bloquees');
      return;
    }
    if (await demanderAutorisation()) await definirNotifications(true);
    else setFenetre('notifications-bloquees');
  };

  const ligne = { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 18, padding: 16 } as const;

  return (
    <View style={{ gap: 10 }}>
      <TitreSection titre="Réglages" />

      <Pressable
        onPress={() => void basculerNotifications()}
        accessibilityRole="switch"
        accessibilityState={{ checked: notifications }}
        style={ligne}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Notifications</Text>
          <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 18, ...police('400') }}>
            {notifications
              ? 'Propositions, rappels avant les dates limites, nouveautés du dossier.'
              : 'Coupées. Les SMS et les mails de Parcoursup continuent.'}
          </Text>
        </View>
        <Switch value={notifications} onValueChange={() => void basculerNotifications()} trackColor={{ true: t.primary }} />
      </Pressable>

      {/* Les alertes SMS et mail de Parcoursup dépendent des coordonnées saisies à l'inscription :
          une erreur, et elles se perdent sans que personne ne s'en aperçoive. */}
      {coordonnees && (
        <View style={{ ...ligne, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Vos alertes Parcoursup</Text>
          <Text style={{ color: t.textMuted, fontSize: 13.5, lineHeight: 19, ...police('400') }}>
            Les SMS et mails de Parcoursup arrivent sur :{'\n'}
            <Text style={{ color: t.text, ...police('600') }}>{coordonnees.mail}</Text> ·{' '}
            <Text style={{ color: t.text, ...police('600') }}>{coordonnees.telephone}</Text>
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 13.5, lineHeight: 19, ...police('400') }}>
            Si c’est faux, corrigez-les sur le site. Vous pouvez aussi y ajouter un proche, pour qu’il soit prévenu lui aussi.
          </Text>
          <LienExterne url={URL_PARCOURSUP} label="Vérifier sur Parcoursup ↗" variant="secondary" />
        </View>
      )}

      <ReglageVerrou />

      <Pressable
        onPress={() => setFenetre('deconnexion')}
        accessibilityRole="button"
        style={({ pressed }) => ({ ...ligne, opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: t.danger, fontSize: 15, ...police('700') }}>Se déconnecter</Text>
          <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 18, ...police('400') }}>
            Vous pourrez vous reconnecter quand vous voulez.
          </Text>
        </View>
        <Text style={{ color: t.textMuted, fontSize: 20, ...police('600') }}>›</Text>
      </Pressable>

      <Confirmation
        visible={fenetre === 'desactiver-notifications'}
        titre="Couper les notifications ?"
        message="Vous ne serez plus prévenu(e) quand une proposition arrive ou qu’une date limite approche. Et une proposition sans réponse à temps, c’est perdu. Les SMS et les mails de Parcoursup, eux, continuent."
        confirmer="Couper quand même"
        annuler="Les garder"
        danger
        onAnnuler={fermer}
        onConfirmer={() => {
          fermer();
          void definirNotifications(false);
        }}
      />
      <Confirmation
        visible={fenetre === 'notifications-bloquees'}
        titre="Votre téléphone bloque les notifications"
        message="Pour les recevoir, autorisez-les pour Parcours’app dans les réglages du téléphone. Ça prend dix secondes."
        confirmer={Platform.OS === 'web' ? 'Compris' : 'Ouvrir les réglages'}
        onAnnuler={fermer}
        onConfirmer={() => {
          fermer();
          if (Platform.OS !== 'web') void Linking.openSettings();
        }}
      />
      <Confirmation
        visible={fenetre === 'deconnexion'}
        titre="Se déconnecter ?"
        message="L’appli n’affichera plus votre dossier et ne vous enverra plus de notifications. Rien ne change sur Parcoursup. Pour revenir, il suffit de vous reconnecter."
        confirmer="Se déconnecter"
        annuler="Rester connecté(e)"
        danger
        onAnnuler={fermer}
        onConfirmer={() => {
          fermer();
          void onDeconnexion();
        }}
      />
    </View>
  );
}
