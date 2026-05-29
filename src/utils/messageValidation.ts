import { z } from 'zod';
import type { PeerMessage } from '../types';

// ============================================
// Per-type payload schemas
// ============================================

const connectionRequestSchema = z.object({
  peerId: z.string().min(1).max(200),
  deviceInfo: z.string().max(500),
  timestamp: z.number(),
});

// salt is 16 random bytes encoded as 32 hex chars
const pinRequiredSchema = z.object({
  salt: z.string().length(32),
});

// PBKDF2 output is 32 bytes → 64 hex chars
const pinAttemptSchema = z.object({
  hashedPin: z.string().length(64),
  attemptNumber: z.number().int().min(1).max(10),
});

const pinInvalidSchema = z.object({
  attemptsRemaining: z.number().int().min(0),
});

const connectionDeniedSchema = z.object({
  reason: z.string().max(200),
});

const fileMetadataSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  sanitizedName: z.string().min(1).max(500),
  size: z.number().nonnegative().max(2 * 1024 * 1024 * 1024),
  type: z.string().max(200),
  lastModified: z.number(),
  totalChunks: z.number().int().positive(),
  hash: z.string().optional(),
  batchId: z.string().min(1).max(100),
  fileIndex: z.number().int().nonnegative(),
  totalFilesInBatch: z.number().int().positive().max(500),
});

const fileChunkSchema = z.object({
  fileId: z.string().min(1).max(100),
  chunkIndex: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive(),
  // data arrives as ArrayBuffer (binary serialisation via PeerJS) — type-checked at use site
  data: z.unknown(),
  checksum: z.string().min(1).max(64),
});

const fileCompleteSchema = z.object({
  fileId: z.string().min(1).max(100),
  finalHash: z.string().max(128),
});

const fileErrorSchema = z.object({
  fileId: z.string().min(1).max(100),
  error: z.string().max(500),
});

const batchStartSchema = z.object({
  batchId: z.string().min(1).max(100),
  totalFiles: z.number().int().positive().max(500),
  totalSize: z.number().nonnegative().max(10 * 1024 * 1024 * 1024),
});

const batchCompleteSchema = z.object({
  batchId: z.string().min(1).max(100),
});

// ============================================
// Entry-point validator
// ============================================

const baseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  payload: z.unknown(),
});

const KNOWN_TYPES = new Set([
  'connection_request', 'connection_approved', 'connection_denied',
  'pin_required', 'pin_attempt', 'pin_verified', 'pin_invalid',
  'file_metadata', 'file_chunk', 'file_complete', 'file_verified', 'file_error',
  'batch_start', 'batch_complete',
  'heartbeat', 'disconnect',
]);

const PAYLOAD_SCHEMAS: Partial<Record<string, z.ZodTypeAny>> = {
  connection_request: connectionRequestSchema,
  pin_required:       pinRequiredSchema,
  pin_attempt:        pinAttemptSchema,
  pin_invalid:        pinInvalidSchema,
  connection_denied:  connectionDeniedSchema,
  file_metadata:      fileMetadataSchema,
  file_chunk:         fileChunkSchema,
  file_complete:      fileCompleteSchema,
  file_error:         fileErrorSchema,
  batch_start:        batchStartSchema,
  batch_complete:     batchCompleteSchema,
};

/**
 * Parse and validate an incoming raw message from PeerJS.
 * Returns null and logs a warning for any malformed or unknown message,
 * preventing unvalidated data from reaching the application handlers.
 */
export function parseIncomingMessage(raw: unknown): PeerMessage | null {
  const base = baseMessageSchema.safeParse(raw);
  if (!base.success) {
    console.warn('[MessageValidation] Dropped malformed message (missing base fields):', base.error.issues);
    return null;
  }

  const { type, timestamp, payload } = base.data;

  if (!KNOWN_TYPES.has(type)) {
    console.warn('[MessageValidation] Dropped unknown message type:', type);
    return null;
  }

  const schema = PAYLOAD_SCHEMAS[type];
  if (schema) {
    const result = schema.safeParse(payload);
    if (!result.success) {
      console.warn(`[MessageValidation] Dropped "${type}" — invalid payload:`, result.error.issues);
      return null;
    }
  }

  return { type: type as PeerMessage['type'], timestamp, payload };
}
