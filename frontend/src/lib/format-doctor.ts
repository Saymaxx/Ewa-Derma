/**
 * Formats a doctor's full name safely, preventing duplicated "Dr. Dr." prefixes.
 */
export function formatDoctorName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (!first && !last) return 'Doctor';

  // Check if first name already starts with "Dr." or "Dr"
  const hasDr = /^dr\.?\s*/i.test(first);
  if (hasDr) {
    // If it starts with "Dr." or "Dr ", ensure standard casing
    return `${first.replace(/^dr\.?\s*/i, 'Dr. ')} ${last}`.trim();
  }

  return `Dr. ${first} ${last}`.trim();
}
