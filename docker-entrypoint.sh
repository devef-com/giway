#!/bin/sh
set -e

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  if npx drizzle-kit migrate; then
    echo "Database migrations completed successfully"
  else
    echo "Warning: Database migrations failed or were skipped. This may be expected if migrations were already applied."
  fi
fi

# Execute the main command
exec "$@"
