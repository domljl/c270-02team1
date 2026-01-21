## Docker Swarm Orchestration Demo

### Prerequisites
- Docker installed
- Docker Swarm initialized

1. Initialize Docker Swarm

   docker swarm init

2. Deploy the stack

   docker stack deploy -c infra/docker-compose.yml demo-stack

3. Verify replicas

   docker service ls
   docker service ps demo-stack_web

## Self-Healing Demo

1. Kill a running task

   docker ps
   docker kill <container_id>

2. Observe Swarm replacing the task

   docker service ps demo-stack_web

## Rolling Update (Optional)

1. Update service image

   docker service update --image nginx:alpine demo-stack_web

2. Observe rolling update

   docker service ps demo-stack_web

## Test Cases

### Test Case 1: Service scales to N replicas

Script:
  tests/scale.sh

Expected result:
  PASS: Service scaled to 4 replicas

Copy code

### Test Case 2: Requests succeed during replica restart

Script:
  tests/recovery.sh

Expected result:
  PASS: Requests succeeded during replica restart