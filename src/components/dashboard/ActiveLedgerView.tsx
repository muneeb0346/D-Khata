import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddCreditForm } from '@/components/dashboard/AddCreditForm';
import { ReceivePayForm } from '@/components/dashboard/ReceivePayForm';
import { CustomerForm } from '@/components/dashboard/NewCustomerForm';
import { Spinner } from '@/components/ui/Spinner';
import styles from './ActiveLedgerView.module.css';
import { getLedger, addPendingCredit, processPayment, deleteCustomer } from '@/server/actions';
import { TransactionList } from '@/components/khata/TransactionList';
import balanceStyles from '@/components/khata/BalanceSummary.module.css';
import { BalanceGraph } from '@/components/charts/BalanceGraph';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { LedgerData } from '@/types';

interface Props {
  customerId: string;
  onBack: () => void;
}

interface DialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActiveLedgerView({ customerId, onBack }: Props) {
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeForm, setActiveForm] = useState<'credit' | 'pay' | 'edit' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const hasModalHistoryEntryRef = useRef(false);
  const ignoreNextPopStateRef = useRef(false);
  const activeFormRef = useRef<'credit' | 'pay' | 'edit' | null>(null);

  const fetchLedger = useCallback(async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    setError('');

    try {
      const result = await getLedger(customerId);
      if (!result.ok) {
        setLedgerData(null);
        setError(result.error);
        setDialogState({
          title: 'Unable to Load Ledger',
          message: result.error,
          confirmLabel: 'OK',
          variant: 'danger',
          onConfirm: () => setDialogState(null),
          onCancel: () => setDialogState(null),
        });
        return;
      }

      setLedgerData(result.ledgerData);
    } catch {
      setLedgerData(null);
      setError('Failed to load ledger');
      setDialogState({
        title: 'Unable to Load Ledger',
        message: 'Failed to load ledger',
        confirmLabel: 'OK',
        variant: 'danger',
        onConfirm: () => setDialogState(null),
        onCancel: () => setDialogState(null),
      });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchLedger({ showLoading: false });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchLedger]);

  useEffect(() => {
    activeFormRef.current = activeForm;

    if (activeForm && !hasModalHistoryEntryRef.current) {
      window.history.pushState({ ...window.history.state, dKhataModal: true }, '', window.location.href);
      hasModalHistoryEntryRef.current = true;
      return;
    }

    if (!activeForm && hasModalHistoryEntryRef.current) {
      ignoreNextPopStateRef.current = true;
      hasModalHistoryEntryRef.current = false;
      window.history.back();
    }
  }, [activeForm]);

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }

      if (activeFormRef.current) {
        hasModalHistoryEntryRef.current = false;
        setActiveForm(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const getWhatsAppShareUrl = () => {
    if (!ledgerData?.customer?.phone) return;
    const url = `${window.location.origin}/khata/${customerId}`;
    const text = encodeURIComponent(`Please verify your D-Khata ledger: ${url}`);

    let phone = ledgerData.customer.phone;
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }

    return `https://wa.me/${phone}?text=${text}`;
  };

  const openShareInTemporaryTab = () => {
    const shareUrl = getWhatsAppShareUrl();
    if (!shareUrl) return;

    const shareTab = window.open(shareUrl, '_blank');
    if (!shareTab) return;

    window.setTimeout(() => {
      try {
        shareTab.close();
      } catch {
        // Ignore close failures; some browsers restrict closing after navigation.
      }
    }, 3000);
  };

  const handleShare = () => {
    openShareInTemporaryTab();
  };

  const handleCreditSubmit = async (data: { amount: number; description: string }) => {
    try {
      const result = await addPendingCredit(customerId, data);
      if (!result.ok) {
        return result.error;
      }

      setActiveForm(null);
      openShareInTemporaryTab();
      fetchLedger();
    } catch {
      return 'Failed to add credit';
    }

    return undefined;
  };

  const handlePaySubmit = async (amount: number) => {
    try {
      const result = await processPayment(customerId, amount);
      if (!result.ok) {
        return result.error;
      }

      setActiveForm(null);
      fetchLedger();
    } catch {
      return 'Failed to process payment';
    }

    return undefined;
  };

  const handleFileCase = async () => {
    const balance = ledgerData?.customer?.totalBalance ?? 0;
    const caseInfo = `CUSTOMER CASE INFORMATION\n-------------------------\nName: ${ledgerData?.customer?.name}\nPhone: ${ledgerData?.customer?.phone}\nCNIC: ${ledgerData?.customer?.cnic || 'Not Provided'}\nAddress: ${ledgerData?.customer?.address || 'Not Provided'}\n\nTotal Balance: Rs. ${Math.abs(balance)} ${balance < 0 ? '(Advance)' : '(Debt)'}\n\nPlease proceed with necessary actions.`;
    try {
      await navigator.clipboard.writeText(caseInfo);
      setDialogState({
        title: 'Details Copied',
        message: 'Customer information copied to clipboard for filing a case.',
        confirmLabel: 'OK',
        variant: 'primary',
        onConfirm: () => setDialogState(null),
        onCancel: () => setDialogState(null),
      });
    } catch {
      setDialogState({
        title: 'Copy Failed',
        message: 'Unable to copy customer information. Please try again.',
        confirmLabel: 'OK',
        variant: 'danger',
        onConfirm: () => setDialogState(null),
        onCancel: () => setDialogState(null),
      });
    }
  };

  const executeDeleteCustomer = async (acknowledgeNonZeroBalance: boolean) => {
    setDialogState(null);
    setIsDeleting(true);

    try {
      const result = await deleteCustomer(customerId, acknowledgeNonZeroBalance);
      if (!result.ok) {
        setDialogState({
          title: 'Delete Failed',
          message: result.error,
          confirmLabel: 'OK',
          variant: 'danger',
          onConfirm: () => setDialogState(null),
          onCancel: () => setDialogState(null),
        });
        return;
      }

      setDialogState({
        title: 'Customer Deleted',
        message: 'Customer and related transactions were deleted successfully.',
        confirmLabel: 'OK',
        variant: 'primary',
        onConfirm: () => {
          setDialogState(null);
          onBack();
        },
        onCancel: () => {
          setDialogState(null);
          onBack();
        },
      });
    } catch {
      setDialogState({
        title: 'Delete Failed',
        message: 'Failed to delete customer.',
        confirmLabel: 'OK',
        variant: 'danger',
        onConfirm: () => setDialogState(null),
        onCancel: () => setDialogState(null),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!ledgerData?.customer) return;

    const normalizedBalance = Number(ledgerData.customer.totalBalance ?? 0);
    const amount = Math.abs(normalizedBalance);

    const confirmationMessage = normalizedBalance > 0
      ? `Customer ${ledgerData.customer.name} has debt of Rs. ${amount}. Confirm that you have already received this amount and want to delete all records for this customer.`
      : normalizedBalance < 0
        ? `Customer ${ledgerData.customer.name} has advance of Rs. ${amount}. Confirm that you have already paid this amount to the customer and want to delete all records.`
        : `Delete ${ledgerData.customer.name} and all related transactions permanently?`;

    setDialogState({
      title: 'Confirm Deletion',
      message: confirmationMessage,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      showCancel: true,
      variant: 'danger',
      onConfirm: () => {
        void executeDeleteCustomer(normalizedBalance !== 0);
      },
      onCancel: () => setDialogState(null),
    });
  };

  if (loading) return <Spinner />;

  if (error && !ledgerData) {
    return (
      <article className="flex-col h-full p-md" aria-live="assertive">
        <div className="card-base flex-col gap-sm">
          <strong className="text-debt">{error}</strong>
          <div className="flex-row gap-md">
            <Button variant="secondary" onClick={onBack} className="w-auto">← Back</Button>
            <Button variant="primary" onClick={() => fetchLedger()}>Try Again</Button>
          </div>
        </div>
      </article>
    );
  }

  if (!ledgerData) return null;

  const { customer, transactions, pendingTransaction } = ledgerData;
  const isLocked = !!pendingTransaction;

  return (
    <article className="flex-col h-full" aria-live="polite">
      <header className={styles.header}>
        <div className="flex-row justify-between gap-md">
          <Button variant="secondary" onClick={onBack} className="w-auto" aria-label="Go back to customer list">← Back</Button>
          <Button variant="secondary" onClick={handleShare} className="w-auto flex-row items-center gap-sm" aria-label="Share ledger link via WhatsApp">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Share</span>
          </Button>
        </div>
        <div className="flex-col">
          <h2 className={styles.name}>{customer.name}</h2>
        </div>
      </header>

      <div className={balanceStyles.balanceHeader}>
        <span className="text-muted">Current Balance</span>
        <h2 className={`${balanceStyles.balanceAmount} ${Number(customer.totalBalance ?? 0) < 0 ? 'text-advance' : (Number(customer.totalBalance ?? 0) > 0 ? 'text-debt' : '')}`}>
          Rs. {Math.abs(Number(customer.totalBalance ?? 0))} {Number(customer.totalBalance ?? 0) < 0 ? '(Adv)' : (Number(customer.totalBalance ?? 0) > 0 ? '(Debt)' : '')}
        </h2>
      </div>

      <section className="txns-container" aria-label="Transactions">
        {isLocked && (
          <div className={styles.lockedBanner} role="alert">
            Account Locked: Awaiting customer verification for a pending transaction.
          </div>
        )}

        <div className="p-md pb-0">
          <section aria-label="Balance history chart">
            <h3 className="sr-only">Balance History</h3>
            <BalanceGraph transactions={transactions} isDebt={Number(customer.totalBalance ?? 0) > 0} />
          </section>

          <h3 className="sr-only">Transaction List</h3>
          <TransactionList transactions={transactions} />
        </div>

        <section className="p-md" aria-label="Customer details">
          <div className="flex-row justify-between items-center mb-md">
            <h3 className="section-title m-0">Customer Details</h3>
            <Button variant="secondary" className={`${styles.editBtn} text-xs`} onClick={() => setActiveForm('edit')}>Edit</Button>
          </div>
          <dl className="card-base flex-col gap-sm">
            <div><dt className="text-muted">Name:</dt> <dd>{customer.name}</dd></div>
            <div><dt className="text-muted">Phone:</dt> <dd>{customer.phone}</dd></div>
            <div><dt className="text-muted">CNIC:</dt> <dd>{customer.cnic || 'N/A'}</dd></div>
            <div><dt className="text-muted">Address:</dt> <dd>{customer.address || 'N/A'}</dd></div>
            <div className="mt-md">
              <Button variant="secondary" onClick={handleFileCase} aria-label="Copy customer details to clipboard for filing a case">Copy Details to File Case</Button>
            </div>
          </dl>
          <section className={styles.deleteCustomerSection} aria-label="Danger zone">
            <h4 className={styles.deleteTitle}>Danger Zone</h4>
            <p className={styles.deleteText}>
              Deleting this customer permanently removes all transactions and cannot be undone.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteCustomer}
              disabled={isDeleting}
              aria-label="Delete this customer and all related transactions"
            >
              {isDeleting ? 'Deleting...' : 'Delete Customer'}
            </Button>
          </section>
        </section>
      </section>

      <footer className="flex-row gap-md sticky-bottom">
        <Button
          variant="danger"
          onClick={() => setActiveForm('credit')}
          disabled={isLocked}
          aria-label={isLocked ? 'Cannot add credit while account is locked' : 'Add a new credit transaction'}
        >
          Add Credit
        </Button>
        <Button
          variant="primary"
          onClick={() => setActiveForm('pay')}
          disabled={isLocked}
          aria-label={isLocked ? 'Cannot receive payment while account is locked' : 'Record a payment received from customer'}
        >
          Receive Pay
        </Button>
      </footer>

      {activeForm === 'credit' && (
        <AddCreditForm onSubmit={handleCreditSubmit} onCancel={() => setActiveForm(null)} />
      )}

      {activeForm === 'pay' && (
        <ReceivePayForm onSubmit={handlePaySubmit} onCancel={() => setActiveForm(null)} />
      )}

      {activeForm === 'edit' && (
        <CustomerForm
          initialData={customer}
          onCancel={() => setActiveForm(null)}
          onSuccess={() => {
            setActiveForm(null);
            fetchLedger();
          }}
        />
      )}

      <ModalDialog
        open={!!dialogState}
        title={dialogState?.title ?? ''}
        message={dialogState?.message ?? ''}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        showCancel={dialogState?.showCancel}
        variant={dialogState?.variant}
        onConfirm={() => dialogState?.onConfirm()}
        onCancel={() => dialogState?.onCancel()}
      />
    </article>
  );
}
