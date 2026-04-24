'use client';

import React, { useState, useEffect } from 'react';
import { CustomerList } from '@/components/dashboard/CustomerList';
import { NewCustomerForm } from '@/components/dashboard/NewCustomerForm';
import { ActiveLedgerView } from '@/components/dashboard/ActiveLedgerView';
import { Button } from '@/components/ui/Button';
import { getCustomers } from '@/server/actions';

export default function Dashboard() {
  const [view, setView] = useState<'list' | 'new' | 'ledger'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchAllCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchAllCustomers();
    }
  }, [view]);

  return (
    <div className="flex-col h-full layout-container">

      {view === 'list' && (
        <>
          <div className="p-md layout-header">
            D-Khata Dashboard
          </div>
          <CustomerList
            customers={customers}
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
              setView('ledger');
            }}
          />
          <div className="sticky-bottom">
            <Button onClick={() => setView('new')}>Add New Customer</Button>
          </div>
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

    </div>
  );
}