"use client";

import { Button } from "@/components/ui/Button";
import { BalanceGraph } from "@/components/charts/BalanceGraph";
import { TransactionList } from "@/components/khata/TransactionList";
import { DeleteCustomerFlow } from "@/components/dashboard/DeleteCustomerFlow";
import { LedgerFormSheet } from "@/components/dashboard/LedgerFormSheet";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Customer, Transaction } from "@/types";
import balanceStyles from "@/styles/balance-summary.module.css";
import headerStyles from "@/styles/ledger-header.module.css";
import alertStyles from "@/styles/alert-banner.module.css";
import styles from "./LedgerViewContent.module.css";

interface Props {
  customer: Customer;
  transactions: Transaction[];
  isLocked: boolean;
  onBack: () => void;
  onShare: () => void;
  onAddCredit: () => void;
  onReceivePay: () => void;
  onEdit: () => void;
  onCopyDetails: () => void;
  onDeleteSuccess: () => void;
  activeForm: "credit" | "pay" | "edit" | null;
  onCancelForm: () => void;
  customerId: string;
  onFormSuccess: () => void;
  dialogState: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    showCancel?: boolean;
    variant?: "primary" | "danger";
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}

export function LedgerViewContent({
  customer,
  transactions,
  isLocked,
  onBack,
  onShare,
  onAddCredit,
  onReceivePay,
  onEdit,
  onCopyDetails,
  onDeleteSuccess,
  activeForm,
  onCancelForm,
  customerId,
  onFormSuccess,
  dialogState,
}: Props) {
  return (
    <article className="flex-col h-full" aria-live="polite">
      <header className={headerStyles.header}>
        <div className="flex-row justify-between gap-md">
          <Button variant="secondary" onClick={onBack} className="w-auto" aria-label="Go back to customer list">
            ← Back
          </Button>
          <Button variant="secondary" onClick={onShare} className="w-auto flex-row items-center gap-sm" aria-label="Share ledger link via WhatsApp">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Share</span>
          </Button>
        </div>
        <div className="flex-col">
          <h2 className={headerStyles.name}>{customer.name}</h2>
        </div>
      </header>

      <div className={balanceStyles.balanceHeader}>
        <span className="text-muted">Current Balance</span>
        <h2 className={`${balanceStyles.balanceAmount} ${Number(customer.totalBalance ?? 0) < 0 ? "text-advance" : Number(customer.totalBalance ?? 0) > 0 ? "text-debt" : ""}`}>
          Rs. {Math.abs(Number(customer.totalBalance ?? 0))} {Number(customer.totalBalance ?? 0) < 0 ? "(Adv)" : Number(customer.totalBalance ?? 0) > 0 ? "(Debt)" : ""}
        </h2>
      </div>

      <section className="txns-container" aria-label="Transactions">
        {isLocked && (
          <div className={alertStyles.alertBanner} role="alert">
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
            <Button variant="secondary" className={`${styles.editBtn} text-xs`} onClick={onEdit}>
              Edit
            </Button>
          </div>
          <dl className="card-base flex-col gap-sm">
            <div>
              <dt className="text-muted">Name:</dt>
              <dd>{customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Phone:</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-muted">CNIC:</dt>
              <dd>{customer.cnic || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-muted">Address:</dt>
              <dd>{customer.address || "N/A"}</dd>
            </div>
            <div className="mt-md">
              <Button variant="secondary" onClick={onCopyDetails} aria-label="Copy customer details to clipboard for filing a case">
                Copy Details to File Case
              </Button>
            </div>
          </dl>
          <DeleteCustomerFlow customer={customer} customerId={customer.id} onDeleteSuccess={onDeleteSuccess} />
        </section>
      </section>

      <footer className="flex-row gap-md sticky-bottom">
        <Button
          variant="danger"
          onClick={onAddCredit}
          disabled={isLocked}
          aria-label={isLocked ? "Cannot add credit while account is locked" : "Add a new credit transaction"}
        >
          Add Credit
        </Button>
        <Button
          variant="primary"
          onClick={onReceivePay}
          disabled={isLocked}
          aria-label={isLocked ? "Cannot receive payment while account is locked" : "Record a payment received from customer"}
        >
          Receive Pay
        </Button>
      </footer>

      <LedgerFormSheet activeForm={activeForm} customer={customer} customerId={customerId} onSuccess={onFormSuccess} onCancel={onCancelForm} />

      <ModalDialog
        open={!!dialogState}
        title={dialogState?.title ?? ""}
        message={dialogState?.message ?? ""}
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