'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CustomerList } from '@/components/dashboard/CustomerList';
import { NewCustomerForm } from '@/components/dashboard/NewCustomerForm';
import { ActiveLedgerView } from '@/components/dashboard/ActiveLedgerView';
import { Button } from '@/components/ui/Button';
import { getCustomers } from '@/server/actions';

export default function Dashboard() {
  const [view, setView] = useState<'list' | 'new' | 'ledger'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchAllCustomers();
    }
  }, [view]);

  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setView('ledger');
  }, []);

  return (
    <main className="flex-col w-full h-full layout-container">
      <h1 className="sr-only">D-Khata Merchant Dashboard</h1>

      {(view === 'list' || view === 'new') && (
        <>
          <header className="p-md layout-header" role="banner">
            D-Khata Dashboard
          </header>
          <CustomerList
            customers={customers}
            isLoading={isLoading}
            onSelectCustomer={handleSelectCustomer}
          />
          <footer className="sticky-bottom">
            <Button onClick={() => setView('new')}>Add New Customer</Button>
          </footer>
        </>
      )}

      {view === 'new' && (
        <NewCustomerForm
          onCancel={() => setView('list')}
          onSuccess={() => setView('list')}
        />
      )}

      {view === 'ledger' && selectedCustomerId && (
        <ActiveLedgerView
          customerId={selectedCustomerId}
          onBack={() => setView('list')}
        />
      )}

    </main>
  );
}