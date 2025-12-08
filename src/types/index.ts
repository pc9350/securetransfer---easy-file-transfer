// ============================================
// Connection Types
// ============================================

export type ConnectionState = 
  | 'idle'
  | 'connecting'
  | 'awaiting_approval'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'error'
  | 'disconnected';

export interface ConnectionInfo {
  state: ConnectionState;
  peerId: string | null;
  remotePeerId: string | null;
  roomCode: string | null;
  connectedAt: number | null;
  error: string | null;
  isPinRequired: boolean;
  isPinVerified: boolean;
}

// ============================================
// File Types
// ============================================

export interface FileMetadata {
  id: string;
  name: string;
  sanitizedName: string;
  size: number;
  type: string;
  lastModified: number;
  totalChunks: number;
  hash?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileWithPreview extends File {
  id: string;
  preview?: string;
  validationResult?: FileValidationResult;
}

// ============================================
// Transfer Types
// ============================================

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface BatchProgress {
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  bytesTransferred: number;
  overallPercentage: number;
  averageSpeed: number;
  currentFileId: string | null;
  status: 'idle' | 'transferring' | 'completed' | 'failed' | 'cancelled';
}

export interface TransferSession {
  id: string;
  startedAt: number;
  files: TransferProgress[];
  batch: BatchProgress;
}

// ============================================
// Peer Message Types (WebRTC Data Channel)
// ============================================

export type PeerMessageType =
  | 'connection_request'
  | 'connection_approved'
  | 'connection_denied'
  | 'pin_required'
  | 'pin_attempt'
  | 'pin_verified'
  | 'pin_invalid'
  | 'file_metadata'
  | 'file_chunk'
  | 'file_complete'
  | 'file_verified'
  | 'file_error'
  | 'batch_start'
  | 'batch_complete'
  | 'heartbeat'
  | 'disconnect';

export interface PeerMessage {
  type: PeerMessageType;
  timestamp: number;
  payload: unknown;
}

export interface ConnectionRequestPayload {
  deviceInfo: string;
  timestamp: number;
}

export interface PinAttemptPayload {
  hashedPin: string;
  attemptNumber: number;
}

export interface FileMetadataPayload extends FileMetadata {
  batchId: string;
  fileIndex: number;
  totalFilesInBatch: number;
}

export interface FileChunkPayload {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  checksum: string;
}

export interface FileCompletePayload {
  fileId: string;
  finalHash: string;
}

// ============================================
// Security Types
// ============================================

export interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil: number | null;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  event: AuditEventType;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

export type AuditEventType =
  | 'room_created'
  | 'connection_attempt'
  | 'connection_approved'
  | 'connection_denied'
  | 'pin_set'
  | 'pin_verified'
  | 'pin_failed'
  | 'file_validation_passed'
  | 'file_validation_failed'
  | 'transfer_started'
  | 'transfer_completed'
  | 'transfer_failed'
  | 'rate_limit_exceeded'
  | 'session_timeout'
  | 'error';

// ============================================
// UI Types
// ============================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// ============================================
// Device Detection
// ============================================

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
  browser: string;
  browserVersion: string;
  supportsWebRTC: boolean;
  supportsFileSystemAccess: boolean;
}

// ============================================
// Constants
// ============================================

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  MAX_SESSION_SIZE: 10 * 1024 * 1024 * 1024, // 10GB
  CHUNK_SIZE: 64 * 1024, // 64KB
  MAX_FILES_PER_BATCH: 500,
} as const;

export const SECURITY_CONSTANTS = {
  ROOM_CODE_LENGTH: 8,
  ROOM_CODE_EXPIRY_MS: 60 * 60 * 1000, // 60 minutes
  PIN_LENGTH: 4,
  MAX_PIN_ATTEMPTS: 3,
  MAX_CONNECTION_ATTEMPTS: 3,
  CONNECTION_ATTEMPT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  APPROVAL_TIMEOUT_MS: 30 * 1000, // 30 seconds
  HEARTBEAT_INTERVAL_MS: 5 * 1000, // 5 seconds
  CONNECTION_TIMEOUT_MS: 30 * 1000, // 30 seconds
} as const;

export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  videos: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
} as const;

export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash', '.zsh',
  '.app', '.dmg', '.pkg',
  '.apk', '.deb', '.rpm',
] as const;

