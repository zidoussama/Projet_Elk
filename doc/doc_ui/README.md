# Documentation de l’interface LogSight

Cette documentation décrit le frontend présent dans `app/Monitoring-frontend`.
Elle distingue les écrans effectivement montés dans l’application des composants
qui existent dans le code mais ne sont pas encore reliés à la navigation.

## Parcours de lecture

| Document | Contenu |
| --- | --- |
| [Architecture et démarrage](Architecture.md) | Point d’entrée React, arbre de composants, dépendances et commandes de développement |
| [Dashboard](Dashboard.md) | Sections de l’écran, données affichées, états et actions disponibles |
| [Authentification](Authentification.md) | Écran de connexion et parcours de réinitialisation du mot de passe |
| [API et données](API-et-donnees.md) | Configuration HTTP, endpoints consommés, transformations et types |
| [Styles et livraison](Styles-et-livraison.md) | CSS, responsive, accessibilité, configuration Vite et déploiement Nginx/Docker |

## Périmètre observé

- L’application rend actuellement le dashboard depuis `App.tsx`. Les composants
  `LoginPage` et `ForgetPassword` existent dans les sources, mais ne sont pas
  montés par l’application actuelle.
- Le dashboard affiche des liens d’interface vers l’import, les fichiers, la
  recherche, l’historique, Kibana et d’autres pages. Les liens sont des ancres
  HTML; leurs destinations ne sont pas implémentées dans le frontend observé.
- Cette documentation décrit le comportement du code, sans présumer de fonctions
  qui pourraient exister dans un service backend séparé.

## Sources principales

- [Application React](../../app/Monitoring-frontend/src/App.tsx)
- [Initialisation React](../../app/Monitoring-frontend/src/main.tsx)
- [Sources du frontend](../../app/Monitoring-frontend/src)
