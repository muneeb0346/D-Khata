'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerList } from '@/components/dashboard/CustomerList';
import { CustomerForm } from '@/components/dashboard/NewCustomerForm';
import { ActiveLedgerView } from '@/components/dashboard/ActiveLedgerView';
import { Button } from '@/components/ui/Button';
import { getCustomers } from '@/server/actions';
import { Customer } from '@/types';

const DASHBOARD_CUSTOMER_KEY = 'd-khata.dashboard.customerId';

export default function Dashboard() {
  const [view, setView] = useState<'list' | 'new' | 'ledger'>(() => {
    if (typeof window === 'undefined') return 'list';

    return window.localStorage.getItem(DASHBOARD_CUSTOMER_KEY) ? 'ledger' : 'list';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    return window.localStorage.getItem(DASHBOARD_CUSTOMER_KEY);
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const hasViewHistoryEntryRef = useRef(false);
  const ignoreNextPopStateRef = useRef(false);
  const viewRef = useRef<'list' | 'new' | 'ledger'>(view);
  const selectedCustomerIdRef = useRef<string | null>(selectedCustomerId);

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

  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setView('ledger');
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedCustomerId(null);
  }, []);

  useEffect(() => {
    viewRef.current = view;
    selectedCustomerIdRef.current = selectedCustomerId;

    if (view !== 'list' && !hasViewHistoryEntryRef.current) {
      window.history.pushState({ ...window.history.state, dKhataDashboardView: view }, '', window.location.href);
      hasViewHistoryEntryRef.current = true;
      return;
    }

    if (view === 'list' && hasViewHistoryEntryRef.current) {
      ignoreNextPopStateRef.current = true;
      hasViewHistoryEntryRef.current = false;
      window.history.back();
    }
  }, [selectedCustomerId, view]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }

      const state = event.state as { dKhataDashboardView?: 'new' | 'ledger' } | null;

      if (state?.dKhataDashboardView) {
        hasViewHistoryEntryRef.current = true;

        if (viewRef.current !== state.dKhataDashboardView) {
          if (state.dKhataDashboardView === 'ledger' && !selectedCustomerIdRef.current) {
            const savedCustomerId = window.localStorage.getItem(DASHBOARD_CUSTOMER_KEY);
            if (savedCustomerId) {
              setSelectedCustomerId(savedCustomerId);
            }
          }

          setView(state.dKhataDashboardView);
        }

        return;
      }

      if (viewRef.current !== 'list') {
        hasViewHistoryEntryRef.current = false;
        setSelectedCustomerId(null);
        setView('list');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    if (view === 'list') {
      const fetchTimerId = window.setTimeout(() => {
        void fetchAllCustomers();
      }, 0);

      return () => {
        window.clearTimeout(timerId);
        window.clearTimeout(fetchTimerId);
      };
    }

    return () => window.clearTimeout(timerId);
  }, [view]);

  useEffect(() => {
    if (view === 'ledger' && selectedCustomerId) {
      window.localStorage.setItem(DASHBOARD_CUSTOMER_KEY, selectedCustomerId);
      return;
    }

    window.localStorage.removeItem(DASHBOARD_CUSTOMER_KEY);
  }, [selectedCustomerId, view]);

  if (!isMounted) {
    return (
      <main className="flex-col w-full h-full layout-container" aria-busy="true" aria-live="polite">
        <h1 className="sr-only">D-Khata Merchant Dashboard</h1>
      </main>
    );
  }

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
        <CustomerForm
          onCancel={handleBackToList}
          onSuccess={handleBackToList}
        />
      )}

      {view === 'ledger' && selectedCustomerId && (
        <ActiveLedgerView
          customerId={selectedCustomerId}
          onBack={handleBackToList}
        />
      )}

    </main>
  );
}