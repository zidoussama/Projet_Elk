# API et modèle de données du frontend

## Client HTTP

`src/api/axios.ts` définit une instance Axios commune avec:

- `baseURL: '/api'`;
- `withCredentials: true` pour inclure les credentials navigateur;
- `Content-Type: application/json`;
- un délai maximal de 10 secondes.

Le frontend utilise ainsi des chemins relatifs à la même origine. En
développement, Vite transmet `/api` à `http://localhost:3000` (voir
[Styles et livraison](Styles-et-livraison.md)). La configuration Nginx de
production fournie ne définit pas de proxy API.

## Endpoints consommés par le dashboard

### `GET /api/dashboard/stats`

Appelé par `getDashboardStats()`. Le résultat attendu est `DashboardStatsResponse`:

| Propriété | Type | Utilisation |
| --- | --- | --- |
| `totalLogs` | `number` | Total de logs indexés |
| `logsToday` | `number` | Logs du jour |
| `errorLogs` | `number` | Carte des erreurs |
| `criticalLogs` | `number` | Déclaré dans le type, non affiché directement |
| `errorCriticalLogs` | `number` | Déclaré dans le type, non affiché directement |
| `importedFiles` | `number` | Carte des fichiers importés |
| `hourlyEvolution` | tableau de `{ hour: string \| null; count: number }` | Série temporelle |
| `levelDistribution` | tableau de `{ level: string; count: number }` | Diagramme par niveau |

### `GET /api/logs/search?page=1&sort=desc`

Appelé par `getLatestDashboardLogs()`. Le frontend attend une réponse
`DashboardLogSearchResponse` contenant `page`, `size`, `total` et `results`.
Chaque résultat peut fournir `@timestamp` ou `timestamp`, ainsi que `level`,
`service` et `message`.

Le frontend ne demande pas explicitement une taille de page. Il prend les six
premiers éléments de `results`. Pour les champs facultatifs absents, il affiche
`UNKNOWN` pour le niveau, un tiret pour le service ou le message, et un tiret
pour un timestamp absent.

Les timestamps valides sont rendus en heure UTC sous la forme
`HH:mm:ss.SSS`. Si la date est invalide, la chaîne originale est conservée.

## Endpoints consommés par l’authentification

Ces appels sont présents dans `LoginPage` et `ForgetPassword`, non dans le
dashboard actuellement monté:

| Méthode et chemin | Données envoyées | Appelé par |
| --- | --- | --- |
| `POST /api/auth/sign-in/email` | `email`, `password`, `rememberMe` | Connexion |
| `POST /api/auth/request-password-reset` | `email`, `redirectTo` | Demande de réinitialisation |
| `POST /api/auth/reset-password` | `token`, `newPassword` | Enregistrement du nouveau mot de passe |

Les erreurs sont présentées à l’utilisateur à partir de `message` ou `error`
de la réponse si disponibles, avec un texte de repli.

## Cache et actualisation

TanStack Query utilise les clés `['dashboard', 'stats']` et
`['dashboard', 'latest-logs']`. Chaque requête est relancée toutes les 30
secondes. Le bouton Refresh appelle `refetch()` sur les deux requêtes en
parallèle. L’état d’erreur est conservé séparément pour les statistiques et
les logs afin que l’échec d’une requête puisse être affiché dans sa section.

## Types

Les types décrits ci-dessus et les modèles de présentation (`DashboardMetric`,
`DashboardLogRecord`, `DashboardLevelSummary`, `DashboardNavItem`) sont définis
dans [dashboard.ts](../../app/Monitoring-frontend/src/types/dashboard.ts).
Ils représentent les formes attendues et utilisées côté frontend; ils ne
constituent pas à eux seuls une validation du JSON reçu à l’exécution.
