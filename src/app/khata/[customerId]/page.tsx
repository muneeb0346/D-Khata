"use client";

import { useCallback, useEffect, useState } from "react";
import { getLedger, resolveTransaction } from "@/server/actions";
import { BalanceGraph } from "@/components/charts/BalanceGraph";
import { TransactionList } from "@/components/khata/TransactionList";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Spinner } from "@/components/ui/Spinner";
import balanceStyles from "@/styles/balance-summary.module.css";
import headerStyles from "@/styles/ledger-header.module.css";
import alertStyles from "@/styles/alert-banner.module.css";
import { useParams } from "next/navigation";
import { LedgerData } from "@/types";
import { logger } from "@/utils/logger";
import { formatBalanceLabel, formatBalanceAmount } from "@/utils/formatters";

export default function PublicKhata() {
  const params = useParams();
  const customerId = params.customerId as string;

  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    variant?: "primary" | "danger";
    onConfirm?: () => void;
  } | null>(null);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getLedger(customerId);
      if (!result.ok) {
        setLedgerData(null);
        setError(result.error);
        setDialog({
          title: "Unable to Load Ledger",
          message: result.error,
          variant: "danger",
          onConfirm: () => setDialog(null),
        });
        return;
      }

      setLedgerData(result.ledgerData);
    } catch {
      setLedgerData(null);
      setError("Failed to load ledger");
      setDialog({
        title: "Unable to Load Ledger",
        message: "Failed to load ledger",
        variant: "danger",
        onConfirm: () => setDialog(null),
      });
      logger.error("Failed to load ledger", { customerId });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchLedger();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchLedger]);

  const handleResolve = async (resolution: "VERIFIED" | "DISPUTED") => {
    if (!ledgerData?.pendingTransaction) return;
    try {
      const result = await resolveTransaction(
        customerId,
        ledgerData.pendingTransaction.id,
        resolution,
      );
      if (!result.ok) {
        setDialog({
          title: "Resolution Failed",
          message: result.error,
          variant: "danger",
          onConfirm: () => setDialog(null),
        });
        return;
      }

      fetchLedger();
    } catch {
      logger.error("Failed to resolve transaction", { customerId, resolution });
      setDialog({
        title: "Resolution Failed",
        message: "Failed to resolve transaction",
        variant: "danger",
        onConfirm: () => setDialog(null),
      });
    }
  };

  if (loading) {
    return (
      <main className="layout-container flex-col">
        <Spinner />
      </main>
    );
  }

  if (error && !ledgerData) {
    return (
      <main className="layout-container flex-col p-md" aria-live="assertive">
        <div className="card-base flex-col gap-sm">
          <strong className="text-debt">{error}</strong>
          <Button variant="primary" onClick={fetchLedger}>
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  if (!ledgerData) {
    return null;
  }

  const { customer, transactions, pendingTransaction } = ledgerData;

  return (
    <main className="layout-container flex-col" aria-live="polite">
      <header className={headerStyles.headerPrimary} role="banner">
        <h1 className={headerStyles.name}>{customer.name}&apos;s Ledger</h1>
      </header>

      <section className="txns-container p-md" aria-label="Ledger overview">
        <div className={balanceStyles.balanceHeader}>
          <span className="text-muted">Current Balance</span>
          <h2
            className={`${balanceStyles.balanceAmount} ${Number(customer.totalBalance ?? 0) < 0 ? "text-advance" : Number(customer.totalBalance ?? 0) > 0 ? "text-debt" : ""}`}
          >
            Rs. {formatBalanceAmount(customer.totalBalance)}{" "}
            {formatBalanceLabel(customer.totalBalance)}
          </h2>
        </div>

        <section aria-label="Balance history chart">
          <h3 className="sr-only">Balance History</h3>
          <BalanceGraph
            transactions={transactions}
            isDebt={Number(customer.totalBalance ?? 0) > 0}
          />
        </section>

        <section aria-label="Transaction history">
          <h3 className="section-title pb-0">Transaction History</h3>
          <TransactionList transactions={transactions} />
        </section>
      </section>

      {pendingTransaction && (
        <aside className={alertStyles.alertBannerSticky} role="alert" aria-live="assertive">
          <div className="flex-col gap-sm">
            <h3 className={`${alertStyles.alertBannerTitle} m-0`}>Action Required</h3>
            <p className={alertStyles.alertBannerText}>
              The merchant added a new transaction:
              <strong> {pendingTransaction.description} </strong>
              for <strong>Rs. {pendingTransaction.originalAmount}</strong>. Do you verify this?
            </p>
            <div className="flex-row gap-md mt-md">
              <Button
                variant="danger"
                onClick={() => handleResolve("DISPUTED")}
                aria-label="Reject pending transaction"
              >
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={() => handleResolve("VERIFIED")}
                aria-label="Verify and accept pending transaction"
              >
                Verify &amp; Accept
              </Button>
            </div>
          </div>
        </aside>
      )}

      <ModalDialog
        open={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "primary"}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={() => setDialog(null)}
      />
    </main>
  );
}
