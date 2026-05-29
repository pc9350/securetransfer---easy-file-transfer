import { describe, it, expect } from 'vitest';
import { parseIncomingMessage } from '../messageValidation';

const ts = Date.now();

// ─── Base structure ────────────────────────────────────────────────────────────

describe('parseIncomingMessage — base structure', () => {
  it('rejects null', () => {
    expect(parseIncomingMessage(null)).toBeNull();
  });

  it('rejects a plain string', () => {
    expect(parseIncomingMessage('hello')).toBeNull();
  });

  it('rejects an object missing type', () => {
    expect(parseIncomingMessage({ timestamp: ts, payload: null })).toBeNull();
  });

  it('rejects an unknown message type', () => {
    expect(parseIncomingMessage({ type: 'hacked', timestamp: ts, payload: null })).toBeNull();
  });

  it('rejects an object missing timestamp', () => {
    expect(parseIncomingMessage({ type: 'heartbeat', payload: null })).toBeNull();
  });
});

// ─── Messages with null payloads ──────────────────────────────────────────────

describe('parseIncomingMessage — null-payload messages', () => {
  for (const type of ['connection_approved', 'pin_verified', 'heartbeat', 'disconnect']) {
    it(`passes "${type}"`, () => {
      const result = parseIncomingMessage({ type, timestamp: ts, payload: null });
      expect(result).not.toBeNull();
      expect(result?.type).toBe(type);
    });
  }
});

// ─── connection_request ────────────────────────────────────────────────────────

describe('parseIncomingMessage — connection_request', () => {
  const validPayload = { peerId: 'peer-abc', deviceInfo: 'Mozilla/5.0', timestamp: ts };

  it('accepts a valid payload', () => {
    const result = parseIncomingMessage({ type: 'connection_request', timestamp: ts, payload: validPayload });
    expect(result?.type).toBe('connection_request');
  });

  it('rejects missing peerId', () => {
    expect(parseIncomingMessage({
      type: 'connection_request', timestamp: ts,
      payload: { deviceInfo: 'Mozilla', timestamp: ts },
    })).toBeNull();
  });

  it('rejects empty peerId', () => {
    expect(parseIncomingMessage({
      type: 'connection_request', timestamp: ts,
      payload: { peerId: '', deviceInfo: 'Mozilla', timestamp: ts },
    })).toBeNull();
  });
});

// ─── pin_required ─────────────────────────────────────────────────────────────

describe('parseIncomingMessage — pin_required', () => {
  const validSalt = 'a'.repeat(32);

  it('accepts a 32-char hex salt', () => {
    const result = parseIncomingMessage({ type: 'pin_required', timestamp: ts, payload: { salt: validSalt } });
    expect(result?.type).toBe('pin_required');
  });

  it('rejects a salt that is too short', () => {
    expect(parseIncomingMessage({ type: 'pin_required', timestamp: ts, payload: { salt: 'tooshort' } })).toBeNull();
  });

  it('rejects missing salt', () => {
    expect(parseIncomingMessage({ type: 'pin_required', timestamp: ts, payload: {} })).toBeNull();
  });
});

// ─── pin_attempt ──────────────────────────────────────────────────────────────

describe('parseIncomingMessage — pin_attempt', () => {
  const validHash = 'f'.repeat(64);

  it('accepts a valid payload', () => {
    const result = parseIncomingMessage({
      type: 'pin_attempt', timestamp: ts,
      payload: { hashedPin: validHash, attemptNumber: 1 },
    });
    expect(result?.type).toBe('pin_attempt');
  });

  it('rejects a hash that is too short (not 64 chars)', () => {
    expect(parseIncomingMessage({
      type: 'pin_attempt', timestamp: ts,
      payload: { hashedPin: 'abc123', attemptNumber: 1 },
    })).toBeNull();
  });

  it('rejects attempt number zero', () => {
    expect(parseIncomingMessage({
      type: 'pin_attempt', timestamp: ts,
      payload: { hashedPin: validHash, attemptNumber: 0 },
    })).toBeNull();
  });
});

// ─── batch_start ──────────────────────────────────────────────────────────────

describe('parseIncomingMessage — batch_start', () => {
  it('accepts a valid payload', () => {
    const result = parseIncomingMessage({
      type: 'batch_start', timestamp: ts,
      payload: { batchId: 'batch-1', totalFiles: 3, totalSize: 1024 * 1024 },
    });
    expect(result?.type).toBe('batch_start');
  });

  it('rejects totalFiles of zero', () => {
    expect(parseIncomingMessage({
      type: 'batch_start', timestamp: ts,
      payload: { batchId: 'batch-1', totalFiles: 0, totalSize: 100 },
    })).toBeNull();
  });

  it('rejects totalFiles above 500', () => {
    expect(parseIncomingMessage({
      type: 'batch_start', timestamp: ts,
      payload: { batchId: 'batch-1', totalFiles: 501, totalSize: 100 },
    })).toBeNull();
  });

  it('rejects totalSize above 10GB', () => {
    expect(parseIncomingMessage({
      type: 'batch_start', timestamp: ts,
      payload: { batchId: 'batch-1', totalFiles: 1, totalSize: 11 * 1024 * 1024 * 1024 },
    })).toBeNull();
  });

  it('rejects negative totalSize', () => {
    expect(parseIncomingMessage({
      type: 'batch_start', timestamp: ts,
      payload: { batchId: 'batch-1', totalFiles: 1, totalSize: -1 },
    })).toBeNull();
  });
});

// ─── file_metadata ────────────────────────────────────────────────────────────

describe('parseIncomingMessage — file_metadata', () => {
  const validPayload = {
    id: 'file-abc',
    name: 'photo.jpg',
    sanitizedName: 'photo.jpg',
    size: 1024,
    type: 'image/jpeg',
    lastModified: ts,
    totalChunks: 1,
    batchId: 'batch-1',
    fileIndex: 0,
    totalFilesInBatch: 1,
  };

  it('accepts a valid payload', () => {
    const result = parseIncomingMessage({ type: 'file_metadata', timestamp: ts, payload: validPayload });
    expect(result?.type).toBe('file_metadata');
  });

  it('rejects negative file size', () => {
    expect(parseIncomingMessage({
      type: 'file_metadata', timestamp: ts,
      payload: { ...validPayload, size: -1 },
    })).toBeNull();
  });

  it('rejects file size above 2GB', () => {
    expect(parseIncomingMessage({
      type: 'file_metadata', timestamp: ts,
      payload: { ...validPayload, size: 3 * 1024 * 1024 * 1024 },
    })).toBeNull();
  });

  it('rejects missing required fields', () => {
    const { name: _omit, ...withoutName } = validPayload;
    expect(parseIncomingMessage({ type: 'file_metadata', timestamp: ts, payload: withoutName })).toBeNull();
  });
});

// ─── file_complete ────────────────────────────────────────────────────────────

describe('parseIncomingMessage — file_complete', () => {
  it('accepts a valid payload', () => {
    const result = parseIncomingMessage({
      type: 'file_complete', timestamp: ts,
      payload: { fileId: 'file-abc', finalHash: 'a'.repeat(64) },
    });
    expect(result?.type).toBe('file_complete');
  });

  it('rejects empty fileId', () => {
    expect(parseIncomingMessage({
      type: 'file_complete', timestamp: ts,
      payload: { fileId: '', finalHash: 'abc' },
    })).toBeNull();
  });
});

// ─── Injection / oversized payloads ───────────────────────────────────────────

describe('parseIncomingMessage — injection / oversized', () => {
  it('rejects a peerId that is too long', () => {
    expect(parseIncomingMessage({
      type: 'connection_request', timestamp: ts,
      payload: { peerId: 'x'.repeat(201), deviceInfo: 'test', timestamp: ts },
    })).toBeNull();
  });

  it('rejects a deviceInfo that is too long', () => {
    expect(parseIncomingMessage({
      type: 'connection_request', timestamp: ts,
      payload: { peerId: 'peer-1', deviceInfo: 'x'.repeat(501), timestamp: ts },
    })).toBeNull();
  });
});
