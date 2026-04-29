echo "Migrating database..."
bun run db:migrate
echo "Starting server..."
bun run src/index.ts