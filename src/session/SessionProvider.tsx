import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, modeDemo } from '../api';
import { ApiError, messageErreur } from '../api/erreurs';
import type { Dossier } from '../api/types';
import { programmerNotificationDemo } from '../notifications/notificationDemo';
import { notificationsActives, reinitialiserNotifications } from '../notifications/preference';
import { MESSAGE_MISE_A_JOUR, messageDuMatin } from '../notifications/messages';

type Statut = 'demarrage' | 'deconnecte' | 'connecte';

interface Session {
  statut: Statut;
  dossier: Dossier | null;
  /** Date (ms) de la dernière récupération réussie */
  recupereLe: number | null;
  /** Erreur du dernier rafraîchissement ; le dernier dossier connu reste affiché */
  erreur: string | null;
  rafraichissement: boolean;
  /** Service saturé : le dossier gardé sur le téléphone reste affiché, avec un message rassurant */
  affluence: boolean;
  /** Démonstration uniquement : simule une forte affluence (ou y met fin). */
  basculerAffluence?: () => void;
  /** Écart entre l'horloge du serveur et celle du téléphone (ms) */
  decalageHorloge: number;
  notification: boolean;
  /** Texte de la notification affichée */
  texteNotification: string;
  fermerNotification: () => void;
  connexion: () => Promise<void>;
  deconnexion: () => Promise<void>;
  rafraichir: () => Promise<void>;
  /**
   * Démonstration uniquement. `notificationSysteme: false` force la
   * notification imitée (utilisé par la démo automatique).
   */
  simulerNuit?: (options?: { notificationSysteme?: boolean }) => Promise<void>;
  /** Démonstration uniquement : affiche le dossier à un jour donné. */
  definirJour?: (jour: number) => Promise<void>;
  /** Démonstration uniquement : affiche la notification imitée. */
  montrerNotification: (texte?: string) => void;
  /** Démonstration uniquement : choisit le dossier fictif (sans recharger). */
  definirProfil?: (id: string) => Promise<void>;
  /** Démonstration uniquement : affiche un autre dossier fictif. */
  changerProfil?: () => Promise<void>;
}

const Contexte = createContext<Session | null>(null);

/** Au retour au premier plan, on rafraîchit si les données ont plus de 5 minutes. */
const RAFRAICHIR_APRES_MS = 5 * 60_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [statut, setStatut] = useState<Statut>('demarrage');
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [recupereLe, setRecupereLe] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [affluence, setAffluence] = useState(false);
  const [decalageHorloge, setDecalage] = useState(0);
  const [notification, setNotification] = useState(false);
  const [texteNotification, setTexteNotification] = useState(MESSAGE_MISE_A_JOUR);
  const recupereLeRef = useRef<number | null>(null);
  const attenteRef = useRef(false);
  const veilleRef = useRef(false);

  const reinitialiser = useCallback(() => {
    setDossier(null);
    setRecupereLe(null);
    recupereLeRef.current = null;
    setErreur(null);
    setAffluence(false);
    setStatut('deconnecte');
  }, []);

  const charger = useCallback(async (): Promise<Dossier | null> => {
    try {
      const d = await api.getDossier();
      setDossier(d);
      attenteRef.current = d.resultatsAttendus === true;
      veilleRef.current = d.avantPhase === true;
      setDecalage(new Date(d.dateServeur).getTime() - Date.now());
      const maintenant = Date.now();
      setRecupereLe(maintenant);
      recupereLeRef.current = maintenant;
      setErreur(null);
      setAffluence(false);
      setStatut('connecte');
      return d;
    } catch (e) {
      if (e instanceof ApiError && e.type === 'session_expiree') {
        reinitialiser();
        return null;
      }
      // Service saturé : pas d'alerte rouge, le dossier du matin reste valable
      if (e instanceof ApiError && e.type === 'indisponible') {
        setAffluence(true);
        setStatut('connecte');
        return null;
      }
      setErreur(messageErreur(e));
      setStatut('connecte');
      return null;
    }
  }, [reinitialiser]);

  // Reprise de session au démarrage
  useEffect(() => {
    (async () => {
      if (await api.restaurer()) await charger();
      else setStatut('deconnecte');
    })();
  }, [charger]);

  // Rafraîchissement au retour au premier plan
  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      const derniere = recupereLeRef.current;
      if (etat === 'active' && derniere != null && Date.now() - derniere > RAFRAICHIR_APRES_MS) {
        void charger();
      }
    });
    return () => abonnement.remove();
  }, [charger]);

  const connexion = useCallback(async () => {
    await api.connexion();
    await charger();
  }, [charger]);

  const deconnexion = useCallback(async () => {
    await api.deconnexion();
    await reinitialiserNotifications();
    reinitialiser();
  }, [reinitialiser]);

  const rafraichir = useCallback(async () => {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  }, [charger]);

  const simulerNuit = useCallback(
    async (options?: { notificationSysteme?: boolean }) => {
      const ouverture = attenteRef.current;
      const finVeille = veilleRef.current;
      if (await api.simulerNuit?.()) {
        // Fin de la veille : premier matin, les résultats ne sont pas encore là. Pas de notification.
        if (finVeille) {
          await charger();
          return;
        }
        // Notifications désactivées dans les réglages : le dossier se met à jour sans prévenir.
        if (!notificationsActives() && options?.notificationSysteme !== false) {
          await charger();
          return;
        }
        // Le message dépend du jour : rappel du classement des vœux en attente, ou mise à jour du dossier.
        const d = await charger();
        const texte = d ? messageDuMatin(d, new Date(d.dateServeur), ouverture) : MESSAGE_MISE_A_JOUR;
        setTexteNotification(texte);
        // Sur téléphone : vraie notification système dans quelques secondes.
        // Sur le web, ou si l'utilisateur refuse les notifications : notification imitée.
        const systeme = options?.notificationSysteme === false ? false : await programmerNotificationDemo(texte).catch(() => false);
        if (!systeme) setNotification(true);
      }
    },
    [charger],
  );

  const basculerAffluence = useCallback(() => setAffluence((a) => !a), []);
  const fermerNotification = useCallback(() => setNotification(false), []);
  const montrerNotification = useCallback((texte?: string) => {
    setTexteNotification(texte ?? MESSAGE_MISE_A_JOUR);
    setNotification(true);
  }, []);
  const definirProfil = useCallback(async (id: string) => {
    await api.definirProfil?.(id);
  }, []);
  const changerProfil = useCallback(async () => {
    await api.profilSuivant?.();
    await charger();
  }, [charger]);
  const definirJour = useCallback(
    async (jour: number) => {
      await api.definirJour?.(jour);
      await charger();
    },
    [charger],
  );

  return (
    <Contexte.Provider
      value={{
        statut,
        dossier,
        recupereLe,
        erreur,
        rafraichissement,
        affluence,
        basculerAffluence: modeDemo ? basculerAffluence : undefined,
        decalageHorloge,
        notification,
        texteNotification,
        fermerNotification,
        montrerNotification,
        definirProfil: modeDemo && api.definirProfil ? definirProfil : undefined,
        changerProfil: modeDemo && api.profilSuivant ? changerProfil : undefined,
        definirJour: modeDemo && api.definirJour ? definirJour : undefined,
        connexion,
        deconnexion,
        rafraichir,
        simulerNuit: modeDemo && api.simulerNuit ? simulerNuit : undefined,
      }}
    >
      {children}
    </Contexte.Provider>
  );
}

export function useSession(): Session {
  const s = useContext(Contexte);
  if (!s) throw new Error('useSession doit être utilisé sous <SessionProvider>');
  return s;
}

/** Heure courante corrigée par l'horloge du serveur, mise à jour chaque seconde. */
export function useMaintenant(): Date {
  const { decalageHorloge } = useSession();
  const [instant, setInstant] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setInstant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return new Date(instant + decalageHorloge);
}
