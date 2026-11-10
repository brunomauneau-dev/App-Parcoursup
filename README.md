# Suivi Vœux

Prototype d'application mobile (iOS et Android) pour consulter son dossier Parcoursup pendant la phase d'admission :

- propositions reçues et temps restant pour répondre ;
- rang en liste d'attente et son évolution jour après jour ;
- notification quand le dossier est mis à jour.

L'application est **en consultation uniquement** : elle ne permet aucune action sur le dossier. Pour répondre à une proposition, elle renvoie vers le site officiel.

> État actuel : prototype avec **données fictives**. Le branchement sur des données réelles nécessite une API de consultation et une authentification fournies par le SCN Parcoursup (voir la note de cadrage du projet).

## Lancer le projet

```bash
npm install
npx expo start
```

- Sur téléphone : scanner le QR code avec l'application Expo Go.
- Dans un navigateur : touche `w` dans le terminal.

## Générer la version web de démonstration

```bash
npx expo export --platform web --output-dir dist
```

## Organisation du code

| Chemin | Rôle |
| --- | --- |
| `App.tsx` | Point d'entrée, navigation entre les écrans |
| `src/api/types.ts` | Modèle de données attendu de l'API (proposition à valider avec le SCN) |
| `src/api/mock.ts` | Données fictives et horloge simulée de la démo |
| `src/screens/` | Écrans : connexion, tableau de bord, détail d'un vœu |
| `src/components/` | Graphique du rang, cartes, badges, notification simulée |
| `src/theme.ts` | Couleurs, modes clair et sombre |

Pour brancher la vraie API, il suffit de fournir une autre implémentation de l'interface `DossierApi` (`src/api/types.ts`) ; les écrans n'ont pas à changer.

## Vérifications

```bash
npx tsc --noEmit
```
