#!/bin/bash
set -e

SERVICE="demo-stack_web"
URL="http://localhost:8080/"
DURATION=15
FAIL=0

echo "Starting request loop..."

(
  end=$((SECONDS + DURATION))
  while [ $SECONDS -lt $end ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 2 "$URL" || echo "000")
    echo "HTTP $STATUS"

    if [ "$STATUS" != "200" ]; then
      FAIL=1
    fi

    sleep 1
  done
) &

LOOP_PID=$!

sleep 3

CID=$(docker ps --filter "name=${SERVICE}" -q | head -n 1)
echo "Killing container $CID"
docker kill "$CID"

wait $LOOP_PID

echo "Verifying service recovery..."
RUNNING=$(docker service ls \
  --filter "name=${SERVICE}" \
  --format "{{.Replicas}}" | awk -F/ '{print $1}')

if [ "$FAIL" -eq 0 ] && [ "$RUNNING" -ge 1 ]; then
  echo "PASS: Requests succeeded during replica restart"
  exit 0
else
  echo "FAIL: Request failure or service did not recover"
  exit 1
fi