## Docker Swarm Orchestration Demo

### Prerequisites
- Docker installed
- Docker Swarm initialized

1. Initialize Docker Swarm

   docker swarm init

2. Deploy the stack

   docker stack deploy -c infra/docker-compose.yml demo-stack_web

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

Command:
  docker service scale demo-stack_web=5

Expected result:
  docker service ps demo-stack_web - Shows 5 running replicas

Copy code

### Test Case 2: Requests succeed during replica restart

Command:
  while true; do curl -s localhost:8080 || echo FAIL; sleep 1; done

Action:
  docker kill <container_id>

Expected result:
  No failed requests while Swarm replaces the task