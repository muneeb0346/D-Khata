/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddCreditForm } from './AddCreditForm';

type OnSubmit = (data: { amount: number; description: string }) => Promise<string | undefined>;
type OnCancel = () => void;

const makeOnSubmit = (impl?: OnSubmit) => vi.fn(impl ?? (async () => undefined)) as unknown as OnSubmit;
const makeOnCancel = () => vi.fn() as unknown as OnCancel;

describe('AddCreditForm', () => {
  describe('Validation', () => {
    it('shows validation error when description is empty', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Description is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when amount is 0', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Test credit' } });
      fireEvent.change(amountInput, { target: { value: '0' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Amount must be greater than 0.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when amount is negative', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Test credit' } });
      fireEvent.change(amountInput, { target: { value: '-50' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Amount must be greater than 0.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when amount is non-numeric', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Test credit' } });
      fireEvent.change(amountInput, { target: { value: 'abc' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Amount must be greater than 0.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when description is whitespace only', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      fireEvent.change(descInput, { target: { value: '   ' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Description is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Valid submission', () => {
    it('valid submit calls onSubmit with correct data', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Goods delivered' } });
      fireEvent.change(amountInput, { target: { value: '500' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({ amount: 500, description: 'Goods delivered' });
    });

    it('trims description before passing to onSubmit', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: '  Trimmed desc  ' } });
      fireEvent.change(amountInput, { target: { value: '100' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({ amount: 100, description: 'Trimmed desc' });
    });

    it('converts amount string to Number in submit call', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Purchase' } });
      fireEvent.change(amountInput, { target: { value: '123' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({ amount: expect.any(Number), description: 'Purchase' });
      expect(onSubmit).toHaveBeenCalledWith({ amount: 123, description: 'Purchase' });
    });
  });

  describe('Submit error handling', () => {
    it('displays error string from onSubmit as submit error', async () => {
      const onSubmit = makeOnSubmit(async () => 'Insufficient balance');
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Credit' } });
      fireEvent.change(amountInput, { target: { value: '100' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Insufficient balance');
      });
    });

    it('does not show submit error when onSubmit returns undefined', async () => {
      const onSubmit = makeOnSubmit();
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Credit' } });
      fireEvent.change(amountInput, { target: { value: '100' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    it('cancel calls onCancel', () => {
      const onCancel = makeOnCancel();
      render(<AddCreditForm onSubmit={makeOnSubmit()} onCancel={onCancel} />);
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('disables Add Credit button during loading', async () => {
      let resolveSubmit!: (value: string | undefined) => void;
      const onSubmit = makeOnSubmit(
        () => new Promise<string | undefined>((resolve) => { resolveSubmit = resolve; })
      );
      render(<AddCreditForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const descInput = screen.getByLabelText(/Description/);
      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(descInput, { target: { value: 'Credit' } });
      fireEvent.change(amountInput, { target: { value: '50' } });

      const submitBtn = screen.getByRole('button', { name: 'Add Credit' });
      await fireEvent.click(submitBtn);
      expect(submitBtn).toHaveAttribute('aria-busy', 'true');
      expect(submitBtn).toHaveTextContent('Adding...');
      expect(submitBtn).toBeDisabled();

      resolveSubmit(undefined);
    });
  });
});
