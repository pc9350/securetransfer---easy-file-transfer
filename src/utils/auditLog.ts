import { AuditEvent, AuditEventType } from '../types';

// ============================================
// Audit Log Implementation
// ============================================

const MAX_EVENTS = 50;
const events: AuditEvent[] = [];

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Log an audit event
 */
export function logAuditEvent(
  event: AuditEventType,
  details: Record<string, unknown> = {},
  severity: 'info' | 'warning' | 'error' = 'info'
): AuditEvent {
  // Sanitize details - remove any sensitive information
  const sanitizedDetails = sanitizeDetails(details);
  
  const auditEvent: AuditEvent = {
    id: generateEventId(),
    timestamp: Date.now(),
    event,
    details: sanitizedDetails,
    severity,
  };
  
  // Add to circular buffer
  events.push(auditEvent);
  
  // Remove oldest events if over limit
  while (events.length > MAX_EVENTS) {
    events.shift();
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    const logMethod = severity === 'error' ? console.error : 
                      severity === 'warning' ? console.warn : 
                      console.log;
    logMethod(`[Audit] ${event}`, sanitizedDetails);
  }
  
  return auditEvent;
}

/**
 * Sanitize details to remove sensitive information
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(details)) {
    // Skip sensitive keys
    if (['pin', 'password', 'token', 'secret', 'key'].some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Truncate peer IDs for privacy
    if (key.toLowerCase().includes('peerid') && typeof value === 'string') {
      sanitized[key] = value.slice(0, 8) + '...';
      continue;
    }
    
    // Sanitize file paths
    if (key.toLowerCase().includes('filename') && typeof value === 'string') {
      // Only keep the last part of the path
      const parts = value.split(/[/\\]/);
      sanitized[key] = parts[parts.length - 1];
      continue;
    }
    
    sanitized[key] = value;
  }
  
  return sanitized;
}

/**
 * Get all audit events
 */
export function getAuditEvents(): readonly AuditEvent[] {
  return [...events];
}

/**
 * Get recent audit events
 */
export function getRecentEvents(count: number = 10): AuditEvent[] {
  return events.slice(-count);
}

/**
 * Get events by type
 */
export function getEventsByType(type: AuditEventType): AuditEvent[] {
  return events.filter(e => e.event === type);
}

/**
 * Get events by severity
 */
export function getEventsBySeverity(severity: 'info' | 'warning' | 'error'): AuditEvent[] {
  return events.filter(e => e.severity === severity);
}

/**
 * Clear all audit events
 */
export function clearAuditLog(): void {
  events.length = 0;
  
  if (import.meta.env.DEV) {
    console.log('[Audit] Log cleared');
  }
}

/**
 * Export audit log for debugging
 */
export function exportAuditLog(): string {
  return JSON.stringify(events, null, 2);
}

// ============================================
// Convenience Logging Functions
// ============================================

export function logRoomCreated(roomCode: string): void {
  logAuditEvent('room_created', { 
    roomCode: roomCode.slice(0, 4) + '****',
    timestamp: Date.now(),
  });
}

export function logConnectionAttempt(peerId: string, success: boolean): void {
  logAuditEvent('connection_attempt', { 
    peerId,
    success,
  }, success ? 'info' : 'warning');
}

export function logConnectionApproved(peerId: string): void {
  logAuditEvent('connection_approved', { peerId });
}

export function logConnectionDenied(peerId: string, reason?: string): void {
  logAuditEvent('connection_denied', { 
    peerId,
    reason: reason || 'User denied',
  }, 'warning');
}

export function logPinSet(): void {
  logAuditEvent('pin_set', {});
}

export function logPinVerified(): void {
  logAuditEvent('pin_verified', {});
}

export function logPinFailed(attemptNumber: number): void {
  logAuditEvent('pin_failed', { attemptNumber }, 'warning');
}

export function logFileValidationPassed(fileName: string, fileSize: number): void {
  logAuditEvent('file_validation_passed', { fileName, fileSize });
}

export function logFileValidationFailed(fileName: string, errors: string[]): void {
  logAuditEvent('file_validation_failed', { fileName, errors }, 'warning');
}

export function logTransferStarted(fileCount: number, totalSize: number): void {
  logAuditEvent('transfer_started', { fileCount, totalSize });
}

export function logTransferCompleted(fileCount: number, totalSize: number, duration: number): void {
  logAuditEvent('transfer_completed', { 
    fileCount, 
    totalSize,
    duration,
    avgSpeed: totalSize / (duration / 1000),
  });
}

export function logTransferFailed(reason: string): void {
  logAuditEvent('transfer_failed', { reason }, 'error');
}

export function logRateLimitExceeded(key: string): void {
  logAuditEvent('rate_limit_exceeded', { key }, 'warning');
}

export function logSessionTimeout(roomCode: string): void {
  logAuditEvent('session_timeout', { 
    roomCode: roomCode.slice(0, 4) + '****',
  });
}

export function logError(error: string, context?: Record<string, unknown>): void {
  logAuditEvent('error', { error, ...context }, 'error');
}

