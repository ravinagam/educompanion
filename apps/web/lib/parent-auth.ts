/** Convert a phone number (any format) to the internal Supabase email used for parent auth. */
export function phoneToParentEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@parents.educompanion.app`;
}

/** Extract digits-only from a phone string for DB comparisons. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
