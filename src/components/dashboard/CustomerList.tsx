import React from 'react';
import styles from './CustomerList.module.css';

interface CustomerListProps {
  customers: any[];
  onSelectCustomer: (id: string) => void;
}

export function CustomerList({ customers, onSelectCustomer }: CustomerListProps) {
  return (
    <div className={styles.listContainer}>
      <h2 className={styles.title}>Your Customers</h2>
      {customers.length === 0 ? (
        <p className={styles.empty}>No customers yet. Add one to get started!</p>
      ) : (
        <ul className={styles.list}>
          {customers.map((c) => (
            <li
              key={c.id}
              className={styles.listItem}
              onClick={() => onSelectCustomer(c.id)}
            >
              <div className="flex-col">
                <span className={styles.name}>{c.name}</span>
                <span className={styles.phone}>{c.phone}</span>
              </div>
              <span className={`${styles.balance} ${c.totalBalance < 0 ? styles.advance : (c.totalBalance > 0 ? styles.debt : '')}`}>
                Rs. {Math.abs(c.totalBalance)}
                {c.totalBalance < 0 ? ' (Adv)' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
