"use server";

import { db } from "@/server/db";
import { customers } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import type { Customer } from "@/types";

type CustomerPayload = {
  name: string;
  phone: string;
  address?: string;
  cnic?: string;
};
import { validateCustomerData } from "@/server/lib/validation";
import { CustomerPayloadSchema } from "@/server/lib/schemas";

type CustomerActionResult =
  | { ok: true; customer: Customer }
  | { ok: false; error: string };

async function findExistingCustomerByPhoneOrCnic(
  customerData: CustomerPayload,
  excludeCustomerId?: string,
) {
  const phoneWhere = excludeCustomerId
    ? and(
        eq(customers.phone, customerData.phone),
        ne(customers.id, excludeCustomerId),
      )
    : eq(customers.phone, customerData.phone);

  const cnicWhere = excludeCustomerId
    ? and(
        eq(customers.cnic, customerData.cnic as string),
        ne(customers.id, excludeCustomerId),
      )
    : eq(customers.cnic, customerData.cnic as string);

  const existingCustomerByPhone = await db.query.customers.findFirst({
    where: phoneWhere,
  });

  const existingCustomerByCnic = customerData.cnic
    ? await db.query.customers.findFirst({
        where: cnicWhere,
      })
    : null;

  return existingCustomerByPhone ?? existingCustomerByCnic;
}

export async function updateCustomer(
  customerId: string,
  customerData: CustomerPayload,
): Promise<CustomerActionResult> {
  const parsed = CustomerPayloadSchema.safeParse(customerData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const validationError = validateCustomerData(customerData);
  if (validationError) {
    return validationError;
  }

  const existingCustomer = await findExistingCustomerByPhoneOrCnic(
    customerData,
    customerId,
  );

  if (existingCustomer) {
    return {
      ok: false,
      error: "Another customer with this phone number or CNIC already exists.",
    };
  }

  const [updatedCustomer] = await db
    .update(customers)
    .set({
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address ?? null,
      cnic: customerData.cnic ?? null,
    })
    .where(eq(customers.id, customerId))
    .returning();

  return { ok: true, customer: updatedCustomer };
}

export async function createCustomer(
  customerData: CustomerPayload,
): Promise<CustomerActionResult> {
  const parsed = CustomerPayloadSchema.safeParse(customerData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const validationError = validateCustomerData(customerData);
  if (validationError) {
    return validationError;
  }

  const existingCustomer =
    await findExistingCustomerByPhoneOrCnic(customerData);

  if (existingCustomer) {
    return {
      ok: false,
      error: "A customer with this phone number or CNIC already exists.",
    };
  }

  const id = crypto.randomUUID();

  const [newCustomer] = await db
    .insert(customers)
    .values({
      id,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address ?? null,
      cnic: customerData.cnic ?? null,
    })
    .returning();

  return { ok: true, customer: newCustomer };
}
