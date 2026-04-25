export const PHONE_LENGTH = 11;
export const CNIC_DIGIT_COUNT = 13;
export const CNIC_DASH_POSITIONS = [5, 12];
export const CNIC_MAX_LENGTH = 15;
const PHONE_PREFIX = '03';
const PHONE_REMAINING = PHONE_LENGTH - PHONE_PREFIX.length;

export function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z\s.'-]/g, '');
}

export function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith(PHONE_PREFIX)) {
    return digits.slice(0, PHONE_LENGTH);
  }
  if (digits.startsWith('0')) {
    return PHONE_PREFIX + digits.slice(1, PHONE_REMAINING + 1);
  }
  return PHONE_PREFIX + digits.slice(0, PHONE_REMAINING);
}

export function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, CNIC_DIGIT_COUNT);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (CNIC_DASH_POSITIONS.includes(i)) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  return formatted;
}
