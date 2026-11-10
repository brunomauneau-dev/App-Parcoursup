# Suivi Vœux

Application mobile (iOS et Android) pour consulter son dossier Parcoursup pendant la phase d'admission :

- propositions reçues et temps restant pour répondre ;
- rang en liste d'attente et son évolution jour après jour ;
- notification quand le dossier est mis à jour.

L'application est **en consultation uniquement** : elle ne permet aucune action sur le dossier. Pour répondre à une proposition, elle renvoie vers le site officiel.

> État actuel : prototype avec **données fictives**. Le branchement sur des données réelles nécessite une API de consultation et une authentification fournies par le SCN Parcoursup. Le contrat proposé est dans [`docs/openapi.yaml`](docs/openapi.yaml).

## Démarrage rapide

Prérequis : Node.js 22.18 ou plus récent.

```bash
npm install
npx expo start
```

Sans configuration, l'application utilise une API simulée intégrée.
- Sur téléphone : scanner le QR code avec l'application Expo Go.
- Dans un navigateur : touche `w` dans le terminal.

## Avec le serveur de démonstration

Le dossier `server/` contient un serveur sans dépendance qui reproduit l'API cible (jetons OAuth, lecture seule, données fictives).

```bash
npm run serveur
```

Puis, dans un autre terminal, lancer l'application en lui donnant l'adresse du serveur. Sur un téléphone, utiliser l'adresse IP de l'ordinateur sur le réseau local, pas `localhost` :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000 EXPO_PUBLIC_DEMO=1 npx expo start
```

Identifiants : n'importe quel numéro de dossier (chiffres) et n'importe quel mot de passe. Le mot de passe `incorrect` simule une erreur d'identification.

## Vérifications

```bash
npm run typecheck   # typage TypeScript
npm test            # tests du serveur : jetons, lecture seule, révocation
```

## Organisation du code

| Chemin | Rôle |
| --- | --- |
| `src/app/` | Écrans et navigation (Expo Router) : `connexion`, `dossier/`, `dossier/[id]` |
| `src/session/SessionProvider.tsx` | État de la session : connexion, reprise au démarrage, rafraîchissement, erreurs |
| `src/api/types.ts` | Modèle de données de l'API |
| `src/api/http.ts` | Client de l'API réelle : jetons, renouvellement, délais, erreurs |
| `src/api/mock.ts` | API simulée intégrée (démo sans serveur) |
| `src/api/donneesDemo.ts` | Données fictives, partagées avec le serveur de démonstration |
| `src/auth/stockageJetons.ts` | Stockage des jetons dans le trousseau iOS / Keystore Android |
| `src/screens/`, `src/components/` | Composants d'affichage |
| `server/` | Serveur de démonstration et ses tests |
| `docs/openapi.yaml` | Contrat d'API proposé au SCN |

## Sécurité

- Le mot de passe n'est jamais stocké : il est envoyé une fois au serveur d'authentification.
- L'application ne garde qu'un jeton limité au périmètre `dossier.read`, dans le trousseau iOS ou le Keystore Android (en mémoire seulement sur le web).
- Elle refuse un jeton dont le périmètre dépasse la consultation.
- Les jetons de renouvellement sont à usage unique ; leur réutilisation révoque la session.
- Les comptes à rebours utilisent l'heure du serveur, pas celle du téléphone.
