#!/bin/sh
set -e

npm run prisma:generate

if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npm run prisma:deploy
else
  echo "No Prisma migrations found, skipping prisma migrate deploy."
fi

exec npm run start:prod
