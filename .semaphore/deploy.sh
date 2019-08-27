#!/bin/bash
set -e

cd /home/deploy/terremotibot
echo DOCKER_TAG=$DOCKER_TAG > .env
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml -p $CONTAINER_NAME up -d --force-recreate --remove-orphans
exit
