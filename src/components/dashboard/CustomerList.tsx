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
    if (!searchTerm.trim()) return customers;
    const lower = searchTerm.toLowerCase();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(lower)) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.cnic && c.cnic.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  return (
    <section className={styles.listContainer} aria-label="Customer list" aria-live="polite">
      <h2 className={styles.title}>Your Customers</h2>

      <section className={styles.summary} aria-label="Customer balance summary">
        <div className={`${styles.summaryCard} ${styles.debtCard}`}>
          <span className={styles.summaryLabel}>Total Debt</span>
          <strong className={`${styles.summaryValue} ${styles.debt}`}>Rs. {totals.debt}</strong>
        </div>
        <div className={`${styles.summaryCard} ${styles.advanceCard}`}>
          <span className={styles.summaryLabel}>Total Advance</span>
          <strong className={`${styles.summaryValue} ${styles.advance}`}>Rs. {totals.advance}</strong>
        </div>
      </section>

      {customers.length > 0 && (
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
          {customers.length === 0 ? "No customers yet. Add one to get started!" : "No customers match your search."}
        </p>
      ) : (
        <ul className={styles.list} role="list">
          {[...filteredCustomers].reverse().map((c) => (
            <li
              key={c.id}
              className={styles.listItem}
              onClick={() => onSelectCustomer(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectCustomer(c.id); }}
              role="button"
              tabIndex={0}
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
