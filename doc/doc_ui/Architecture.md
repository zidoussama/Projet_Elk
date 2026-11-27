# Architecture et démarrage du frontend

## Rôle

Le frontend `app/Monitoring-frontend` est une application monopage React écrite
en TypeScript. Elle est construite avec Vite. Dans l’état actuel du code, le
composant racine affiche directement le dashboard.

## Initialisation de l’application

1. `index.html` fournit l’élément `#root` et charge `/src/main.tsx`.
2. `main.tsx` crée un `QueryClient`, monte React en mode `StrictMode` et enveloppe
   l’application dans `QueryClientProvider`.
3. `App.tsx` importe les styles globaux de `App.css` et rend `Dashboard`.
4. `Dashboard` assemble l’en-tête, le contenu de supervision et le pied de page.

Il n’y a pas de routeur configuré dans ce parcours d’exécution. Bien que
`react-router-dom` soit une dépendance du projet, aucune route React Router
n’est utilisée dans les composants décrits ici.

## Structure des sources

| Chemin | Responsabilité |
| --- | --- |
| `src/main.tsx` | Montage React et fournisseur TanStack Query |
| `src/App.tsx` | Composant racine; sélectionne actuellement le dashboard |
| `src/api/axios.ts` | Instance Axios commune et options HTTP |
| `src/api/api.ts` | Fonctions de lecture des statistiques et des derniers logs |
| `src/pages/dashboard/dashboard.tsx` | Assemblage et rendu des panneaux du dashboard |
| `src/pages/dashboard/hooks/useDashboardData.ts` | Requêtes de données, actualisation automatique et manuelle |
| `src/pages/dashboard/components/appbar.tsx` | Marque, navigation et résumé du compte |
| `src/pages/dashboard/components/footer.tsx` | Marque, liens de pied de page et copyright |
| `src/pages/auth/LoginPage.tsx` | Formulaire de connexion, actuellement non monté |
| `src/pages/auth/ForgetPassword.tsx` | Dialogue de réinitialisation, appelé par LoginPage |
| `src/types/dashboard.ts` | Types des réponses API et des propriétés du dashboard |
| `src/index.css`, `src/App.css`, `src/pages/dashboard/*.css` | Styles globaux, connexion et dashboard |

Les fichiers `src/assets/hero.png`, `react.svg` et `vite.svg` sont présents dans
les sources; le rendu documenté ne les importe pas. Les icônes visibles viennent
principalement de `lucide-react`.

## Données du dashboard

Le hook `useDashboardData` lance deux requêtes indépendantes avec TanStack Query:

- `['dashboard', 'stats']` pour les statistiques;
- `['dashboard', 'latest-logs']` pour les événements récents.

Les deux requêtes se répètent toutes les 30 secondes. Le bouton Refresh relance
les deux. La gestion des erreurs et des états de chargement est décrite dans
[Dashboard](Dashboard.md).

## Développement et commandes

Depuis `app/Monitoring-frontend`:

```sh
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

Le script `build` exécute la compilation TypeScript (`tsc -b`) puis la génération
de l’application par Vite. `lint` lance ESLint.

## Dépendances d’interface notables

- React et React DOM pour l’interface.
- TanStack Query pour les requêtes et leur actualisation.
- Axios pour les appels HTTP.
- Recharts pour les graphiques du dashboard.
- Lucide React pour les icônes.
- Tailwind CSS est intégré au pipeline Vite et importé par les feuilles CSS;
  la mise en page documentée repose aussi sur des règles CSS écrites dans le
  projet.
