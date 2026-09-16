import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getLedger } from "@/server/actions";
import { LedgerData } from "@/types";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useClipboardCopy } from "@/hooks/useClipboardCopy";
import { LedgerViewContent } from "@/components/dashboard/LedgerViewContent";
import wAutoStyles from "@/styles/w-auto.module.css";

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
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActiveLedgerView({ customerId, onBack }: Props) {
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeForm, setActiveForm] = useState<"credit" | "pay" | "edit" | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const hasModalHistoryEntryRef = useRef(false);
  const ignoreNextPopStateRef = useRef(false);
  const activeFormRef = useRef<"credit" | "pay" | "edit" | null>(null);

  const { share } = useWhatsAppShare(customerId, ledgerData?.customer?.phone);
  const { copyCaseInfo } = useClipboardCopy(setDialogState);

  const fetchLedger = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (showLoading) setLoading(true);
      setError("");

      try {
        const result = await getLedger(customerId);
        if (!result.ok) {
          setLedgerData(null);
          setError(result.error);
          setDialogState({
            title: "Unable to Load Ledger",
            message: result.error,
            confirmLabel: "OK",
            variant: "danger",
            onConfirm: () => setDialogState(null),
            onCancel: () => setDialogState(null),
          });
          return;
        }
        setLedgerData(result.ledgerData);
      } catch {
        setLedgerData(null);
        setError("Failed to load ledger");
        setDialogState({
          title: "Unable to Load Ledger",
          message: "Failed to load ledger",
          confirmLabel: "OK",
          variant: "danger",
          onConfirm: () => setDialogState(null),
          onCancel: () => setDialogState(null),
        });
      } finally {
        setLoading(false);
      }
    },
    [customerId],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => void fetchLedger({ showLoading: false }), 0);
    return () => window.clearTimeout(timerId);
  }, [fetchLedger]);

  useEffect(() => {
    activeFormRef.current = activeForm;
    if (activeForm && !hasModalHistoryEntryRef.current) {
      window.history.pushState({ ...window.history.state, dKhataModal: true }, "", window.location.href);
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
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleFormSuccess = () => {
    setActiveForm(null);
    fetchLedger();
  };

  const handleDeleteSuccess = () => onBack();

  if (loading) return <Spinner />;

  if (error && !ledgerData) {
    return (
      <article className="flex-col h-full p-md" aria-live="assertive">
        <div className="card-base flex-col gap-sm">
          <strong className="text-debt">{error}</strong>
          <div className="flex-row gap-md">
            <Button variant="secondary" onClick={onBack} className={wAutoStyles['w-auto']}>← Back</Button>
            <Button variant="primary" onClick={() => fetchLedger()}>Try Again</Button>
          </div>
        </div>
      </article>
    );
  }

  if (!ledgerData) return null;

  const { customer, transactions } = ledgerData;
  const isLocked = !!ledgerData.pendingTransaction;

  return (
    <LedgerViewContent
      customer={customer}
      transactions={transactions}
      isLocked={isLocked}
      onBack={onBack}
      onShare={share}
      onAddCredit={() => setActiveForm("credit")}
      onReceivePay={() => setActiveForm("pay")}
      onEdit={() => setActiveForm("edit")}
      onCopyDetails={() => copyCaseInfo(customer)}
      onDeleteSuccess={handleDeleteSuccess}
      activeForm={activeForm}
      onCancelForm={() => setActiveForm(null)}
      customerId={customerId}
      onFormSuccess={handleFormSuccess}
      dialogState={dialogState}
    />
  );
}