/** Convert a phone number (any format) to the internal Supabase email used for parent auth. */
export function phoneToParentEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@parents.educompanion.app`;
}

/** Extract digits-only from a phone string for DB comparisons. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Format a raw phone string for human-readable display. */
export function formatParentPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12 && digits.slice(-12, -10) === '91') {
    const local = digits.slice(-10);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  if (digits.length >= 10) {
    const local = digits.slice(-10);
    return `${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return digits;
}
