/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CustomerList } from './CustomerList';
import type { Customer } from '@/types';

const mockCustomers: Customer[] = [
  { id: '1', name: 'Ali Khan', phone: '03001111111', totalBalance: 500 },
  { id: '2', name: 'Sara Ahmed', phone: '03452222222', totalBalance: -300 },
  { id: '3', name: 'Omar Ali', phone: '03333333333', totalBalance: 200 },
];

const defaultProps = {
  customers: mockCustomers,
  isLoading: false,
  onSelectCustomer: vi.fn(),
};

describe('CustomerList', () => {
  describe('Totals', () => {
    it('renders Total Debt card with correct sum of positive balances', () => {
      render(<CustomerList {...defaultProps} />);
      expect(screen.getByText('Total Debt')).toBeInTheDocument();
      expect(screen.getByText('Rs. 700')).toBeInTheDocument();
    });

    it('renders Total Advance card with correct sum of absolute negative balances', () => {
      render(<CustomerList {...defaultProps} />);
      expect(screen.getByText('Total Advance')).toBeInTheDocument();
      expect(screen.getByText('Rs. 300')).toBeInTheDocument();
    });

    it('shows zero totals when all customers have zero balance', () => {
      const zeroCustomers: Customer[] = [
        { id: '1', name: 'Test', phone: '03000000000', totalBalance: 0 },
      ];
      render(<CustomerList {...defaultProps} customers={zeroCustomers} />);
      const debtCard = screen.getByLabelText(/Filter customers with outstanding debt/);
      expect(debtCard).toContainHTML('Rs. 0');
      const advanceCard = screen.getByLabelText(/Filter customers with advance or settled balance/);
      expect(advanceCard).toContainHTML('Rs. 0');
    });
  });

  describe('Search filtering', () => {
    it('filters customers by name', () => {
      render(<CustomerList {...defaultProps} />);
      const search = screen.getByLabelText(/Search customers by name, phone, or CNIC/);
      fireEvent.change(search, { target: { value: 'Ali' } });
      expect(screen.getByRole('button', { name: /Ali Khan/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sara Ahmed/ })).not.toBeInTheDocument();
    });

    it('filters customers by phone', () => {
      render(<CustomerList {...defaultProps} />);
      const search = screen.getByLabelText(/Search customers by name, phone, or CNIC/);
      fireEvent.change(search, { target: { value: '0345' } });
      expect(screen.getByRole('button', { name: /Sara Ahmed/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ali Khan/ })).not.toBeInTheDocument();
    });

    it('shows empty-state message when filtered results have no matches', () => {
      render(<CustomerList {...defaultProps} />);
      const search = screen.getByLabelText(/Search customers by name, phone, or CNIC/);
      fireEvent.change(search, { target: { value: 'NonExistent' } });
      expect(screen.getByText('No customers match your search.')).toBeInTheDocument();
    });
  });

  describe('Balance filter', () => {
    it('debt filter shows only positive-balance customers', () => {
      render(<CustomerList {...defaultProps} />);
      const debtCard = screen.getByLabelText(/Filter customers with outstanding debt/);
      fireEvent.click(debtCard);
      expect(screen.getByRole('button', { name: /Ali Khan/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Omar Ali/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sara Ahmed/ })).not.toBeInTheDocument();
    });

    it('advance filter shows only non-positive-balance customers', () => {
      render(<CustomerList {...defaultProps} />);
      const advanceCard = screen.getByLabelText(/Filter customers with advance or settled balance/);
      fireEvent.click(advanceCard);
      expect(screen.getByRole('button', { name: /Sara Ahmed/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ali Khan/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Omar Ali/ })).not.toBeInTheDocument();
    });

    it('clicking active filter again deactivates it (toggle off)', () => {
      render(<CustomerList {...defaultProps} />);
      const debtCard = screen.getByLabelText(/Filter customers with outstanding debt/);
      fireEvent.click(debtCard);
      expect(debtCard).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(debtCard);
      expect(debtCard).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Sara Ahmed/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ali Khan/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Omar Ali/ })).toBeInTheDocument();
    });

    it('shows filtered-empty message when no customers match balance filter', () => {
      render(<CustomerList {...defaultProps} />);
      const advanceCard = screen.getByLabelText(/Filter customers with advance or settled balance/);
      fireEvent.click(advanceCard);
      const search = screen.getByLabelText(/Search customers by name, phone, or CNIC/);
      fireEvent.change(search, { target: { value: 'Ali' } });
      expect(screen.getByText('No advance customers match your search.')).toBeInTheDocument();
    });
  });

  describe('Customer selection', () => {
    it('clicking a customer row calls onSelectCustomer with correct id', () => {
      render(<CustomerList {...defaultProps} />);
      const aliButton = screen.getByRole('button', { name: /Ali Khan/ });
      fireEvent.click(aliButton);
      expect(defaultProps.onSelectCustomer).toHaveBeenCalledWith('1');
    });
  });

  describe('Empty state', () => {
    it('shows empty-state message when customers array is empty', () => {
      render(<CustomerList {...defaultProps} customers={[]} />);
      expect(screen.getByText('No customers yet. Add one to get started!')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Search customers by name, phone, or CNIC/)).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('renders Spinner when isLoading is true', () => {
      render(<CustomerList {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not render customer list when isLoading is true', () => {
      render(<CustomerList {...defaultProps} isLoading={true} />);
      expect(screen.queryByRole('button', { name: /View ledger for/ })).not.toBeInTheDocument();
    });
  });
});
