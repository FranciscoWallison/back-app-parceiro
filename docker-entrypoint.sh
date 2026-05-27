#!/bin/sh
set -e

echo "▶ Running Prisma migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "▶ Starting app (RUN_SEED=${RUN_SEED:-false})..."
exec "$@"
