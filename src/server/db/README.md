# Database Layer

## Overview

PostgreSQL (NeonDB) managed via Drizzle ORM. Schema defined in `src/server/db/schema.ts`. Connection pool in `src/server/db/index.ts`.

## Files

| File                        | Responsibility                                |
| --------------------------- | --------------------------------------------- |
| `src/server/db/schema.ts`   | Drizzle ORM table definitions, enums, indexes |
| `src/server/db/index.ts`    | NeonDB connection pool + drizzle instance     |
| `src/server/db/migrations/` | Versioned migration files (SQL)               |
| `drizzle.config.ts`         | ORM config: schema path, output dir, dialect  |

## Schema Diagram

```
customers (1) ──────< (N) transactions
  │                        │
  │ PK: id (text)          │ PK: id (text)
  │ UK: phone              │ FK: customer_id → customers.id
  │ UK: cnic               │ Index: (customer_id, date)
  │ total_balance (int)    │ Index: (customer_id, approval)
  │ created_at (timestamp) │ Partial UK: (customer_id) WHERE approval='PENDING'
  └────────────────────────┘
```

## Enums

| Type                | Values                            | Used In                 |
| ------------------- | --------------------------------- | ----------------------- |
| `approval_status`   | PENDING, VERIFIED, DISPUTED       | transactions.approval   |
| `settlement_status` | UNPAID, PARTIAL, SETTLED, ADVANCE | transactions.settlement |

## Migration Workflow

### Local Development

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to database (no migration files)
npm run db:push

# Apply migrations
npx drizzle-kit migrate
```

### Production

Use `npm run db:generate` to create versioned migration files, then apply via:

```bash
npx drizzle-kit migrate --config drizzle.config.ts
```

## Index Strategy

| Index                                             | Columns                              | Purpose                                                   |
| ------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `idx_transactions_customer_date`                  | customer_id, date                    | `getLedger()` chronological read, `processPayment()` FIFO |
| `idx_transactions_customer_approval`              | customer_id, approval                | `addPendingCredit()` lock check, `resolveTransaction()`   |
| `idx_transactions_pending_per_customer` (partial) | customer_id WHERE approval='PENDING' | Race condition prevention for consensus lock              |

## Critical Constraint: Consensus Lock

The partial unique index `idx_transactions_pending_per_customer` enforces at the database level that a customer can have **at most one PENDING transaction**. This complements the application-level check in `addPendingCredit()` (defense in depth).

```sql
CREATE UNIQUE INDEX idx_transactions_pending_per_customer
ON transactions (customer_id)
WHERE approval = 'PENDING';
```

When a concurrent request attempts to insert a second PENDING transaction for the same customer, PostgreSQL will reject it with a unique constraint violation. The application should catch this and return the existing PENDING transaction to the caller.

## Data Types

All monetary values use `integer` (cents). Example: Rs. 100.50 = `10050`.

| Column              | Type    | Notes                                             |
| ------------------- | ------- | ------------------------------------------------- |
| `total_balance`     | integer | Net balance: verified credits - verified payments |
| `original_amount`   | integer | Transaction amount in cents                       |
| `remaining_balance` | integer | Outstanding amount after payments in cents        |

## Transaction Isolation

All multi-step writes use `db.transaction()` (Drizzle ORM) which maps to PostgreSQL `BEGIN/COMMIT/ROLLBACK`. The default isolation level is `READ COMMITTED`.

## Environment

| Variable       | Required | Description                         |
| -------------- | -------- | ----------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL/NeonDB connection string |
