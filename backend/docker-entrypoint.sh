#!/bin/bash
set -e

echo "=== Yi Hot Monitor Backend ==="

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
until python -c "
import pymysql
pymysql.connect(
    host='${MYSQL_HOST:-mysql}',
    user='${MYSQL_USER:-root}',
    password='${MYSQL_PASSWORD:-hotspot123}',
    db='${MYSQL_DATABASE:-hotspot_db}'
)
" 2>/dev/null; do
  echo "  MySQL not ready, retrying in 2s..."
  sleep 2
done
echo "  MySQL is ready"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head
echo "  Migrations complete"

# Start server
echo "Starting server on port 3001..."
exec uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
