#!/usr/bin/env bash
# Reproduces the API-level findings in Task1_QA_Report against the public RealWorld demo.
# Creates throwaway @example.com accounts. Requires curl + node.
set -u
A=https://api.realworld.show/api
JAR=$(mktemp); U="qa$(date +%s)"
json() { node -pe "JSON.parse(require('fs').readFileSync(0)).$1"; }

echo "== #2 weak password ('a') accepted"
T=$(curl -s -c "$JAR" -b "$JAR" -X POST $A/users -H 'Content-Type: application/json' \
  -d "{\"user\":{\"username\":\"$U\",\"email\":\"$U@example.com\",\"password\":\"a\"}}" | json user.token)
echo "token: ${T:0:12}…"

echo "== #1 whitespace-only title -> empty slug"
curl -s -c "$JAR" -b "$JAR" -X POST $A/articles -H "Authorization: Token $T" -H 'Content-Type: application/json' \
  -d '{"article":{"title":"   ","description":"d","body":"b"}}' | head -c 200; echo
curl -s -o /dev/null -w "GET /articles/ -> %{http_code}\n" "$A/articles/"

echo "== #5 login email is case-sensitive"
curl -s -c "$JAR" -b "$JAR" -X POST $A/users/login -H 'Content-Type: application/json' \
  -d "{\"user\":{\"email\":\"${U^^}@EXAMPLE.COM\",\"password\":\"a\"}}"; echo

echo "== #6 whitespace-only username"
curl -s -X POST $A/users -H 'Content-Type: application/json' \
  -d "{\"user\":{\"username\":\"   \",\"email\":\"${U}ws@example.com\",\"password\":\"x\"}}" | head -c 120; echo

echo "== #3 no login throttling (10 wrong attempts)"
for i in $(seq 10); do curl -s -o /dev/null -w '%{http_code} ' -X POST $A/users/login \
  -H 'Content-Type: application/json' -d "{\"user\":{\"email\":\"$U@example.com\",\"password\":\"wrong$i\"}}"; done; echo

echo "== #10 long title error reported under 'body'"
curl -s -c "$JAR" -b "$JAR" -X POST $A/articles -H "Authorization: Token $T" -H 'Content-Type: application/json' \
  -d "{\"article\":{\"title\":\"$(head -c 5000 /dev/zero | tr '\0' a)\",\"description\":\"d\",\"body\":\"b\"}}"; echo

echo "== #11 negative pagination accepted"
curl -s "$A/articles?limit=-1&offset=-5"; echo

echo "== #12 CORS reflects arbitrary origin"
curl -sI -H 'Origin: https://evil.example' $A/articles | grep -i access-control

echo "== #8 latency"
for i in 1 2 3; do curl -s -o /dev/null -w '/articles %{time_total}s\n' "$A/articles?limit=10"; done
rm -f "$JAR"
