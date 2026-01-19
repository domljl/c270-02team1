#!/bin/bash
TARGET=4
docker service scale demo-stack_web=$TARGET

sleep 5

RUNNING=$(docker service ps demo-stack_web --filter "desired-state=running" -q | wc -l)

if [ "$RUNNING" -eq "$TARGET" ]; then
  echo "PASS: Service scaled to $TARGET replicas"
  exit 0
else
  echo "FAIL: Expected $TARGET replicas, found $RUNNING"
  exit 1
fi