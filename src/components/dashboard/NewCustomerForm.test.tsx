/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CustomerForm } from "./NewCustomerForm";
import { createCustomer, updateCustomer } from "@/server/actions";
import type { Customer } from "@/types";

vi.mock("@/server/actions", () => ({
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));

const mockedCreateCustomer = vi.mocked(createCustomer);
const mockedUpdateCustomer = vi.mocked(updateCustomer);

const defaultProps = {
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
};

const validCustomer: Customer = {
  id: "c1",
  name: "Ali Khan",
  phone: "03001234567",
  address: "House 1",
  cnic: "12345-1234567-1",
  totalBalance: 0,
};

function resetMocks() {
  mockedCreateCustomer.mockReset();
  mockedUpdateCustomer.mockReset();
  defaultProps.onCancel.mockClear();
  defaultProps.onSuccess.mockClear();
}

describe("NewCustomerForm (CustomerForm)", () => {
  beforeEach(resetMocks);

  describe("Create mode", () => {
    it('renders title "New Customer"', () => {
      render(<CustomerForm {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "New Customer" })).toBeInTheDocument();
    });

    it("pre-fills fields with empty values by default", () => {
      render(<CustomerForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText(/Phone/);
      const cnicInput = screen.getByLabelText(/CNIC/);
      expect(nameInput).toHaveValue("");
      expect(phoneInput).toHaveValue("03");
      expect(cnicInput).toHaveValue("");
    });
  });

  describe("Edit mode", () => {
    it('renders title "Edit Customer"', () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByRole("heading", { name: "Edit Customer" })).toBeInTheDocument();
    });

    it("pre-fills name from initialData", () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByLabelText(/Name/)).toHaveValue("Ali Khan");
    });

    it("pre-fills phone from initialData", () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByLabelText(/Phone/)).toHaveValue("03001234567");
    });

    it("pre-fills cnic from initialData", () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByLabelText(/CNIC/)).toHaveValue("12345-1234567-1");
    });

    it("pre-fills address from initialData", () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByLabelText(/Address/)).toHaveValue("House 1");
    });

    it("changes title to Save Changes in edit mode", () => {
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });
  });

  describe("Name sanitization", () => {
    it("strips digits from name field", () => {
      render(<CustomerForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: "Ali123 Khan" } });
      expect(nameInput).toHaveValue("Ali Khan");
    });

    it("strips symbols from name field", () => {
      render(<CustomerForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: "Ali!@#Khan" } });
      expect(nameInput).toHaveValue("AliKhan");
    });

    it("preserves letters, spaces, periods, apostrophes, and hyphens", () => {
      render(<CustomerForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: "O'Brien. O-Malley" } });
      expect(nameInput).toHaveValue("O'Brien. O-Malley");
    });
  });

  describe("Phone sanitization", () => {
    it("digits result in 11-char phone starting with 03", () => {
      render(<CustomerForm {...defaultProps} />);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(phoneInput, { target: { value: "03001234567" } });
      expect(phoneInput).toHaveValue("03001234567");
      expect((phoneInput as HTMLInputElement).value.length).toBe(11);
      expect((phoneInput as HTMLInputElement).value.startsWith("03")).toBe(true);
    });

    it("strips non-digit characters from phone", () => {
      render(<CustomerForm {...defaultProps} />);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(phoneInput, { target: { value: "03-00-1234567" } });
      expect(phoneInput).toHaveValue("03001234567");
    });

    it("handles 10-digit input by prepending 03", () => {
      render(<CustomerForm {...defaultProps} />);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(phoneInput, { target: { value: "001234567" } });
      expect(phoneInput).toHaveValue("03001234567");
    });
  });

  describe("CNIC formatting", () => {
    it("auto-formats with dashes (xxxxx-xxxxxxx-x)", () => {
      render(<CustomerForm {...defaultProps} />);
      const cnicInput = screen.getByLabelText(/CNIC/);
      fireEvent.change(cnicInput, { target: { value: "1234512345671" } });
      expect(cnicInput).toHaveValue("12345-1234567-1");
    });

    it("caps input at 15 characters", () => {
      render(<CustomerForm {...defaultProps} />);
      const cnicInput = screen.getByLabelText(/CNIC/);
      fireEvent.change(cnicInput, { target: { value: "12345123456789999" } });
      expect((cnicInput as HTMLInputElement).value.length).toBeLessThanOrEqual(15);
    });

    it("strips non-digit characters before formatting", () => {
      render(<CustomerForm {...defaultProps} />);
      const cnicInput = screen.getByLabelText(/CNIC/);
      fireEvent.change(cnicInput, { target: { value: "12345-1234567-1" } });
      expect(cnicInput).toHaveValue("12345-1234567-1");
    });
  });

  describe("Create submission", () => {
    it("valid create submit calls createCustomer with correct payload", async () => {
      mockedCreateCustomer.mockResolvedValueOnce({ ok: true, customer: validCustomer });
      render(<CustomerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText(/Phone/);
      const addressInput = screen.getByLabelText(/Address/);
      const cnicInput = screen.getByLabelText(/CNIC/);

      fireEvent.change(nameInput, { target: { value: "Ali Khan" } });
      fireEvent.change(phoneInput, { target: { value: "03001234567" } });
      fireEvent.change(addressInput, { target: { value: "House 1" } });
      fireEvent.change(cnicInput, { target: { value: "1234512345671" } });

      const submitBtn = screen.getByRole("button", { name: "Add Customer" });
      await fireEvent.click(submitBtn);

      expect(mockedCreateCustomer).toHaveBeenCalledWith({
        name: "Ali Khan",
        phone: "03001234567",
        address: "House 1",
        cnic: "12345-1234567-1",
      });
    });

    it("createCustomer returning {ok: true, customer} triggers onSuccess", async () => {
      mockedCreateCustomer.mockResolvedValueOnce({ ok: true, customer: validCustomer });
      render(<CustomerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(nameInput, { target: { value: "Ali Khan" } });
      fireEvent.change(phoneInput, { target: { value: "03001234567" } });

      const submitBtn = screen.getByRole("button", { name: "Add Customer" });
      await fireEvent.click(submitBtn);

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("createCustomer returning {ok: false, error} displays error and does NOT call onSuccess", async () => {
      mockedCreateCustomer.mockResolvedValueOnce({ ok: false, error: "Phone must be 11 digits." });
      render(<CustomerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(nameInput, { target: { value: "Ali Khan" } });
      fireEvent.change(phoneInput, { target: { value: "03001234567" } });

      const submitBtn = screen.getByRole("button", { name: "Add Customer" });
      await fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Phone must be 11 digits.");
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("create returning error without address or cnic fields", async () => {
      mockedCreateCustomer.mockResolvedValueOnce({
        ok: true,
        customer: { ...validCustomer, address: undefined, cnic: undefined },
      });
      render(<CustomerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText(/Phone/);
      fireEvent.change(nameInput, { target: { value: "Sara Khan" } });
      fireEvent.change(phoneInput, { target: { value: "03991234567" } });

      const submitBtn = screen.getByRole("button", { name: "Add Customer" });
      await fireEvent.click(submitBtn);

      expect(mockedCreateCustomer).toHaveBeenCalledWith({
        name: "Sara Khan",
        phone: "03991234567",
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  describe("Edit submission", () => {
    it("edit submit calls updateCustomer with initialData.id and updated data", async () => {
      mockedUpdateCustomer.mockResolvedValueOnce({ ok: true, customer: validCustomer });
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);

      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      const submitBtn = screen.getByRole("button", { name: "Save Changes" });
      await fireEvent.click(submitBtn);

      expect(mockedUpdateCustomer).toHaveBeenCalledWith("c1", {
        name: "Updated Name",
        phone: "03001234567",
        address: "House 1",
        cnic: "12345-1234567-1",
      });
    });

    it("edit mode shows loading state during submit", async () => {
      let resolvePromise: (value: { ok: true; customer: Customer }) => void;
      mockedUpdateCustomer.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );
      render(<CustomerForm {...defaultProps} initialData={validCustomer} />);

      const submitBtn = screen.getByRole("button", { name: "Save Changes" });
      await fireEvent.click(submitBtn);
      expect(submitBtn).toHaveAttribute("aria-busy", "true");
      expect(submitBtn).toHaveTextContent("Saving...");

      resolvePromise!({ ok: true, customer: validCustomer });
    });
  });

  describe("Cancel", () => {
    it("cancel calls onCancel", () => {
      render(<CustomerForm {...defaultProps} />);
      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelBtn);
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });
});
