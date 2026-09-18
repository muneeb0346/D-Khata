import { z } from "zod";

export const CustomerPayloadSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().regex(/^03\d{9}$/, "Phone must be 11 digits starting with 03."),
  address: z.string().optional(),
  cnic: z
    .string()
    .regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC must follow the format xxxxx-xxxxxxx-x.")
    .optional(),
});

export const CreditPayloadSchema = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.number().int("Amount must be an integer.").positive("Amount must be greater than 0."),
});
