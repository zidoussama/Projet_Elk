# Pipeline ELK — Rapport de réalisation

**Projet :** ingestion de journaux e-commerce  
**Périmètre :** Elasticsearch, Logstash et Kibana  
**Version des images :** 9.1.4  
**Environnement :** Docker Compose — développement local  
**Date du rapport :** 11 novembre 2026

---

## 1. Synthèse

Le projet met en œuvre un pipeline ELK capable d’ingérer des journaux e-commerce aux formats **CSV** et **JSON Lines**, de les normaliser, puis de les indexer dans Elasticsearch afin de les rendre consultables dans Kibana.

La solution comprend :

- deux pipelines Logstash indépendants, spécialisés par format d’entrée ;
- un modèle d’index Elasticsearch commun aux deux formats ;
- la conversion des types et la normalisation des niveaux de journalisation ;
- la conservation des informations de traçabilité ;
- une stratégie d’identifiant stable pour limiter les doublons lors des rejouements ;
- une route dédiée aux événements rejetés dans `logs-dead-letter` ;
- un environnement reproductible fourni par Docker Compose.

Le pipeline CSV a été exécuté avec succès sur **250 événements valides**. La configuration JSON, le modèle Elasticsearch et les mécanismes de gestion des erreurs sont présents dans le dépôt et ont fait l’objet de vérifications de configuration.

> **Important :** la sécurité Elasticsearch est désactivée dans la configuration actuelle. Cette configuration est réservée au développement local et ne doit pas être déployée telle quelle en production.

## 2. Périmètre fonctionnel

| Référence | Réalisation | État |
|---|---|---|
| PEB-14 | Modèle d’index et mapping Elasticsearch | Réalisé |
| PEB-15 | Pipeline Logstash pour les fichiers CSV | Réalisé et validé |
| PEB-16 | Pipeline Logstash pour les fichiers JSON Lines | Configuré |
| PEB-17 | Gestion des erreurs de parsing via `logs-dead-letter` | Configurée |
| PEB-18 | Normalisation, enrichissement et traçabilité des événements | Réalisé |

## 3. Architecture de la solution

```text
generate_mock_logs.py
        |
        v
  Fichiers CSV / JSONL
  montés dans /logs
        |
        +--------------------+
        |                    |
        v                    v
  Pipeline csv-logs    Pipeline json-logs
        |                    |
        +---------+----------+
                  |
                  v
       Parsing et normalisation
       - conversion des types
       - conversion de la date
       - normalisation du niveau
       - enrichissement et traçabilité
       - identifiant stable
                  |
          +-------+--------+
          |                |
          v                v
    logs-ecom-*      logs-dead-letter
    événements       événements rejetés
    valides
          |
          v
       Kibana
```

### Principes de conception

1. **Séparation des flux :** les fichiers CSV et JSON Lines sont traités par deux pipelines Logstash déclarés dans `pipelines.yml`.
2. **Schéma commun :** les deux formats produisent la même structure de document Elasticsearch.
3. **Traçabilité :** chaque événement conserve `source_file` et `source_format`.
4. **Rejouabilité :** l’identifiant Elasticsearch suit le format `<source_format>-<event_id>`. Les événements identiques issus du CSV et du JSON restent donc distinguables.
5. **Paramétrage :** `ES_HOST` et `LOG_DIR` sont fournis par variables d’environnement et disposent de valeurs par défaut.
6. **Persistance de lecture :** le volume `lsdata` conserve les fichiers `sincedb` et les marqueurs de fichiers traités.

## 4. Organisation du dépôt

```text
docker/elk/
├── docker-compose.yml
├── elasticsearch/
│   └── index-template.json
├── logstash/
│   ├── config/
│   │   └── pipelines.yml
│   └── pipeline/
│       ├── csv.conf
│       └── json.conf
├── scripts/
│   └── generate_mock_logs.py
└── logs/
    └── fichiers générés localement
```

L’ancienne configuration générique `logstash/pipeline/logstash.config`, qui redirigeait tous les événements vers `logstash-*`, a été supprimée afin d’éviter son chargement simultané avec les pipelines spécialisés.

## 5. Infrastructure Docker Compose

Le fichier `docker-compose.yml` orchestre trois services :

| Service | Image | Rôle | Port exposé |
|---|---|---|---|
| Elasticsearch | `elasticsearch:9.1.4` | Stockage, recherche et agrégation | `9200` |
| Logstash | `logstash:9.1.4` | Lecture, transformation et indexation | — |
| Kibana | `kibana:9.1.4` | Exploration et visualisation | `5601` |

### Points techniques

- Elasticsearch fonctionne en mode nœud unique (`discovery.type=single-node`).
- Les données Elasticsearch sont persistées dans `esdata`.
- Les données Logstash, notamment les marqueurs `sincedb`, sont persistées dans `lsdata`.
- Elasticsearch dispose d’un healthcheck.
- Logstash et Kibana attendent qu’Elasticsearch soit déclaré sain.
- Les configurations montées dans les conteneurs sont en lecture seule.
- Le réseau Docker `elk` permet la communication entre les services.
- La mémoire JVM est fixée à 1 Go pour Elasticsearch et 512 Mo pour Logstash.

### Limitation de sécurité

`xpack.security.enabled=false` et `ELASTICSEARCH_HOSTS=http://elasticsearch:9200` sont adaptés à un environnement local uniquement. Avant tout déploiement partagé ou de production, il faudra activer la sécurité, configurer TLS, gérer les comptes de service et protéger les variables sensibles.

## 6. Modèle de données Elasticsearch

Le template `logs-ecom-template` s’applique aux index `logs-ecom-*`, avec une priorité de `200`.

| Champ | Type Elasticsearch | Utilisation |
|---|---|---|
| `@timestamp` | `date` | Date de l’événement |
| `event_id`, `user_id`, `session_id`, `order_id`, `product_id` | `keyword` | Identifiants exacts |
| `level`, `service`, `environment`, `event_type`, `status`, `currency` | `keyword` | Filtres et agrégations |
| `quantity` | `integer` | Quantité commandée |
| `amount` | `scaled_float` | Montant avec facteur `100` |
| `ip` | `ip` | Adresse IP exploitable par Elasticsearch |
| `location` | `geo_point` | Coordonnées géographiques |
| `tags` | `keyword` | Recherche et agrégation par étiquette |
| `message` | `text` + `raw` | Recherche textuelle et valeur exacte |
| `source_file`, `source_format`, `upload_id` | `keyword` | Traçabilité de l’ingestion |

Le cycle de vie des index (ILM), le nombre de réplicas adapté à la production et la politique de rétention sont volontairement reportés à la phase de déploiement.

## 7. Génération des données de test

Le script `scripts/generate_mock_logs.py` repose uniquement sur la bibliothèque standard Python et génère :

- `logs.csv` : 250 événements valides au format CSV ;
- `logs.jsonl` : les mêmes événements au format JSON Lines ;
- `malformed_logs.jsonl` : quatre lignes invalides destinées à tester la gestion des erreurs.

Commande utilisée depuis `docker/elk` :

```powershell
python scripts\generate_mock_logs.py --count 250 --out-dir logs --seed 42
```

Les données couvrent notamment les champs suivants : date, identifiant d’événement, niveau, service, environnement, type d’événement, utilisateurs, sessions, commandes, produits, quantité, montant, devise, statut, adresse IP, pays, coordonnées géographiques, tags et message.

## 8. Traitement Logstash

### 8.1 Pipeline CSV

Le pipeline `csv.conf` :

1. lit les fichiers `*.csv` en mode `read` ;
2. associe les colonnes CSV aux champs du document ;
3. ignore la ligne d’en-tête ;
4. convertit la date en `@timestamp` ;
5. convertit les champs numériques ;
6. transforme `geo_lat` et `geo_lon` en `location.lat` et `location.lon` ;
7. transforme les tags séparés par `|` en tableau ;
8. normalise le niveau de journalisation ;
9. ajoute les informations de source ;
10. indexe l’événement dans `logs-ecom-YYYY.MM.dd`.

### 8.2 Pipeline JSON Lines

Le pipeline `json.conf` applique la même logique métier aux fichiers `*.jsonl`. L’entrée utilise le codec `json`, adapté au mode de lecture fichier utilisé par Logstash. Les différences avec le CSV se limitent à l’absence du filtre CSV et au décodage de l’objet JSON.

### 8.3 Normalisation des niveaux

Les niveaux sont convertis en majuscules et harmonisés selon la règle suivante :

| Valeur source | Valeur normalisée |
|---|---|
| `WARN` | `WARNING` |
| `ERR` | `ERROR` |
| `FATAL` | `CRITICAL` |
| Valeur inconnue | `INFO`, avec le tag `level_normalized` |

Les valeurs finales autorisées sont `DEBUG`, `INFO`, `WARNING`, `ERROR` et `CRITICAL`.

### 8.4 Gestion des erreurs

Les événements portant un tag de parsing (`_csvparsefailure`, `_jsonparsefailure` ou `_dateparsefailure`) sont orientés vers l’index `logs-dead-letter`. Cette séparation permet d’isoler les données invalides sans interrompre l’ingestion des événements valides.

## 9. Procédure d’exploitation locale

### 9.1 Démarrage

```powershell
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail 40 logstash
```

Le premier contrôle vérifie la configuration Compose. Le deuxième démarre les services. Les deux dernières commandes permettent de vérifier l’état des conteneurs et le démarrage des pipelines Logstash.

### 9.2 Validation de la syntaxe Logstash

```powershell
docker compose run --rm --no-deps logstash `
  logstash -f /usr/share/logstash/pipeline/csv.conf `
  --config.test_and_exit --path.data /tmp/lstest

docker compose run --rm --no-deps logstash `
  logstash -f /usr/share/logstash/pipeline/json.conf `
  --config.test_and_exit --path.data /tmp/lstest2
```

Résultat constaté pour `csv.conf` : **Configuration OK**.

### 9.3 Rejouer les fichiers

Logstash mémorise les fichiers déjà lus. Pour rejouer complètement les fichiers après une modification de configuration :

```powershell
docker compose stop logstash
docker compose run --rm --no-deps --entrypoint sh logstash `
  -c "rm -f /usr/share/logstash/data/sincedb_* /usr/share/logstash/data/completed_*"
docker compose up -d logstash
```

La suppression des marqueurs doit être effectuée lorsque Logstash est arrêté ; sinon, ils peuvent être recréés lors de l’arrêt du service.

### 9.4 Requêtes de contrôle dans Kibana Dev Tools

```http
GET logs-ecom-*/_count
GET logs-ecom-*/_search?size=1
GET logs-dead-letter/_search
GET _cat/indices/logs-*?v
```

Agrégation par format et par niveau :

```http
GET logs-ecom-*/_search
{
  "size": 0,
  "aggs": {
    "by_format": { "terms": { "field": "source_format" } },
    "by_level": { "terms": { "field": "level" } }
  }
}
```

## 10. Résultats et éléments de preuve

Le pipeline CSV a produit **250 documents valides** dans les index `logs-ecom-*`.

Exemple de document indexé :

```json
{
  "_index": "logs-ecom-2026.11.10",
  "_id": "csv-e067ae15-b6b7-4ea1-8b50-843e83facd68",
  "_source": {
    "tags": ["ecommerce", "add_to_cart", "warn"],
    "@timestamp": "2026-11-10T09:03:00.000Z",
    "environment": "staging",
    "amount": 438.66,
    "country": "Italy",
    "source_file": "/logs/logs.csv",
    "source_format": "csv",
    "location": {
      "lon": "12.503969034681008",
      "lat": "41.94086566727578"
    },
    "level": "WARNING",
    "service": "order-service",
    "event_type": "add_to_cart",
    "event_id": "e067ae15-b6b7-4ea1-8b50-843e83facd68",
    "product_id": "PRD-1005"
  }
}
```

### Contrôles confirmés

- `WARN` a été normalisé en `WARNING`.
- Les tags sont stockés sous forme de tableau.
- `source_file`, `source_format`, `event_id` et `location` sont présents.
- La date d’origine est convertie en `@timestamp`.
- La répartition des niveaux est : `INFO` 88, `WARNING` 67, `ERROR` 59 et `DEBUG` 36.
- Le total de l’agrégation est de 250 événements.
- Aucun niveau `WARN` ne subsiste dans les données validées.

## 11. Incidents rencontrés et corrections

| # | Incident | Cause | Correction |
|---:|---|---|---|
| 1 | `docker compose up` refusait de démarrer | Le volume `lsdata` était utilisé sans être déclaré | Déclaration de `lsdata` dans `volumes` |
| 2 | Les services démarraient avant Elasticsearch | `depends_on` simple ne vérifie pas la disponibilité applicative | Ajout d’un healthcheck et de `condition: service_healthy` |
| 3 | Identifiants Kibana inutiles | La sécurité Elasticsearch est désactivée en local | Suppression des variables d’identification inutiles |
| 4 | Aucun document indexé | Option `tag_on_failure` non supportée par le filtre CSV | Suppression de l’option ; le tag de parsing est généré automatiquement |
| 5 | Erreur de structure dans le pipeline JSON | Structure incorrecte de `json.conf` | Correction de la configuration |
| 6 | Un seul format était indexé après correction | Les fichiers étaient déjà mémorisés par `sincedb` | Arrêt de Logstash, suppression des marqueurs, redémarrage |
| 7 | Aucun événement JSON n’était lu | Le codec `json_lines` était incompatible avec le mode `read` utilisé | Utilisation du codec `json` |
| 8 | Risque de collision entre CSV et JSON | Les deux fichiers contiennent les mêmes `event_id` | Identifiant Elasticsearch préfixé par `source_format` |

## 12. Recommandations pour la suite

Avant un déploiement hors environnement local, il est recommandé de :

1. activer la sécurité Elasticsearch et Kibana ;
2. configurer TLS et des comptes de service à privilèges minimaux ;
3. définir une politique ILM et une durée de rétention ;
4. ajouter des tests automatisés de bout en bout pour les flux CSV, JSON et dead-letter ;
5. vérifier explicitement le nombre d’événements rejetés dans `logs-dead-letter` ;
6. externaliser les secrets et les paramètres d’environnement ;
7. documenter la procédure de sauvegarde et de restauration du volume Elasticsearch ;
8. mettre en place une supervision des erreurs Logstash et de la capacité disque.

## 13. Conclusion

La solution fournit une base ELK cohérente, reproductible et adaptée à l’ingestion locale de journaux e-commerce. Le flux CSV est opérationnel et validé sur 250 événements. Le flux JSON Lines repose sur le même modèle de données et dispose d’une configuration dédiée. La normalisation, la traçabilité, l’identification stable et l’isolement des erreurs sont intégrés au pipeline.

Les travaux restants concernent principalement le durcissement de la sécurité, la définition des politiques d’exploitation et l’automatisation des tests de validation pour préparer un usage partagé ou de production.
