#!/usr/bin/env bash
# Init + seed du CouchDB local de la stack iakacockpit (recette L4).
# Reproduit le schema iakaboxlogs : base "conversations" + index Mango "idx-maincourante"
# + quelques docs realistes (dont un canal "geste" via meta.canal).
# Usage : ./init-couchdb.sh   (defaults : localhost:5984, admin/iaka-test)
set -euo pipefail

BASE="${1:-http://localhost:5984}"
U="${COUCHDB_USER:-admin}"
P="${COUCHDB_PASSWORD:-iaka-test}"
AUTH="-u ${U}:${P}"

echo "== Attente CouchDB (${BASE}) =="
for i in $(seq 1 30); do
  curl -sf "${BASE}/" >/dev/null 2>&1 && { echo "  up"; break; }
  sleep 1
done

echo "== Finalisation single-node =="
curl -sf $AUTH -X POST "${BASE}/_cluster_setup" \
  -H 'Content-Type: application/json' \
  -d '{"action":"finish_cluster"}' >/dev/null 2>&1 || echo "  (deja configure)"
for db in _users _replicator _global_changes; do
  curl -sf $AUTH -X PUT "${BASE}/${db}" >/dev/null 2>&1 || true
done

echo "== Creation base 'conversations' =="
curl -sf $AUTH -X PUT "${BASE}/conversations" >/dev/null 2>&1 || echo "  (existe deja)"

echo "== Index Mango idx-maincourante (ts, royaume, agent, conv_id) =="
curl -sf $AUTH -X POST "${BASE}/conversations/_index" \
  -H 'Content-Type: application/json' \
  -d '{"index":{"fields":["ts","royaume","agent","conv_id"]},"name":"idx-maincourante","type":"json"}' >/dev/null

echo "== Seed de docs realistes =="
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
seed_doc () {
  curl -sf $AUTH -X POST "${BASE}/conversations" \
    -H 'Content-Type: application/json' -d "$1" >/dev/null && echo "  + doc seede"
}
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"PORTEFEUILLE\",\"agent\":\"Odin\",\"conv_id\":\"demo-1\",\"role\":\"assistant\",\"content\":\"On embraye sur L4, je dispatch Gandalf.\",\"tokens\":42,\"meta\":{}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"CADRAGE\",\"agent\":\"Gandalf\",\"conv_id\":\"demo-1\",\"role\":\"system\",\"content\":\"Analyse du schema CouchDB en cours.\",\"tokens\":18,\"meta\":{}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"CADRAGE\",\"agent\":\"Gandalf\",\"conv_id\":\"demo-1\",\"role\":\"assistant\",\"content\":\"Instruction L4 fermee et verifiable.\",\"tokens\":55,\"meta\":{}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"IAKACOCKPIT\",\"agent\":\"Gimli\",\"conv_id\":\"demo-1\",\"role\":\"assistant\",\"content\":\"Delegation Gandalf -> Gimli (geste).\",\"tokens\":12,\"meta\":{\"canal\":\"geste\"}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"IAKACOCKPIT\",\"agent\":\"Legolas\",\"conv_id\":\"demo-1\",\"role\":\"user\",\"content\":\"Gate qualite L4 : PASS.\",\"tokens\":9,\"meta\":{}}"

echo "== Seed L9 : conversation 'iaka-demo' (chaine de badges iakaframe) =="
# COHERENT avec le chat preeche (src/mock/demoConversation.ts) : meme scene,
# memes agents. Illustre delegation (canal geste) / rapport / restitution verbatim.
# Le texte du rapport est CITE a l'identique dans la restitution (verbatim).
report="Cadrage L9 ferme : 3 teams embarquees (lotr, avengers, starfleet), vignettes servies en self (CSP intacte), conversation preeche coherente chat <-> main courante."
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"ACCUEIL\",\"agent\":\"Aragorn\",\"conv_id\":\"iaka-demo\",\"role\":\"assistant\",\"content\":\"Cadrage L9 : je delegue a Gandalf.\",\"tokens\":11,\"meta\":{\"canal\":\"geste\",\"from\":\"Aragorn\",\"to\":\"Gandalf\"}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"CADRAGE\",\"agent\":\"Gandalf\",\"conv_id\":\"iaka-demo\",\"role\":\"assistant\",\"content\":\"${report}\",\"tokens\":48,\"meta\":{\"kind\":\"rapport\"}}"
seed_doc "{\"ts\":\"${now}\",\"royaume\":\"ACCUEIL\",\"agent\":\"Aragorn\",\"conv_id\":\"iaka-demo\",\"role\":\"assistant\",\"content\":\"Restitution verbatim [CADRAGE][Gandalf] : ${report}\",\"tokens\":52,\"meta\":{\"kind\":\"verbatim\",\"cite\":\"Gandalf\"}}"

echo
echo "OK. Fauxton : ${BASE}/_utils  (base : conversations)"
