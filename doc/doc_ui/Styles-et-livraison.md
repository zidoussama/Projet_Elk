# Styles, accessibilité et livraison

## Feuilles de style

| Fichier | Responsabilité |
| --- | --- |
| `src/index.css` | Police, couleurs de base, dimensions globales et héritage typographique des boutons/champs |
| `src/App.css` | Import de Tailwind et styles de connexion/réinitialisation |
| `src/pages/dashboard/dashboard.css` | Grille du dashboard, cartes, graphiques, tableau et responsive |
| `src/pages/dashboard/components/shell.css` | Barre de navigation, marque, compte et pied de page |

Tailwind CSS est importé dans `App.css` et `shell.css`. La présentation du
dashboard et de l’authentification comporte également des règles CSS locales
classiques.

## Responsive

Les écrans de connexion et dashboard adaptent leur mise en page par media
queries. Sur la connexion, sous 900 px la colonne de présentation est réduite;
sous 700 px les panneaux s’empilent et le graphique de présentation est masqué.
Le dashboard empile ses panneaux sous 680 px et permet le défilement horizontal
de la navigation et du tableau. Les détails de l’écran sont dans
[Dashboard](Dashboard.md).

## Accessibilité visible dans le code

- Les formulaires associent les libellés à leurs champs et utilisent des types
  HTML adaptés (`email`, `password`) et des attributs d’autocomplétion.
- Les erreurs utilisent `role="alert"` et les confirmations `role="status"`.
- La navigation et les sections possèdent des libellés accessibles; l’élément
  actif du menu expose `aria-current="page"`.
- Le graphique de présentation de connexion possède des textes alternatifs SVG.
- Le dialogue de réinitialisation annonce son titre et sa description avec des
  attributs ARIA.

## Configuration Vite

`vite.config.ts` active les plugins React et Tailwind. Le serveur de
développement proxifie les requêtes `/api` vers `http://localhost:3000` et
applique `changeOrigin`.

## Construction Docker et Nginx

Le `dockerfile` utilise deux étapes:

1. l’image `node:24-alpine` installe les dépendances puis exécute
   `npm run build`;
2. l’image `nginx:alpine` sert le contenu du répertoire `dist` sur le port 80.

`nginx.conf` sert `index.html` pour les chemins non trouvés afin de permettre
le fallback SPA. Cette configuration ne contient pas de bloc `location /api`
ni de proxy vers le backend. Pour que les appels frontend `/api/...` atteignent
le service en production, un proxy API doit donc être fourni par une autre
couche d’infrastructure ou ajouté à la configuration de déploiement.

## Configuration TypeScript et qualité

- `tsconfig.json` référence les configurations applicative et Node.
- `tsconfig.app.json` couvre `src`, active le JSX React et les contrôles
  `noUnusedLocals`, `noUnusedParameters` et `noFallthroughCasesInSwitch`.
- `eslint.config.js` applique les règles JavaScript recommandées, TypeScript,
  React Hooks et React Fast Refresh, en ignorant `dist`.
- Les commandes de build et lint sont déclarées dans `package.json`.

Le fichier `.env` local est exclu de l’image de construction par `.dockerignore`;
aucune valeur de configuration locale n’est reproduite dans cette documentation.
