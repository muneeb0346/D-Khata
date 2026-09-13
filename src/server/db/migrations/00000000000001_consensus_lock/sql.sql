-- Drizzle Migration: Consensus Lock Partial Unique Index
-- Prevents race conditions when multiple requests try to add credit
-- while a PENDING transaction already exists for a customer.
-- This index enforces at the database level what addPendingCredit()
-- checks in application logic (defense in depth).

CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_pending_per_customer"
ON "transactions" ("customer_id")
WHERE "approval" = 'PENDING';
