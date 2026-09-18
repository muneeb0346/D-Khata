"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { deleteCustomer } from "@/server/actions";
import { Customer } from "@/types";
import styles from "./DeleteCustomerFlow.module.css";

interface Props {
  customer: Customer;
  customerId: string;
  onDeleteSuccess: () => void;
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

export function DeleteCustomerFlow({ customer, customerId, onDeleteSuccess }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const executeDeleteCustomer = async (acknowledgeNonZeroBalance: boolean) => {
    setDialogState(null);
    setIsDeleting(true);

    try {
      const result = await deleteCustomer(customerId, acknowledgeNonZeroBalance);
      if (!result.ok) {
        setDialogState({
          title: "Delete Failed",
          message: result.error,
          confirmLabel: "OK",
          variant: "danger",
          onConfirm: () => setDialogState(null),
          onCancel: () => setDialogState(null),
        });
        return;
      }

      setDialogState({
        title: "Customer Deleted",
        message: "Customer and related transactions were deleted successfully.",
        confirmLabel: "OK",
        variant: "primary",
        onConfirm: () => {
          setDialogState(null);
          onDeleteSuccess();
        },
        onCancel: () => {
          setDialogState(null);
          onDeleteSuccess();
        },
      });
    } catch {
      setDialogState({
        title: "Delete Failed",
        message: "Failed to delete customer.",
        confirmLabel: "OK",
        variant: "danger",
        onConfirm: () => setDialogState(null),
        onCancel: () => setDialogState(null),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCustomer = () => {
    const normalizedBalance = Number(customer.totalBalance ?? 0);
    const amount = Math.abs(normalizedBalance);

    const confirmationMessage =
      normalizedBalance > 0
        ? `Customer ${customer.name} has debt of Rs. ${amount}. Confirm that you have already received this amount and want to delete all records for this customer.`
        : normalizedBalance < 0
          ? `Customer ${customer.name} has advance of Rs. ${amount}. Confirm that you have already paid this amount to the customer and want to delete all records.`
          : `Delete ${customer.name} and all related transactions permanently?`;

    setDialogState({
      title: "Confirm Deletion",
      message: confirmationMessage,
      confirmLabel: "Yes, Delete",
      cancelLabel: "Cancel",
      showCancel: true,
      variant: "danger",
      onConfirm: () => {
        void executeDeleteCustomer(normalizedBalance !== 0);
      },
      onCancel: () => setDialogState(null),
    });
  };

  return (
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
        {isDeleting ? "Deleting..." : "Delete Customer"}
      </Button>

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
    </section>
  );
}
