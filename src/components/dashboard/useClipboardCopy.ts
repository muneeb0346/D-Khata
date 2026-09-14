"use client";

import { useCallback } from "react";
import { Customer } from "@/types";

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

export function useClipboardCopy(onDialogChange: (state: DialogState | null) => void) {
  const copyCaseInfo = useCallback(
    async (customer: Customer) => {
      const balance = customer.totalBalance ?? 0;
      const caseInfo = `CUSTOMER CASE INFORMATION\n-------------------------\nName: ${customer.name}\nPhone: ${customer.phone}\nCNIC: ${customer.cnic || "Not Provided"}\nAddress: ${customer.address || "Not Provided"}\n\nTotal Balance: Rs. ${Math.abs(balance)} ${balance < 0 ? "(Advance)" : "(Debt)"}\n\nPlease proceed with necessary actions.`;

      try {
        await navigator.clipboard.writeText(caseInfo);
        onDialogChange({
          title: "Details Copied",
          message: "Customer information copied to clipboard for filing a case.",
          confirmLabel: "OK",
          variant: "primary",
          onConfirm: () => onDialogChange(null),
          onCancel: () => onDialogChange(null),
        });
      } catch {
        onDialogChange({
          title: "Copy Failed",
          message: "Unable to copy customer information. Please try again.",
          confirmLabel: "OK",
          variant: "danger",
          onConfirm: () => onDialogChange(null),
          onCancel: () => onDialogChange(null),
        });
      }
    },
    [onDialogChange],
  );

  return { copyCaseInfo };
}