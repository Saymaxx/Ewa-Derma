import {
  formatWhatsAppNumber,
  validateAndFormatWhatsAppNumber,
} from './phone-formatter.util';

describe('PhoneFormatterUtil', () => {
  describe('formatWhatsAppNumber', () => {
    it('should format 10-digit Indian local phone number with country code 91', () => {
      const result = formatWhatsAppNumber('9876543210');
      expect(result).toBe('919876543210');
    });

    it('should strip leading zero from 11-digit Indian phone number and prepend 91', () => {
      const result = formatWhatsAppNumber('09876543210');
      expect(result).toBe('919876543210');
    });

    it('should handle +91 format and strip leading + and spaces', () => {
      const result = formatWhatsAppNumber('+91 98765 43210');
      expect(result).toBe('919876543210');
    });

    it('should handle hyphens and brackets in +91 formatted numbers', () => {
      const result = formatWhatsAppNumber('+91-(9876)-543210');
      expect(result).toBe('919876543210');
    });

    it('should handle numbers already in 12-digit 91XXXXXXXXXX format', () => {
      const result = formatWhatsAppNumber('919876543210');
      expect(result).toBe('919876543210');
    });

    it('should handle international numbers with country codes', () => {
      const result = formatWhatsAppNumber('+14155552671');
      expect(result).toBe('14155552671');
    });

    it('should handle international numbers with 00 prefix', () => {
      const result = formatWhatsAppNumber('00447911123456');
      expect(result).toBe('447911123456');
    });

    it('should return null for empty or whitespace-only inputs', () => {
      expect(formatWhatsAppNumber('')).toBeNull();
      expect(formatWhatsAppNumber('   ')).toBeNull();
      expect(formatWhatsAppNumber(null as any)).toBeNull();
      expect(formatWhatsAppNumber(undefined as any)).toBeNull();
    });

    it('should return null for non-numeric characters', () => {
      expect(formatWhatsAppNumber('abcdefghij')).toBeNull();
      expect(formatWhatsAppNumber('98765abcde')).toBeNull();
    });

    it('should return null for too short phone numbers', () => {
      expect(formatWhatsAppNumber('12345')).toBeNull();
      expect(formatWhatsAppNumber('987654')).toBeNull();
    });

    it('should return null for too long phone numbers exceeding E.164 max length', () => {
      expect(formatWhatsAppNumber('12345678901234567890')).toBeNull();
    });
  });

  describe('validateAndFormatWhatsAppNumber', () => {
    it('should return isValid: true and formattedNumber for valid inputs', () => {
      const result = validateAndFormatWhatsAppNumber('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.formattedNumber).toBe('919876543210');
      expect(result.error).toBeUndefined();
    });

    it('should return isValid: false and clear error for empty inputs', () => {
      const result = validateAndFormatWhatsAppNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty or missing');
    });

    it('should return isValid: false and descriptive error for malformed inputs', () => {
      const result = validateAndFormatWhatsAppNumber('invalid-phone');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid or malformed phone number');
    });
  });
});
