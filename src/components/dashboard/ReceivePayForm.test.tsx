/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReceivePayForm } from "./ReceivePayForm";

type OnSubmit = (amount: number) => Promise<string | undefined>;
type OnCancel = () => void;

const makeOnSubmit = (impl?: OnSubmit) =>
  vi.fn(impl ?? (async () => undefined)) as unknown as OnSubmit;
const makeOnCancel = () => vi.fn() as unknown as OnCancel;

describe("ReceivePayForm", () => {
  describe("Validation", () => {
    it("shows validation error when amount is 0", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "0" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(screen.getByText("Amount must be greater than 0.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error when amount is negative", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "-50" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(screen.getByText("Amount must be greater than 0.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error when amount is non-numeric", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "abc" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(screen.getByText("Amount must be greater than 0.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error when amount is empty", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(screen.getByText("Amount must be greater than 0.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Valid submission", () => {
    it("valid submit calls onSubmit with Number(amount)", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "250" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith(expect.any(Number));
      expect(onSubmit).toHaveBeenCalledWith(250);
    });

    it("converts amount string to number for valid submission", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "100" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      const callArg = (onSubmit as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
      expect(typeof callArg).toBe("number");
      expect(callArg).toBe(100);
    });
  });

  describe("Submit error handling", () => {
    it("displays error string from onSubmit", async () => {
      const onSubmit = makeOnSubmit(async () => "Insufficient funds");
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "100" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Insufficient funds");
      });
    });

    it("does not show submit error when onSubmit returns undefined", async () => {
      const onSubmit = makeOnSubmit();
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "100" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Cancel", () => {
    it("cancel calls onCancel", () => {
      const onCancel = makeOnCancel();
      render(<ReceivePayForm onSubmit={makeOnSubmit()} onCancel={onCancel} />);
      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    it("disables Receive Pay button during loading", async () => {
      let resolveSubmit!: (value: string | undefined) => void;
      const onSubmit = makeOnSubmit(
        () =>
          new Promise<string | undefined>((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      render(<ReceivePayForm onSubmit={onSubmit} onCancel={makeOnCancel()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      fireEvent.change(amountInput, { target: { value: "50" } });

      const submitBtn = screen.getByRole("button", { name: "Receive Pay" });
      await fireEvent.click(submitBtn);
      expect(submitBtn).toHaveAttribute("aria-busy", "true");
      expect(submitBtn).toHaveTextContent("Processing...");
      expect(submitBtn).toBeDisabled();

      resolveSubmit(undefined);
    });
  });

  describe("Title", () => {
    it('renders title "Receive Payment"', () => {
      render(<ReceivePayForm onSubmit={makeOnSubmit()} onCancel={makeOnCancel()} />);
      expect(screen.getByRole("heading", { name: "Receive Payment" })).toBeInTheDocument();
    });
  });
});
