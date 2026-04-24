import { pgTable, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const approvalEnum = pgEnum('approval_status', ['PENDING', 'VERIFIED', 'DISPUTED']);
export const settlementEnum = pgEnum('settlement_status', ['UNPAID', 'PARTIAL', 'SETTLED', 'ADVANCE']);

export const customers = pgTable('customers', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    address: text('address'),
    cnic: text('cnic').unique(),
    totalBalance: integer('total_balance').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
    id: text('id').primaryKey(),
    customerId: text('customer_id').references(() => customers.id).notNull(),
    date: timestamp('date').defaultNow().notNull(),
    description: text('description').notNull(),
    originalAmount: integer('original_amount').notNull(),
    remainingBalance: integer('remaining_balance').notNull(),
    type: text('type').notNull(), // 'CREDIT' | 'PAYMENT'
    approval: approvalEnum('approval').default('PENDING').notNull(),
    settlement: settlementEnum('settlement').default('UNPAID').notNull(),
});