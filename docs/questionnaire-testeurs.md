# Questionnaire testeurs (Google Forms)

**Le questionnaire est intégré à l'application** (`src/avis/questions.ts`) ; les réponses sont reçues par `collecte-avis.gs` dans un tableur Google. Ce document en garde le contenu de référence, et peut servir à créer un Google Forms si besoin. Durée : 2 à 3 minutes.
Le formulaire a **trois sections** : un tronc commun, une section pour ceux qui ont déjà vécu la phase d'admission, une section pour les lycéens qui vont la vivre.

## Réglages du formulaire

- **Paramètres > Réponses** : « Collecter les adresses e-mail » = **Ne pas collecter**.
- **Paramètres > Réponses** : décocher « Limiter à 1 réponse » (sinon une connexion Google est exigée, ce qui identifie le répondant).
- **Paramètres > Présentation** : message de confirmation « Merci ! Vos réponses aideront à améliorer Parcoursup. »
- Ne pas activer « Afficher le lien pour envoyer une autre réponse » en classe.

## Titre

Avis sur le prototype « Parcours’app »

## Description

Merci d'avoir essayé ce prototype d'application pour suivre son dossier Parcoursup pendant la phase d'admission. Toutes les données affichées sont fictives.

Ce questionnaire est anonyme. N'indiquez ni votre nom, ni votre numéro de dossier Parcoursup, ni le nom de votre lycée, ni aucune information personnelle, y compris dans les réponses libres.

---

## Section 1 : vous

**1. Vous êtes…** *(choix unique, obligatoire — « Accéder à la section en fonction de la réponse »)*
- Lycéen(ne) en terminale → **section 3**
- Étudiant(e), j'ai utilisé Parcoursup l'an dernier → **section 2**
- Étudiant(e), j'ai utilisé Parcoursup il y a plus d'un an → **section 2**
- Parent d'un(e) candidat(e) → **section 2**
- Autre → **section 3**

---

## Section 2 : vous avez déjà vécu la phase d'admission

**2. Pendant la phase d'admission, combien de fois par jour consultiez-vous le dossier Parcoursup ?** *(choix unique, obligatoire)*
- Moins d'une fois
- 1 à 2 fois
- 3 à 5 fois
- Plus de 5 fois

**3. Avez-vous déjà raté, ou failli rater, un délai de réponse à une proposition ?** *(choix unique, obligatoire)*
- Oui, j'en ai raté un
- J'ai failli
- Non
- Je ne sais pas

**4. En une phrase, comment avez-vous vécu la phase d'admission ?** *(réponse longue, facultative)*

→ Après cette section : **section 4**

---

## Section 3 : vous allez vivre la phase d'admission

**5. Pendant la phase d'admission, combien de fois par jour pensez-vous consulter votre dossier ?** *(choix unique, obligatoire)*
- Moins d'une fois
- 1 à 2 fois
- 3 à 5 fois
- Plus de 5 fois
- Je ne sais pas

**6. Qu'est-ce qui vous inquiète le plus dans la phase d'admission ?** *(cases à cocher)*
- Rater un délai de réponse
- Ne pas comprendre où j'en suis sur les listes d'attente
- Devoir consulter le site très souvent
- Recevoir les réponses pendant les vacances ou les examens
- Autre

→ Après cette section : **section 4**

---

## Section 4 : le prototype

**7. L'application est-elle facile à comprendre ?** *(échelle linéaire de 1 à 5, obligatoire)*
- 1 = Pas du tout · 5 = Tout à fait

**7 bis. Si cette application existait, l'utiliseriez-vous ?** *(échelle linéaire de 1 à 5, obligatoire)*
- 1 = Certainement pas · 5 = Certainement

**8. Qu'est-ce qui vous paraît le plus utile ?** *(cases à cocher)*
- Voir toutes ses propositions et ses vœux en un coup d'œil
- Le compte à rebours avant la date limite de réponse
- La courbe d'évolution du rang en liste d'attente
- La comparaison avec le rang du dernier appelé l'an dernier
- Être prévenu par une notification quand le dossier change
- Rester connecté sans ressaisir son mot de passe

**8 bis. Pour être prévenu d'un changement dans votre dossier, vous préférez…** *(choix unique, obligatoire)*
- Une notification de l'application
- Un SMS
- Un mail
- Les trois
- Peu importe

**9. Qu'est-ce qui vous a manqué, ou gêné ?** *(réponse longue, facultative)*

**10. Acceptez-vous que vos réponses écrites soient citées, de façon anonyme, dans une note destinée au ministère ?** *(choix unique, obligatoire)*
- Oui
- Non
