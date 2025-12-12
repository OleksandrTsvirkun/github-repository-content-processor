import { ulid as generateUlid } from "ulid";

/**
 * ULID - Universally Unique Lexicographically Sortable Identifier
 * Format: 26 characters, base32 encoding (0-9, A-Z without I, L, O, U)
 * Example: 01JA2B3C4D5E6F7G8H9J0K1M2N
 *
 * Features:
 * - 128-bit uniqueness (like UUID)
 * - Lexicographically sortable
 * - Timestamp-based (first 10 chars)
 * - Case-insensitive
 */
export default class ULID {
  private constructor(public readonly value: string) {
    if (!ULID.isValid(value)) {
      throw new Error(`Invalid ULID format: "${value}". Expected 26 base32 characters`);
    }
  }

  /**
   * Generate a new ULID
   * @returns new ULID instance
   */
  static generate(): ULID {
    return new ULID(generateUlid());
  }

  /**
   * Create ULID from existing value
   * @param value - ULID string
   * @returns ULID instance
   * @throws Error if invalid format
   */
  static from(value: string): ULID {
    return new ULID(value);
  }

  /**
   * Check if a string is a valid ULID
   * @param value - string to validate
   * @returns true if valid
   */
  static isValid(value: string): boolean {
    // ULID: 26 characters, base32 (0-9, A-Z without I, L, O, U)
    return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Check equality
   * @param other - another ULID to compare with
   * @returns true if equal
   */
  equals(other: ULID): boolean {
    return this.value === other.value;
  }

  /**
   * Get timestamp from ULID
   * @returns Date object
   */
  getTimestamp(): Date {
    // First 10 characters encode timestamp
    const timestampPart = this.value.substring(0, 10);
    const base32Chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    let timestamp = 0;
    for (let i = 0; i < timestampPart.length; i++) {
      const char = timestampPart[i];
      if (!char) continue;
      const charValue = base32Chars.indexOf(char);
      timestamp = timestamp * 32 + charValue;
    }

    return new Date(timestamp);
  }
}
