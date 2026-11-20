const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
    node: process.env.ELASTICSEARCH_NODE ||
        process.env.ELASTICSEARCH_URL,
    requestTimeout: 3000
});
console.log("Elasticsearch connected...");

module.exports = elasticClient;
