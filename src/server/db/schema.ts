import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/**
 * Approval status values for transaction consensus.
 * PENDING: Awaiting customer verification via WhatsApp link.
 * VERIFIED: Customer accepted the transaction.
 * DISPUTED: Customer rejected the transaction.
 */
export const approvalEnum = pgEnum("approval_status", [
  "PENDING",
  "VERIFIED",
  "DISPUTED",
]);

/**
 * Settlement status values for transaction settlement tracking.
 * UNPAID: Full credit outstanding.
 * PARTIAL: Some repayment made.
 * SETTLED: Fully paid.
 * ADVANCE: Customer overpaid (negative balance).
 */
export const settlementEnum = pgEnum("settlement_status", [
  "UNPAID",
  "PARTIAL",
  "SETTLED",
  "ADVANCE",
]);

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  address: text("address"),
  cnic: text("cnic").unique(),
  totalBalance: integer("total_balance").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .references(() => customers.id)
      .notNull(),
    date: timestamp("date").defaultNow().notNull(),
    description: text("description").notNull(),
    originalAmount: integer("original_amount").notNull(),
    remainingBalance: integer("remaining_balance").notNull(),
    type: text("type").notNull(),
    approval: approvalEnum("approval").default("PENDING").notNull(),
    settlement: settlementEnum("settlement").default("UNPAID").notNull(),
  },
  (table) => ({
    /**
     * Composite index for ledger queries: fetch all transactions for a customer sorted by date.
     * Used by getLedger() and processPayment() FIFO logic.
     */
    idxCustomerDate: index("idx_transactions_customer_date").on(
      table.customerId,
      table.date,
    ),
    /**
     * Index for approval filtering: find pending transactions for consensus lock check.
     * Used by addPendingCredit() lock check and resolveTransaction().
     */
    idxCustomerApproval: index("idx_transactions_customer_approval").on(
      table.customerId,
      table.approval,
    ),
  }),
);
