import { describe, it, expect } from 'vitest';
import * as schema from './schema';

// --- Internal Drizzle runtime introspection ---
// Column metadata is exposed through public readonly fields on each column
// (primary, notNull, isUnique, hasDefault, default, name, dataType,
// columnType, enumValues). Index and foreign-key metadata are not exposed on
// the public type surface and live behind well-known runtime symbols, so we
// reach them through a narrow, `any`-free `Record<symbol, unknown>` view.
const EXTRA_CONFIG_COLUMNS = Symbol.for('drizzle:ExtraConfigColumns');
const EXTRA_CONFIG_BUILDER = Symbol.for('drizzle:ExtraConfigBuilder');
const PG_INLINE_FOREIGN_KEYS = Symbol.for('drizzle:PgInlineForeignKeys');

const asSymbolRecord = (table: unknown): Record<symbol, unknown> =>
  table as unknown as Record<symbol, unknown>;

interface IndexConfig {
  name: string;
  columns: Array<{ name?: string; keyAsName: boolean }>;
  unique: boolean;
  only: boolean;
  method: string;
}

interface IndexBuilder {
  config: IndexConfig;
}

interface ExtraConfigColumn {
  defaultConfig: unknown;
  indexConfig: unknown;
  name: string;
  columnType: string;
  keyAsName: boolean;
}

interface ForeignKeyRef {
  columns: Array<{ name?: string; table: unknown }>;
  foreignColumns: Array<{ name?: string; table: unknown }>;
  foreignTable: unknown;
}

interface ForeignKey {
  reference: () => ForeignKeyRef;
}

/**
 * Resolves the composite indexes declared via the `(table) => ({ ... })`
 * third argument of `pgTable`. The public column objects lack the
 * `defaultConfig` field that `index().on()` needs, so we feed the internal
 * `ExtraConfigColumns` copies (which carry it) into the original builder.
 */
function getTransactionIndexes(): Record<string, IndexBuilder> {
  const table = asSymbolRecord(schema.transactions);
  const columns = table[EXTRA_CONFIG_COLUMNS] as Record<string, ExtraConfigColumn>;
  const build = table[EXTRA_CONFIG_BUILDER] as (
    self: Record<string, ExtraConfigColumn>,
  ) => Record<string, IndexBuilder>;
  const self: Record<string, ExtraConfigColumn> = {
    customerId: columns.customerId,
    date: columns.date,
    approval: columns.approval,
  };
  return build(self);
}

describe('approvalEnum', () => {
  it('exposes exactly the expected approval statuses', () => {
    expect(schema.approvalEnum.enumValues).toEqual([
      'PENDING',
      'VERIFIED',
      'DISPUTED',
    ]);
  });

  it('registers the database enum type as approval_status', () => {
    expect(schema.approvalEnum.enumName).toBe('approval_status');
  });
});

describe('settlementEnum', () => {
  it('exposes exactly the expected settlement statuses', () => {
    expect(schema.settlementEnum.enumValues).toEqual([
      'UNPAID',
      'PARTIAL',
      'SETTLED',
      'ADVANCE',
    ]);
  });

  it('registers the database enum type as settlement_status', () => {
    expect(schema.settlementEnum.enumName).toBe('settlement_status');
  });
});

describe('customers table', () => {
  const c = schema.customers;

  it('is backed by the "customers" table', () => {
    expect(asSymbolRecord(c)[Symbol.for('drizzle:Name')]).toBe('customers');
  });

  it('defines id as a text primary key', () => {
    expect(c.id.name).toBe('id');
    expect(c.id.columnType).toBe('PgText');
    expect(c.id.dataType).toBe('string');
    expect(c.id.primary).toBe(true);
    expect(c.id.notNull).toBe(true);
    expect(c.id.isUnique).toBe(false);
    expect(c.id.hasDefault).toBe(false);
  });

  it('defines name as text not null', () => {
    expect(c.name.name).toBe('name');
    expect(c.name.columnType).toBe('PgText');
    expect(c.name.notNull).toBe(true);
    expect(c.name.hasDefault).toBe(false);
  });

  it('defines phone as text, not null, and unique', () => {
    expect(c.phone.name).toBe('phone');
    expect(c.phone.columnType).toBe('PgText');
    expect(c.phone.notNull).toBe(true);
    expect(c.phone.isUnique).toBe(true);
    expect(c.phone.hasDefault).toBe(false);
  });

  it('defines address as nullable text with no default', () => {
    expect(c.address.name).toBe('address');
    expect(c.address.columnType).toBe('PgText');
    expect(c.address.notNull).toBe(false);
    expect(c.address.isUnique).toBe(false);
    expect(c.address.hasDefault).toBe(false);
  });

  it('defines cnic as unique and nullable', () => {
    expect(c.cnic.name).toBe('cnic');
    expect(c.cnic.columnType).toBe('PgText');
    expect(c.cnic.notNull).toBe(false);
    expect(c.cnic.isUnique).toBe(true);
  });

  it('defines total_balance with a default of 0', () => {
    expect(c.totalBalance.name).toBe('total_balance');
    expect(c.totalBalance.columnType).toBe('PgInteger');
    expect(c.totalBalance.dataType).toBe('number');
    expect(c.totalBalance.hasDefault).toBe(true);
    expect(c.totalBalance.default).toBe(0);
  });

  it('defines created_at with defaultNow', () => {
    expect(c.createdAt.name).toBe('created_at');
    expect(c.createdAt.columnType).toBe('PgTimestamp');
    expect(c.createdAt.dataType).toBe('date');
    expect(c.createdAt.hasDefault).toBe(true);
  });
});

describe('transactions table', () => {
  const t = schema.transactions;

  it('is backed by the "transactions" table', () => {
    expect(asSymbolRecord(t)[Symbol.for('drizzle:Name')]).toBe('transactions');
  });

  it('defines id as a text primary key', () => {
    expect(t.id.name).toBe('id');
    expect(t.id.columnType).toBe('PgText');
    expect(t.id.primary).toBe(true);
    expect(t.id.notNull).toBe(true);
  });

  it('defines customerId as not null text referencing customers.id', () => {
    expect(t.customerId.name).toBe('customer_id');
    expect(t.customerId.columnType).toBe('PgText');
    expect(t.customerId.notNull).toBe(true);
    expect(t.customerId.hasDefault).toBe(false);

    const fks = asSymbolRecord(t)[PG_INLINE_FOREIGN_KEYS] as ForeignKey[];
    expect(fks).toBeDefined();
    expect(fks.length).toBe(1);
    const ref = fks[0].reference();
    expect(ref.columns.map((col) => col.name)).toEqual(['customer_id']);
    expect(ref.foreignColumns.map((col) => col.name)).toEqual(['id']);
    expect(ref.foreignTable).toBe(schema.customers);
  });

  it('defines date as a not null timestamp defaulting to now()', () => {
    expect(t.date.name).toBe('date');
    expect(t.date.columnType).toBe('PgTimestamp');
    expect(t.date.notNull).toBe(true);
    expect(t.date.hasDefault).toBe(true);
  });

  it('defines description and type as not null text', () => {
    expect(t.description.name).toBe('description');
    expect(t.description.columnType).toBe('PgText');
    expect(t.description.notNull).toBe(true);
    expect(t.type.name).toBe('type');
    expect(t.type.columnType).toBe('PgText');
    expect(t.type.notNull).toBe(true);
  });

  it('defines originalAmount and remainingBalance as not null integers', () => {
    expect(t.originalAmount.name).toBe('original_amount');
    expect(t.originalAmount.columnType).toBe('PgInteger');
    expect(t.originalAmount.dataType).toBe('number');
    expect(t.originalAmount.notNull).toBe(true);
    expect(t.remainingBalance.name).toBe('remaining_balance');
    expect(t.remainingBalance.columnType).toBe('PgInteger');
    expect(t.remainingBalance.notNull).toBe(true);
  });

  it('defines approval as an enum defaulting to PENDING (not null)', () => {
    expect(t.approval.name).toBe('approval');
    expect(t.approval.columnType).toBe('PgEnumColumn');
    expect(t.approval.notNull).toBe(true);
    expect(t.approval.hasDefault).toBe(true);
    expect(t.approval.default).toBe('PENDING');
    expect(t.approval.enumValues).toEqual(['PENDING', 'VERIFIED', 'DISPUTED']);
  });

  it('defines settlement as an enum defaulting to UNPAID (not null)', () => {
    expect(t.settlement.name).toBe('settlement');
    expect(t.settlement.columnType).toBe('PgEnumColumn');
    expect(t.settlement.notNull).toBe(true);
    expect(t.settlement.hasDefault).toBe(true);
    expect(t.settlement.default).toBe('UNPAID');
    expect(t.settlement.enumValues).toEqual(['UNPAID', 'PARTIAL', 'SETTLED', 'ADVANCE']);
  });
});

describe('transactions composite indexes', () => {
  const indexes = getTransactionIndexes();

  it('defines idx_transactions_customer_date on (customer_id, date)', () => {
    const idx = indexes.idxCustomerDate;
    expect(idx).toBeDefined();
    expect(idx.config.name).toBe('idx_transactions_customer_date');
    expect(idx.config.columns.map((col) => col.name)).toEqual([
      'customer_id',
      'date',
    ]);
    expect(idx.config.unique).toBe(false);
  });

  it('defines idx_transactions_customer_approval on (customer_id, approval)', () => {
    const idx = indexes.idxCustomerApproval;
    expect(idx).toBeDefined();
    expect(idx.config.name).toBe('idx_transactions_customer_approval');
    expect(idx.config.columns.map((col) => col.name)).toEqual([
      'customer_id',
      'approval',
    ]);
    expect(idx.config.unique).toBe(false);
  });
});
