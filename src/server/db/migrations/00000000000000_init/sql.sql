-- Drizzle Migration: Initial Schema
-- Generated from src/server/db/schema.ts
-- Database: PostgreSQL (NeonDB)
-- Note: Enum types must be created before tables that reference them.

CREATE TYPE IF NOT EXISTS "approval_status" AS ENUM ('PENDING', 'VERIFIED', 'DISPUTED');
CREATE TYPE IF NOT EXISTS "settlement_status" AS ENUM ('UNPAID', 'PARTIAL', 'SETTLED', 'ADVANCE');

CREATE TABLE IF NOT EXISTS "customers" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "address" text,
    "cnic" text UNIQUE,
    "total_balance" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" text PRIMARY KEY NOT NULL,
    "customer_id" text NOT NULL REFERENCES "customers"("id"),
    "date" timestamp DEFAULT now() NOT NULL,
    "description" text NOT NULL,
    "original_amount" integer NOT NULL,
    "remaining_balance" integer NOT NULL,
    "type" text NOT NULL,
    "approval" "approval_status" DEFAULT 'PENDING' NOT NULL,
    "settlement" "settlement_status" DEFAULT 'UNPAID' NOT NULL
);

-- Index: Composite index for ledger queries (customer + date)
CREATE INDEX IF NOT EXISTS "idx_transactions_customer_date" ON "transactions" ("customer_id", "date");

-- Index: Approval filtering for consensus lock check
CREATE INDEX IF NOT EXISTS "idx_transactions_customer_approval" ON "transactions" ("customer_id", "approval");
