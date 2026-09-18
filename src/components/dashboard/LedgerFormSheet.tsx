"use client";

import { AddCreditForm } from "@/components/dashboard/AddCreditForm";
import { ReceivePayForm } from "@/components/dashboard/ReceivePayForm";
import { CustomerForm } from "@/components/dashboard/NewCustomerForm";
import { addPendingCredit, processPayment } from "@/server/actions";
import { Customer } from "@/types";

interface Props {
  activeForm: "credit" | "pay" | "edit" | null;
  customer?: Customer;
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LedgerFormSheet({ activeForm, customer, customerId, onSuccess, onCancel }: Props) {
  const handleCreditSubmit = async (data: { amount: number; description: string }) => {
    try {
      const result = await addPendingCredit(customerId, data);
      if (!result.ok) {
        return result.error;
      }
      onSuccess();
    } catch {
      return "Failed to add credit";
    }
    return undefined;
  };

  const handlePaySubmit = async (amount: number) => {
    try {
      const result = await processPayment(customerId, amount);
      if (!result.ok) {
        return result.error;
      }
      onSuccess();
    } catch {
      return "Failed to process payment";
    }
    return undefined;
  };

  const handleEditSuccess = () => {
    onSuccess();
  };

  if (activeForm === "credit") {
    return <AddCreditForm onSubmit={handleCreditSubmit} onCancel={onCancel} />;
  }

  if (activeForm === "pay") {
    return <ReceivePayForm onSubmit={handlePaySubmit} onCancel={onCancel} />;
  }

  if (activeForm === "edit" && customer) {
    return (
      <CustomerForm initialData={customer} onCancel={onCancel} onSuccess={handleEditSuccess} />
    );
  }

  return null;
}
