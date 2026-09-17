# PostgreSQL / Prisma migration

The files in this directory are a code-only migration artifact. Creating them did not connect to, migrate, seed, truncate, or otherwise modify MongoDB or PostgreSQL.

## What is ready

- `schema.prisma` contains the 139 Mongoose-backed runtime models as PostgreSQL Prisma models.
- IDs are `String @id @default(cuid())`, preserving string IDs for API and frontend compatibility.
- Nested/flexible MongoDB objects are represented as `Json`; scalar arrays remain PostgreSQL arrays.
- Singular top-level `ref` values have explicit Prisma relations and PostgreSQL foreign keys while retaining their existing string-ID columns. Nested and array references remain JSON/string arrays to preserve API compatibility; `RELATION_MIGRATION.md` inventories both categories.
- Runtime modules in `models/` are Prisma-backed repositories. Original Mongoose schemas are isolated in `legacy-mongoose-models/` solely for audit and later data mapping.
- `migrations/00000000000000_init/migration.sql` was generated with `prisma migrate diff --from-empty`; it has not been applied.

## Safe code-generation commands

These commands do not modify a database:

```bash
npm run prisma:schema
npm run prisma:validate
npm run prisma:generate
```

`prisma:validate` and `prisma:generate` require `DATABASE_URL` to be present, but neither command connects to that database.

## Database-changing commands

Run these only after the schema, relation policies, and converted controllers have been reviewed:

```bash
# Local/Neon development
npm run prisma:migrate:dev -- --name init

# VPS production deployment
npm run prisma:migrate:deploy
```

Never run `prisma db push` against the existing production database as a shortcut.
