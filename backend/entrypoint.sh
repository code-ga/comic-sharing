echo "Running database migrations..."
bun add drizzle-kit@beta --dev
bun add drizzle-orm@beta
bun add drizzle-typebox@beta
echo "Migrating database..."
bun run db:migrate
echo "Starting server..."
bun run src/index.ts