/**
 * Utility for formatting phone numbers into WhatsApp Meta Cloud API international format.
 *
 * WhatsApp Cloud API requires recipient phone numbers to:
 * - Contain the country code (e.g. 91 for India)
 * - Contain ONLY digits (no leading '+', no leading '00', no spaces, dashes, or parentheses)
 * - Be between 10 and 15 digits in total length
 */

export interface PhoneFormatResult {
  isValid: boolean;
  formattedNumber?: string;
  error?: string;
}

/**
 * Formats a given phone number into WhatsApp international format.
 * Returns null if the phone number is invalid or cannot be parsed.
 *
 * @param phone Raw phone string from database or user input
 * @param defaultCountryCode Default country code if missing (default: '91' for India)
 * @returns Formatted number string (e.g., '919876543210') or null if invalid
 */
export function formatWhatsAppNumber(
  phone: string | null | undefined,
  defaultCountryCode: string = '91',
): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Strip all whitespace, hyphens, parentheses, and dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip leading '+' if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Strip leading international access code '00'
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Verify that only digits remain
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  // Handle Indian 10-digit mobile numbers with leading 0 (e.g. 09876543210)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If exactly 10 digits (standard Indian mobile format)
  if (cleaned.length === 10) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  // Standard E.164 length is between 10 and 15 digits
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Validates and formats a phone number, returning a detailed result object.
 */
export function validateAndFormatWhatsAppNumber(
  phone: string | null | undefined,
  defaultCountryCode: string = '91',
): PhoneFormatResult {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return {
      isValid: false,
      error: 'Phone number is empty or missing',
    };
  }

  const formatted = formatWhatsAppNumber(phone, defaultCountryCode);
  if (!formatted) {
    return {
      isValid: false,
      error: `Invalid or malformed phone number: "${phone}"`,
    };
  }

  return {
    isValid: true,
    formattedNumber: formatted,
  };
}
