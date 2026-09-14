type CustomerPayload = {
  name: string;
  phone: string;
  address?: string;
  cnic?: string;
};

type ActionFailure = { ok: false; error: string };

function hasValidPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 11;
}

export function validateCustomerData(customerData: CustomerPayload): ActionFailure | null {
  if (!customerData.name || /\d/.test(customerData.name)) {
    return { ok: false, error: 'Name is required.' };
  }

  if (!hasValidPhone(customerData.phone)) {
    return { ok: false, error: 'Phone must be 11 digits.' };
  }

  if (customerData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(customerData.cnic)) {
    return { ok: false, error: 'CNIC must follow the format xxxxx-xxxxxxx-x.' };
  }

  return null;
}

export { hasValidPhone };
