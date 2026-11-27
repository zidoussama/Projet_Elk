# Écran Dashboard

## Accès et structure

`App.tsx` rend `Dashboard` comme écran initial. Le dashboard est composé de
l’en-tête (`AppBar`), du contenu principal et du pied de page (`Footer`).
Il ne dépend pas d’une route React Router.

## En-tête et navigation

L’en-tête affiche la marque LogSight, une navigation et un résumé de compte.
L’élément « Dashboard » est actif par défaut. Les autres entrées sont
« Upload », « Files », « Search », « History » et « Kibana ».

Chaque entrée pointe vers une ancre (`#upload`, `#files`, etc.). Le code du
dashboard ne contient pas les sections correspondantes; ces éléments constituent
donc des destinations d’interface, pas des écrans opérationnels reliés ici.
Les informations de compte utilisent par défaut le nom « Alex Morgan » et le
rôle « DevOps Engineer »; l’avatar est calculé à partir des initiales. Aucun
chargement du compte courant n’est effectué dans ce composant.

## En-tête de page et actualisation

Le titre présente le dashboard et son objectif de suivi. L’indicateur de statut
affiche « Updating » durant la récupération des statistiques, « Unavailable »
si cette requête est en erreur, sinon « Live data ». « Live data » reflète le
statut des statistiques, pas une connexion temps réel.

Le bouton Refresh appelle le rafraîchissement simultané des statistiques et des
derniers logs. Il est désactivé pendant une récupération des statistiques. Une
erreur de statistiques est aussi affichée dans une bannière.

## Cartes de synthèse

Quatre métriques proviennent de `/api/dashboard/stats`:

| Carte | Champ | Libellé secondaire |
| --- | --- | --- |
| Total logs indexed | `totalLogs` | Across all log indices |
| Logs today | `logsToday` | Since 00:00 UTC |
| Error logs | `errorLogs` | ERROR-level events |
| Uploaded files | `importedFiles` | All uploaded files |

Les nombres sont formatés selon la locale du navigateur. Les valeurs sont
affichées comme « Loading » pendant le chargement initial, « Unavailable » si
les statistiques sont en erreur, ou un tiret si la valeur est absente.

## Graphique « Logs per hour »

Le graphique en aire utilise `hourlyEvolution`, dont chaque entrée contient une
heure et un nombre de logs. Les heures sont affichées en heure UTC, formatées
selon la locale du navigateur. L’axe vertical utilise des suffixes `k` et `M`;
l’infobulle affiche le nombre entier formaté.

Les états affichés sont « Loading hourly activity… » pendant le chargement
initial, puis « No hourly log data available. » si le tableau est vide.
Le contrôle « Last 24 hours » est visuel: aucun gestionnaire d’événement ne lui
est associé dans le code courant.

## Répartition « Logs by level »

Le graphique en anneau et sa légende sont construits depuis `levelDistribution`.
Les niveaux connus (`INFO`, `DEBUG`, `WARNING`, `ERROR`, `CRITICAL`) ont des
couleurs dédiées; les autres reçoivent une couleur neutre. La légende présente
le pourcentage de chaque niveau et le centre du graphique donne le total.

Pendant le chargement initial, le panneau indique « Loading… ». En l’absence de
données, il indique « No data ». Le bouton à trois points est décoratif: aucune
action n’est associée.

## Tableau « Latest logs »

La liste est alimentée par les résultats récents de `/api/logs/search`. Le
frontend affiche au plus six lignes et les colonnes Date / Time, Level, Service
et Message. Les niveaux connus ont une classe de couleur dédiée; les niveaux
inconnus utilisent le style `level-other`. Les messages longs sont tronqués
visuellement.

Le tableau distingue le chargement initial, l’erreur de requête et l’absence de
résultats. « View all logs » pointe vers `#logs`, sans écran cible fourni par ce
frontend.

## Actions rapides

Les trois lignes « Upload logs », « Search logs » et « Open Kibana » pointent
respectivement vers `#upload`, `#search` et `#kibana`. Elles sont présentées
comme des raccourcis, mais le code consulté n’implémente pas les écrans ciblés.

## Pied de page

Le pied de page affiche la marque, le nom du mini-projet, un copyright statique
(2025) et les liens « Design system », « Sign out » et « Help ». Ces liens sont
des ancres HTML sans traitement spécifique dans les composants documentés.

## Comportements responsive

Les styles du dashboard réorganisent les contenus selon la largeur:

- sous 900 px, le contenu utilise des marges fixes et les deux colonnes sont
  resserrées;
- sous 680 px, les cartes de métriques passent à deux colonnes et les panneaux
  graphiques/tableau à une colonne; la navigation horizontale peut défiler;
- le tableau conserve une largeur minimale et défile horizontalement sur petit
  écran;
- sous 380 px, les marges et l’espacement du panneau de niveaux sont réduits.

Voir [Styles et livraison](Styles-et-livraison.md) pour les fichiers CSS et les
points d’accessibilité.
