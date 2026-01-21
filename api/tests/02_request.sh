curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/ -m 2 \
  | while read status; do
      echo "HTTP $status"
    done &

CID=$(docker ps -q --filter "name=demo-stack_web")
docker kill $CID

sleep 10

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/ -m 2