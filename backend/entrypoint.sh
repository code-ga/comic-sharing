echo "Migrating database..."
bun run db:push
echo "Starting server..."
bun run src/index.ts