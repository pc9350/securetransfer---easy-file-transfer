import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePinSalt,
  hashPin,
  isValidPinFormat,
  sanitizeFileName,
  generateSecureRoomCode,
  isValidRoomCodeFormat,
  normalizeRoomCode,
  formatRoomCode,
  generateChecksum,
  verifyChecksum,
  isRateLimited,
  recordAttempt,
  clearRateLimit,
} from '../security';

// ─── PIN Salt ─────────────────────────────────────────────────────────────────

describe('generatePinSalt', () => {
  it('returns a 32-character hex string', () => {
    const salt = generatePinSalt();
    expect(salt).toHaveLength(32);
    expect(salt).toMatch(/^[0-9a-f]+$/);
  });

  it('returns a unique value each call', () => {
    const salts = new Set(Array.from({ length: 10 }, () => generatePinSalt()));
    expect(salts.size).toBe(10);
  });
});

// ─── PIN Hashing (PBKDF2) ─────────────────────────────────────────────────────

describe('hashPin', () => {
  it('returns a 64-character hex string', async () => {
    const salt = generatePinSalt();
    const hash = await hashPin('1234', salt);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same pin + salt always gives same hash', async () => {
    const salt = generatePinSalt();
    const hash1 = await hashPin('1234', salt);
    const hash2 = await hashPin('1234', salt);
    expect(hash1).toBe(hash2);
  });

  it('different salts produce different hashes for the same pin', async () => {
    const hash1 = await hashPin('1234', generatePinSalt());
    const hash2 = await hashPin('1234', generatePinSalt());
    expect(hash1).not.toBe(hash2);
  });

  it('different pins produce different hashes with the same salt', async () => {
    const salt = generatePinSalt();
    const hash1 = await hashPin('1234', salt);
    const hash2 = await hashPin('5678', salt);
    expect(hash1).not.toBe(hash2);
  });
});

// ─── PIN Format ───────────────────────────────────────────────────────────────

describe('isValidPinFormat', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPinFormat('0000')).toBe(true);
    expect(isValidPinFormat('1234')).toBe(true);
    expect(isValidPinFormat('9999')).toBe(true);
  });

  it('rejects non-digit characters', () => {
    expect(isValidPinFormat('abcd')).toBe(false);
    expect(isValidPinFormat('12 4')).toBe(false);
    expect(isValidPinFormat('12.4')).toBe(false);
  });

  it('rejects wrong lengths', () => {
    expect(isValidPinFormat('123')).toBe(false);
    expect(isValidPinFormat('12345')).toBe(false);
    expect(isValidPinFormat('')).toBe(false);
  });
});

// ─── Filename Sanitization ────────────────────────────────────────────────────

describe('sanitizeFileName', () => {
  it('removes path traversal sequences', () => {
    expect(sanitizeFileName('../etc/passwd')).not.toContain('..');
    expect(sanitizeFileName('../../secret')).not.toContain('..');
  });

  it('removes path separators', () => {
    expect(sanitizeFileName('folder/file.txt')).not.toContain('/');
    expect(sanitizeFileName('folder\\file.txt')).not.toContain('\\');
  });

  it('removes XSS-dangerous characters', () => {
    const result = sanitizeFileName('<script>alert(1)</script>.txt');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('keeps safe filenames unchanged', () => {
    expect(sanitizeFileName('photo.jpg')).toBe('photo.jpg');
    expect(sanitizeFileName('my document (v2).pdf')).toBe('my document (v2).pdf');
    expect(sanitizeFileName('résumé.docx')).toBe('résumé.docx');
  });

  it('returns unnamed_file for blank names', () => {
    expect(sanitizeFileName('')).toBe('unnamed_file');
    expect(sanitizeFileName('   ')).toBe('unnamed_file');
  });

  it('truncates names longer than 255 characters', () => {
    const long = 'a'.repeat(300) + '.txt';
    expect(sanitizeFileName(long).length).toBeLessThanOrEqual(255);
  });
});

// ─── Room Code ────────────────────────────────────────────────────────────────

describe('generateSecureRoomCode', () => {
  it('produces an 8+1 char formatted code (XXXX-XXXX)', () => {
    const code = generateSecureRoomCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('never uses ambiguous characters (0, O, I, 1, L)', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSecureRoomCode().replace('-', '');
      expect(code).not.toMatch(/[01IOL]/);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSecureRoomCode()));
    expect(codes.size).toBe(20);
  });
});

describe('isValidRoomCodeFormat', () => {
  it('accepts valid codes', () => {
    expect(isValidRoomCodeFormat('ABCD-EFGH')).toBe(true);
    expect(isValidRoomCodeFormat('ABCDEFGH')).toBe(true);  // without dash
    expect(isValidRoomCodeFormat('23456789')).toBe(true);
  });

  it('rejects wrong lengths', () => {
    expect(isValidRoomCodeFormat('ABC-DEFG')).toBe(false);
    expect(isValidRoomCodeFormat('ABCDEFGHI')).toBe(false);
    expect(isValidRoomCodeFormat('')).toBe(false);
  });

  it('rejects ambiguous characters', () => {
    expect(isValidRoomCodeFormat('0BCDEFGH')).toBe(false);
    expect(isValidRoomCodeFormat('ABCDEFG1')).toBe(false);
  });
});

describe('normalizeRoomCode', () => {
  it('removes dashes and converts to uppercase', () => {
    expect(normalizeRoomCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeRoomCode('ABCD-EFGH')).toBe('ABCDEFGH');
    expect(normalizeRoomCode('abcdefgh')).toBe('ABCDEFGH');
  });
});

describe('formatRoomCode', () => {
  it('inserts dash at position 4', () => {
    expect(formatRoomCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(formatRoomCode('abcdefgh')).toBe('ABCD-EFGH');
  });

  it('is idempotent on already-formatted codes', () => {
    expect(formatRoomCode('ABCD-EFGH')).toBe('ABCD-EFGH');
  });
});

// ─── Checksum ─────────────────────────────────────────────────────────────────

describe('generateChecksum', () => {
  it('returns a 16-character hex string', async () => {
    const data = new TextEncoder().encode('hello world').buffer as ArrayBuffer;
    const checksum = await generateChecksum(data);
    expect(checksum).toHaveLength(16);
    expect(checksum).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same input', async () => {
    const data = new TextEncoder().encode('test data').buffer as ArrayBuffer;
    expect(await generateChecksum(data)).toBe(await generateChecksum(data));
  });

  it('produces different checksums for different data', async () => {
    const a = new TextEncoder().encode('aaa').buffer as ArrayBuffer;
    const b = new TextEncoder().encode('bbb').buffer as ArrayBuffer;
    expect(await generateChecksum(a)).not.toBe(await generateChecksum(b));
  });
});

describe('verifyChecksum', () => {
  it('returns true when checksum matches', async () => {
    const data = new TextEncoder().encode('secure').buffer as ArrayBuffer;
    const checksum = await generateChecksum(data);
    expect(await verifyChecksum(data, checksum)).toBe(true);
  });

  it('returns false when data is tampered', async () => {
    const original = new TextEncoder().encode('original').buffer as ArrayBuffer;
    const tampered = new TextEncoder().encode('tampered').buffer as ArrayBuffer;
    const checksum = await generateChecksum(original);
    expect(await verifyChecksum(tampered, checksum)).toBe(false);
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe('rate limiting', () => {
  const TEST_KEY = 'test-peer-rate-limit';

  beforeEach(() => {
    clearRateLimit(TEST_KEY);
  });

  it('is not rate limited by default', () => {
    expect(isRateLimited(TEST_KEY)).toBe(false);
  });

  it('blocks after max attempts are reached', () => {
    recordAttempt(TEST_KEY, 3);
    recordAttempt(TEST_KEY, 3);
    recordAttempt(TEST_KEY, 3);
    expect(isRateLimited(TEST_KEY, 3)).toBe(true);
  });

  it('is not limited before max attempts', () => {
    recordAttempt(TEST_KEY, 3);
    recordAttempt(TEST_KEY, 3);
    expect(isRateLimited(TEST_KEY, 3)).toBe(false);
  });

  it('clearRateLimit removes the block', () => {
    recordAttempt(TEST_KEY, 1);
    expect(isRateLimited(TEST_KEY, 1)).toBe(true);
    clearRateLimit(TEST_KEY);
    expect(isRateLimited(TEST_KEY)).toBe(false);
  });
});
