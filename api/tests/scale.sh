#!/bin/bash
set -e

SERVICE="demo-stack_web"
TARGET=4
TIMEOUT=30

docker service scale ${SERVICE}=${TARGET}

echo "Waiting for service to scale to ${TARGET} replicas..."

for i in $(seq 1 $TIMEOUT); do
  REPLICAS=$(docker service ls \
    --filter "name=${SERVICE}" \
    --format "{{.Replicas}}" | awk -F/ '{print $1}')

  if [ "$REPLICAS" -eq "$TARGET" ]; then
    echo "PASS: Service scaled to $TARGET replicas"
    exit 0
  fi

  sleep 1
done

echo "FAIL: Service did not reach $TARGET replicas within ${TIMEOUT}s"
exit 1