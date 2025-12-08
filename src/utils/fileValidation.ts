import { 
  ALLOWED_FILE_TYPES, 
  BLOCKED_EXTENSIONS, 
  FILE_CONSTANTS,
  FileValidationResult,
  FileMetadata 
} from '../types';
import { sanitizeFileName, generateChecksum } from './security';

// ============================================
// Magic Bytes (File Signatures)
// ============================================

const MAGIC_BYTES: Record<string, number[][]> = {
  // Images
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP has WEBP after size)
  
  // Videos
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]], // ftyp
  'video/quicktime': [[0x00, 0x00, 0x00]],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
  
  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // PK
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]], // OLE
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
};

// ============================================
// File Validation Functions
// ============================================

/**
 * Get file extension from name
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Check if file extension is blocked
 */
export function isBlockedExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return BLOCKED_EXTENSIONS.includes(ext as typeof BLOCKED_EXTENSIONS[number]);
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  const allAllowed: string[] = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.videos,
    ...ALLOWED_FILE_TYPES.documents,
    ...ALLOWED_FILE_TYPES.audio,
  ];
  return allAllowed.includes(mimeType);
}

/**
 * Verify file signature (magic bytes)
 */
export async function verifyFileSignature(file: File): Promise<boolean> {
  // Read first 12 bytes for signature check
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  const signatures = MAGIC_BYTES[file.type];
  if (!signatures) {
    // If we don't have signatures for this type, allow it but with warning
    return true;
  }
  
  return signatures.some(sig => 
    sig.every((byte, index) => bytes[index] === byte)
  );
}

/**
 * Get file category
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'audio' | 'unknown' {
  if ((ALLOWED_FILE_TYPES.images as readonly string[]).includes(mimeType)) return 'image';
  if ((ALLOWED_FILE_TYPES.videos as readonly string[]).includes(mimeType)) return 'video';
  if ((ALLOWED_FILE_TYPES.documents as readonly string[]).includes(mimeType)) return 'document';
  if ((ALLOWED_FILE_TYPES.audio as readonly string[]).includes(mimeType)) return 'audio';
  return 'unknown';
}

/**
 * Validate a single file
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file size
  if (file.size > FILE_CONSTANTS.MAX_FILE_SIZE) {
    const maxSizeGB = FILE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024 * 1024);
    errors.push(`File exceeds maximum size of ${maxSizeGB}GB`);
  }
  
  // Check for empty files
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Check blocked extensions
  if (isBlockedExtension(file.name)) {
    errors.push('This file type is not allowed for security reasons');
  }
  
  // Check MIME type
  if (!isAllowedMimeType(file.type)) {
    // Allow unknown types with warning
    if (file.type) {
      warnings.push(`File type "${file.type}" may not be fully supported`);
    } else {
      warnings.push('Unknown file type - proceed with caution');
    }
  }
  
  // Verify file signature for known types
  if (file.type && MAGIC_BYTES[file.type]) {
    const signatureValid = await verifyFileSignature(file);
    if (!signatureValid) {
      warnings.push('File signature does not match declared type');
    }
  }
  
  // Check for suspicious file names
  const sanitized = sanitizeFileName(file.name);
  if (sanitized !== file.name) {
    warnings.push('File name was modified for security');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple files (batch)
 */
export async function validateBatch(files: File[]): Promise<{
  validFiles: File[];
  invalidFiles: Array<{ file: File; result: FileValidationResult }>;
  totalSize: number;
  isWithinSessionLimit: boolean;
}> {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; result: FileValidationResult }> = [];
  let totalSize = 0;
  
  for (const file of files) {
    const result = await validateFile(file);
    
    if (result.isValid) {
      validFiles.push(file);
      totalSize += file.size;
    } else {
      invalidFiles.push({ file, result });
    }
  }
  
  const isWithinSessionLimit = totalSize <= FILE_CONSTANTS.MAX_SESSION_SIZE;
  
  return {
    validFiles,
    invalidFiles,
    totalSize,
    isWithinSessionLimit,
  };
}

/**
 * Create file metadata for transfer
 */
export async function createFileMetadata(file: File): Promise<FileMetadata> {
  const sanitizedName = sanitizeFileName(file.name);
  const totalChunks = Math.ceil(file.size / FILE_CONSTANTS.CHUNK_SIZE);
  
  // Generate file hash (optional, for verification)
  // Note: This can be slow for large files, so we only hash first chunk
  const firstChunk = file.slice(0, FILE_CONSTANTS.CHUNK_SIZE);
  const firstChunkBuffer = await firstChunk.arrayBuffer();
  const hash = await generateChecksum(firstChunkBuffer);
  
  return {
    id: generateFileId(),
    name: file.name,
    sanitizedName,
    size: file.size,
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified,
    totalChunks,
    hash,
  };
}

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

// ============================================
// File Preview Generation
// ============================================

/**
 * Generate thumbnail preview for image
 */
export function generateImagePreview(file: File, maxSize: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get file icon based on type
 */
export function getFileIcon(mimeType: string): string {
  const category = getFileCategory(mimeType);
  
  switch (category) {
    case 'image': return '🖼️';
    case 'video': return '🎬';
    case 'audio': return '🎵';
    case 'document': 
      if (mimeType === 'application/pdf') return '📄';
      return '📝';
    default: return '📁';
  }
}

// ============================================
// File Size Formatting
// ============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format transfer speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '--:--';
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

