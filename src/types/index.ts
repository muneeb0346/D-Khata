export type ApprovalStatus = 'PENDING' | 'VERIFIED' | 'DISPUTED';
export type SettlementStatus = 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'ADVANCE';
export type TransactionType = 'CREDIT' | 'PAYMENT';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  cnic?: string | null;
  totalBalance: number | null;
  createdAt?: string | Date | null;
}

export interface Transaction {
  id: string;
  customerId: string;
  date: string | Date;
  description: string;
  originalAmount: number;
  remainingBalance: number;
  type: string;
  approval: string;
  settlement: string;
}

export interface LedgerData {
  customer: Customer;
  transactions: Transaction[];
  pendingTransaction?: Transaction | null;
}
