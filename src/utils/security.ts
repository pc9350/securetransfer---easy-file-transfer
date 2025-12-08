import { SECURITY_CONSTANTS, RateLimitEntry } from '../types';

// ============================================
// Room Code Generation
// ============================================

// Base32 alphabet without ambiguous characters (0, O, I, 1, L)
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a cryptographically secure room code
 * Format: XXXX-XXXX (8 characters from base32 alphabet)
 * Provides ~40 bits of entropy (~1 trillion combinations)
 */
export function generateSecureRoomCode(): string {
  const array = new Uint8Array(SECURITY_CONSTANTS.ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);
  
  const code = Array.from(array)
    .map(byte => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length])
    .join('');
  
  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Validate room code format
 */
export function isValidRoomCodeFormat(code: string): boolean {
  // Remove dashes and convert to uppercase
  const normalized = code.replace(/-/g, '').toUpperCase();
  
  if (normalized.length !== SECURITY_CONSTANTS.ROOM_CODE_LENGTH) {
    return false;
  }
  
  // Check all characters are in the allowed alphabet
  return normalized.split('').every(char => ROOM_CODE_ALPHABET.includes(char));
}

/**
 * Normalize room code (remove dashes, uppercase)
 */
export function normalizeRoomCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase();
}

/**
 * Format room code for display (add dash)
 */
export function formatRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (normalized.length !== SECURITY_CONSTANTS.ROOM_CODE_LENGTH) {
    return code;
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

// ============================================
// PIN Hashing
// ============================================

/**
 * Hash PIN using SHA-256
 * Note: Even though WebRTC is encrypted, we hash the PIN as an extra layer
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// ============================================
// Input Sanitization
// ============================================

/**
 * Sanitize file name to prevent XSS and path traversal
 */
export function sanitizeFileName(name: string): string {
  // Remove path traversal attempts
  let sanitized = name.replace(/\.\./g, '');
  
  // Remove path separators
  sanitized = sanitized.replace(/[/\\]/g, '');
  
  // Remove special characters that could cause XSS
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Limit length to 255 characters
  if (sanitized.length > 255) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      const extension = sanitized.slice(ext);
      const baseName = sanitized.slice(0, 255 - extension.length);
      sanitized = baseName + extension;
    } else {
      sanitized = sanitized.slice(0, 255);
    }
  }
  
  // Ensure name is not empty
  if (!sanitized.trim()) {
    sanitized = 'unnamed_file';
  }
  
  return sanitized;
}

/**
 * Sanitize text for safe display (prevent XSS)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// Rate Limiting
// ============================================

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate limited
 */
export function isRateLimited(
  key: string,
  maxAttempts: number = SECURITY_CONSTANTS.MAX_CONNECTION_ATTEMPTS,
  windowMs: number = SECURITY_CONSTANTS.CONNECTION_ATTEMPT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return false;
  }
  
  // Check if blocked
  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return true;
  }
  
  // Check if window has expired
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.delete(key);
    return false;
  }
  
  return entry.attempts >= maxAttempts;
}

/**
 * Record an attempt for rate limiting
 */
export function recordAttempt(
  key: string,
  maxAttempts: number = SECURITY_CONSTANTS.MAX_CONNECTION_ATTEMPTS,
  windowMs: number = SECURITY_CONSTANTS.CONNECTION_ATTEMPT_WINDOW_MS,
  blockDurationMs: number = 5 * 60 * 1000 // 5 minutes block
): RateLimitEntry {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  
  if (!entry || now - entry.firstAttempt > windowMs) {
    entry = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
      blockedUntil: null,
    };
  } else {
    entry.attempts++;
    entry.lastAttempt = now;
    
    if (entry.attempts >= maxAttempts) {
      entry.blocked = true;
      entry.blockedUntil = now + blockDurationMs;
    }
  }
  
  rateLimitStore.set(key, entry);
  return entry;
}

/**
 * Clear rate limit for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ============================================
// Session Management
// ============================================

interface Session {
  roomCode: string;
  createdAt: number;
  expiresAt: number;
  pin?: string;
}

const sessionStore = new Map<string, Session>();

/**
 * Create a new session with room code
 */
export function createSession(roomCode: string): Session {
  const now = Date.now();
  const session: Session = {
    roomCode: normalizeRoomCode(roomCode),
    createdAt: now,
    expiresAt: now + SECURITY_CONSTANTS.ROOM_CODE_EXPIRY_MS,
  };
  
  sessionStore.set(session.roomCode, session);
  return session;
}

/**
 * Check if session is valid and not expired
 */
export function isSessionValid(roomCode: string): boolean {
  const normalized = normalizeRoomCode(roomCode);
  const session = sessionStore.get(normalized);
  
  if (!session) {
    return false;
  }
  
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(normalized);
    return false;
  }
  
  return true;
}

/**
 * Get session by room code
 */
export function getSession(roomCode: string): Session | undefined {
  const normalized = normalizeRoomCode(roomCode);
  return sessionStore.get(normalized);
}

/**
 * Set PIN for session
 */
export function setSessionPin(roomCode: string, hashedPin: string): boolean {
  const normalized = normalizeRoomCode(roomCode);
  const session = sessionStore.get(normalized);
  
  if (!session) {
    return false;
  }
  
  session.pin = hashedPin;
  sessionStore.set(normalized, session);
  return true;
}

/**
 * Destroy session
 */
export function destroySession(roomCode: string): void {
  const normalized = normalizeRoomCode(roomCode);
  sessionStore.delete(normalized);
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [code, session] of sessionStore) {
    if (now > session.expiresAt) {
      sessionStore.delete(code);
      cleaned++;
    }
  }
  
  return cleaned;
}

// ============================================
// Checksum Generation
// ============================================

/**
 * Generate a simple checksum for a chunk (for integrity verification)
 */
export async function generateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 16 characters of hash for efficiency
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify checksum
 */
export async function verifyChecksum(data: ArrayBuffer, expectedChecksum: string): Promise<boolean> {
  const actualChecksum = await generateChecksum(data);
  return actualChecksum === expectedChecksum;
}

// ============================================
// Device Fingerprint (for connection logging)
// ============================================

/**
 * Generate a simple device identifier (non-tracking, for logging only)
 */
export function generateDeviceId(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
  ].join('|');
  
  // Simple hash for anonymized logging
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36).slice(0, 8).toUpperCase();
}

