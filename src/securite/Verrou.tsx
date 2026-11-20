import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Switch, Text, View } from 'react-native';
import { Button, Logo } from '../components/ui';
import { useSession } from '../session/SessionProvider';
import { police, useTheme } from '../theme';

/**
 * Verrouillage optionnel par empreinte, visage ou code du téléphone.
 * - Activé par le candidat, après une première vérification réussie.
 * - L'application se verrouille au démarrage et après 30 secondes en arrière-plan.
 * - Tant qu'elle n'est pas au premier plan, son contenu est masqué
 *   (aperçu du sélecteur d'applications).
 * Seule la préférence est enregistrée ; aucune donnée biométrique n'est accessible à l'application.
 */
const CLE = 'suivi-voeux.verrou';
const DELAI_VERROU_MS = 30_000;
const natif = Platform.OS === 'ios' || Platform.OS === 'android';

interface Verrou {
  disponible: boolean;
  actif: boolean;
  activer: (oui: boolean) => Promise<void>;
}

const Contexte = createContext<Verrou>({ disponible: false, actif: false, activer: async () => {} });

async function verifier(message: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: 'Annuler',
    // Le code du téléphone reste possible si l'empreinte ou le visage échoue.
    disableDeviceFallback: false,
  });
  return r.success;
}

export function VerrouProvider({ children }: { children: ReactNode }) {
  const { statut } = useSession();
  const [disponible, setDisponible] = useState(false);
  const [actif, setActif] = useState(false);
  const [verrouille, setVerrouille] = useState(false);
  const [masque, setMasque] = useState(false);
  const arrierePlanDepuis = useRef<number | null>(null);

  // Au démarrage : matériel disponible ? préférence enregistrée ?
  useEffect(() => {
    if (!natif) return;
    (async () => {
      const materiel = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      setDisponible(materiel);
      const pref = (await SecureStore.getItemAsync(CLE).catch(() => null)) === '1';
      setActif(materiel && pref);
      if (materiel && pref) setVerrouille(true);
    })();
  }, []);

  // Verrouillage après un passage en arrière-plan
  useEffect(() => {
    if (!actif) return;
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat !== 'active') {
        setMasque(true);
        if (arrierePlanDepuis.current == null) arrierePlanDepuis.current = Date.now();
        return;
      }
      const depuis = arrierePlanDepuis.current;
      arrierePlanDepuis.current = null;
      if (depuis != null && Date.now() - depuis > DELAI_VERROU_MS) setVerrouille(true);
      setMasque(false);
    });
    return () => abonnement.remove();
  }, [actif]);

  // À la déconnexion, la préférence est oubliée (ajustement pendant le rendu, sans effet en cascade).
  const [statutPrecedent, setStatutPrecedent] = useState(statut);
  if (statut !== statutPrecedent) {
    setStatutPrecedent(statut);
    if (statut === 'deconnecte' && actif) {
      setActif(false);
      setVerrouille(false);
    }
  }
  useEffect(() => {
    if (statut === 'deconnecte') void SecureStore.deleteItemAsync(CLE).catch(() => {});
  }, [statut]);

  const activer = useCallback(async (oui: boolean) => {
    if (oui) {
      if (!(await verifier('Activer le verrouillage de Suivi Vœux'))) return;
      await SecureStore.setItemAsync(CLE, '1');
    } else {
      await SecureStore.deleteItemAsync(CLE).catch(() => {});
    }
    setActif(oui);
  }, []);

  const deverrouiller = useCallback(async () => {
    if (await verifier('Déverrouiller Suivi Vœux')) setVerrouille(false);
  }, []);

  const afficherVerrou = actif && statut === 'connecte' && (verrouille || masque);

  return (
    <Contexte.Provider value={{ disponible, actif, activer }}>
      <View style={{ flex: 1 }}>
        {children}
        {afficherVerrou && <EcranVerrou demander={!masque} onDeverrouiller={deverrouiller} />}
      </View>
    </Contexte.Provider>
  );
}

function EcranVerrou({ demander, onDeverrouiller }: { demander: boolean; onDeverrouiller: () => Promise<void> }) {
  const t = useTheme();
  const demande = useRef(false);
  // Demande automatique une fois l'application revenue au premier plan
  useEffect(() => {
    if (demander && !demande.current) {
      demande.current = true;
      void onDeverrouiller();
    }
  }, [demander, onDeverrouiller]);
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 18,
      }}
    >
      <Logo taille={64} />
      <Text style={{ color: t.text, fontSize: 20, textAlign: 'center', ...police('800') }}>Suivi Vœux est verrouillé</Text>
      <Text style={{ color: t.textMuted, textAlign: 'center', lineHeight: 20, ...police('400') }}>
        Votre dossier reste masqué tant que vous ne l’avez pas déverrouillé.
      </Text>
      {demander && (
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Déverrouiller" onPress={() => void onDeverrouiller()} />
        </View>
      )}
    </View>
  );
}

export function useVerrou(): Verrou {
  return useContext(Contexte);
}

/** Réglage affiché dans le dossier, seulement si le téléphone le permet. */
export function ReglageVerrou() {
  const t = useTheme();
  const { disponible, actif, activer } = useVerrou();
  const [enCours, setEnCours] = useState(false);
  if (!disponible) return null;
  const basculer = async () => {
    setEnCours(true);
    await activer(!actif).catch(() => {});
    setEnCours(false);
  };
  return (
    <Pressable
      onPress={() => void basculer()}
      disabled={enCours}
      accessibilityRole="switch"
      accessibilityState={{ checked: actif }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 18, padding: 16 }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: t.text, fontSize: 15, ...police('700') }}>Verrouiller l’application</Text>
        <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 18, ...police('400') }}>
          Empreinte, visage ou code du téléphone, si quelqu’un d’autre l’utilise.
        </Text>
      </View>
      <Switch value={actif} onValueChange={() => void basculer()} disabled={enCours} trackColor={{ true: t.primary }} />
    </Pressable>
  );
}
