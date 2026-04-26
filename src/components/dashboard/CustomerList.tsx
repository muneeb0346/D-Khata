import React, { useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import styles from './CustomerList.module.css';
import { Customer } from '@/types';

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onSelectCustomer: (id: string) => void;
}

export const CustomerList = React.memo(function CustomerList({ customers, isLoading, onSelectCustomer }: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'debt' | 'advance' | null>(null);

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        const balance = customer.totalBalance ?? 0;

        if (balance > 0) {
          acc.debt += balance;
        } else if (balance < 0) {
          acc.advance += Math.abs(balance);
        }

        return acc;
      },
      { debt: 0, advance: 0 }
    );
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const searchFiltered = !searchTerm.trim()
      ? customers
      : customers.filter(c => {
        const lower = searchTerm.toLowerCase();
        return (
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.includes(searchTerm)) ||
          (c.cnic && c.cnic.includes(searchTerm))
        );
      });

    if (!balanceFilter) return searchFiltered;

    if (balanceFilter === 'debt') {
      return searchFiltered.filter((c) => (c.totalBalance ?? 0) > 0);
    }

    return searchFiltered.filter((c) => (c.totalBalance ?? 0) <= 0);
  }, [balanceFilter, customers, searchTerm]);

  const handleFilterToggle = (filter: 'debt' | 'advance') => {
    setBalanceFilter((current) => (current === filter ? null : filter));
  };

  const hasAnyCustomers = customers.length > 0;

  const emptyMessage = !hasAnyCustomers
    ? 'No customers yet. Add one to get started!'
    : balanceFilter
      ? `No ${balanceFilter} customers match your search.`
      : 'No customers match your search.';

  return (
    <section className={styles.listContainer} aria-label="Customer list" aria-live="polite">
      <h2 className={styles.title}>Your Customers</h2>

      <section className={styles.summary} aria-label="Customer balance summary">
        <button
          type="button"
          className={`${styles.summaryCard} ${styles.debtCard} ${balanceFilter === 'debt' ? styles.summaryCardActive : ''}`}
          onClick={() => handleFilterToggle('debt')}
          aria-pressed={balanceFilter === 'debt'}
          aria-label="Filter customers with outstanding debt"
        >
          <span className={styles.summaryLabel}>Total Debt</span>
          <strong className={`${styles.summaryValue} ${styles.debt}`}>Rs. {totals.debt}</strong>
        </button>
        <button
          type="button"
          className={`${styles.summaryCard} ${styles.advanceCard} ${balanceFilter === 'advance' ? styles.summaryCardActive : ''}`}
          onClick={() => handleFilterToggle('advance')}
          aria-pressed={balanceFilter === 'advance'}
          aria-label="Filter customers with advance or settled balance"
        >
          <span className={styles.summaryLabel}>Total Advance</span>
          <strong className={`${styles.summaryValue} ${styles.advance}`}>Rs. {totals.advance}</strong>
        </button>
      </section>

      {hasAnyCustomers && (
        <search>
          <label htmlFor="customer-search" className="sr-only">Search customers</label>
          <input
            id="customer-search"
            type="search"
            placeholder="Search by Name, Phone, or CNIC..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search customers by name, phone, or CNIC"
          />
        </search>
      )}

      {isLoading ? (
        <Spinner />
      ) : filteredCustomers.length === 0 ? (
        <p className={styles.empty}>
          {emptyMessage}
        </p>
      ) : (
        <ul className={styles.list} role="list">
          {[...filteredCustomers].reverse().map((c) => (
            <li key={c.id} className={styles.listItemWrapper}>
              <button
                type="button"
                className={styles.listItem}
                onClick={() => onSelectCustomer(c.id)}
                aria-label={`View ledger for ${c.name}, balance Rs. ${Math.abs(c.totalBalance ?? 0)}`}
              >
                <div className="flex-col">
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.phone}>{c.phone}</span>
                </div>
                <span className={`${styles.balance} ${(c.totalBalance ?? 0) < 0 ? styles.advance : ((c.totalBalance ?? 0) > 0 ? styles.debt : '')}`}>
                  Rs. {Math.abs(c.totalBalance ?? 0)}
                  {(c.totalBalance ?? 0) < 0 ? ' (Adv)' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
