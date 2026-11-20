import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, modeDemo } from '../api';
import { ApiError, messageErreur } from '../api/erreurs';
import type { Dossier } from '../api/types';
import { programmerNotificationDemo } from '../notifications/notificationDemo';

type Statut = 'demarrage' | 'deconnecte' | 'connecte';

interface Session {
  statut: Statut;
  dossier: Dossier | null;
  /** Date (ms) de la dernière récupération réussie */
  recupereLe: number | null;
  /** Erreur du dernier rafraîchissement ; le dernier dossier connu reste affiché */
  erreur: string | null;
  rafraichissement: boolean;
  /** Écart entre l'horloge du serveur et celle du téléphone (ms) */
  decalageHorloge: number;
  notification: boolean;
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
  montrerNotification: () => void;
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
  const [decalageHorloge, setDecalage] = useState(0);
  const [notification, setNotification] = useState(false);
  const recupereLeRef = useRef<number | null>(null);

  const reinitialiser = useCallback(() => {
    setDossier(null);
    setRecupereLe(null);
    recupereLeRef.current = null;
    setErreur(null);
    setStatut('deconnecte');
  }, []);

  const charger = useCallback(async () => {
    try {
      const d = await api.getDossier();
      setDossier(d);
      setDecalage(new Date(d.dateServeur).getTime() - Date.now());
      const maintenant = Date.now();
      setRecupereLe(maintenant);
      recupereLeRef.current = maintenant;
      setErreur(null);
      setStatut('connecte');
    } catch (e) {
      if (e instanceof ApiError && e.type === 'session_expiree') {
        reinitialiser();
        return;
      }
      setErreur(messageErreur(e));
      setStatut('connecte');
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
    reinitialiser();
  }, [reinitialiser]);

  const rafraichir = useCallback(async () => {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  }, [charger]);

  const simulerNuit = useCallback(
    async (options?: { notificationSysteme?: boolean }) => {
      if (await api.simulerNuit?.()) {
        // Sur téléphone : vraie notification système dans quelques secondes.
        // Sur le web, ou si l'utilisateur refuse les notifications : notification imitée.
        const systeme = options?.notificationSysteme === false ? false : await programmerNotificationDemo().catch(() => false);
        await charger();
        if (!systeme) setNotification(true);
      }
    },
    [charger],
  );

  const fermerNotification = useCallback(() => setNotification(false), []);
  const montrerNotification = useCallback(() => setNotification(true), []);
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
        decalageHorloge,
        notification,
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
