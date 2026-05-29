import { useState, useCallback, useRef } from 'react';
import { 
  PeerMessage, 
  FileMetadata, 
  FileMetadataPayload,
  FileChunkPayload,
  FileCompletePayload,
  TransferProgress, 
  BatchProgress,
  FILE_CONSTANTS,
} from '../types';
import { 
  createFileMetadata, 
  validateFile,
  formatFileSize,
} from '../utils/fileValidation';
import { 
  generateChecksum, 
  verifyChecksum,
  sanitizeFileName,
} from '../utils/security';
import {
  logTransferStarted,
  logTransferCompleted,
  logTransferFailed,
  logFileValidationPassed,
  logFileValidationFailed,
} from '../utils/auditLog';

interface UseFileTransferOptions {
  sendMessage: (message: PeerMessage) => boolean;
  getBufferedAmount?: () => number;
  onProgress?: (fileProgress: TransferProgress, batchProgress: BatchProgress) => void;
  onFileReceived?: (file: Blob, metadata: FileMetadata) => void;
  onTransferComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseFileTransferReturn {
  sendFiles: (files: File[]) => Promise<void>;
  handleMessage: (message: PeerMessage) => void;
  cancelTransfer: () => void;
  fileProgress: Map<string, TransferProgress>;
  batchProgress: BatchProgress;
  isSending: boolean;
  isReceiving: boolean;
}

export function useFileTransfer(options: UseFileTransferOptions): UseFileTransferReturn {
  const { sendMessage, getBufferedAmount, onProgress, onFileReceived, onTransferComplete, onError } = options;

  const [fileProgress, setFileProgress] = useState<Map<string, TransferProgress>>(new Map());
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    totalFiles: 0,
    completedFiles: 0,
    totalBytes: 0,
    bytesTransferred: 0,
    overallPercentage: 0,
    averageSpeed: 0,
    currentFileId: null,
    status: 'idle',
  });
  const [isSending, setIsSending] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const cancelledRef = useRef(false);
  const transferStartTimeRef = useRef<number>(0);
  const receivedChunksRef = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const fileMetadataRef = useRef<Map<string, FileMetadata>>(new Map());
  const speedSamplesRef = useRef<number[]>([]);
  const lastSpeedUpdateRef = useRef<number>(0);
  const lastBytesRef = useRef<number>(0);

  // Per-file byte tracking ref (fixes stale-closure bug in totalBytesTransferred calculation)
  const fileBytesRef = useRef<Map<string, number>>(new Map());
  // Throttle progress state updates to max ~10/sec to prevent UI jank on large batches
  const lastProgressUpdateRef = useRef<number>(0);
  // O(1) receiver-side byte tracking (replaces O(n²) chunk iteration on every incoming chunk)
  const totalBytesReceivedRef = useRef<number>(0);
  const fileBytesReceivedRef = useRef<Map<string, number>>(new Map());
  // Per-file chunk checksums used to verify the chain hash sent in file_complete
  const receivedFileChecksumsRef = useRef<Map<string, string[]>>(new Map());

  // Update file progress
  const updateFileProgress = useCallback((fileId: string, updates: Partial<TransferProgress>) => {
    setFileProgress(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(fileId);
      if (current) {
        newMap.set(fileId, { ...current, ...updates });
      }
      return newMap;
    });
  }, []);

  // Calculate transfer speed
  const calculateSpeed = useCallback((totalBytesTransferred: number): number => {
    const now = Date.now();
    const timeDiff = now - lastSpeedUpdateRef.current;
    
    if (timeDiff >= 500) { // Update every 500ms
      const bytesDiff = totalBytesTransferred - lastBytesRef.current;
      const speed = (bytesDiff / timeDiff) * 1000; // bytes per second
      
      speedSamplesRef.current.push(speed);
      if (speedSamplesRef.current.length > 5) {
        speedSamplesRef.current.shift();
      }
      
      lastSpeedUpdateRef.current = now;
      lastBytesRef.current = totalBytesTransferred;
    }
    
    // Return average of recent samples
    if (speedSamplesRef.current.length === 0) return 0;
    return speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
  }, []);

  // Send files
  const sendFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Guard: enforce batch size limit
    if (files.length > FILE_CONSTANTS.MAX_FILES_PER_BATCH) {
      onError?.(`Too many files: maximum is ${FILE_CONSTANTS.MAX_FILES_PER_BATCH} files per transfer`);
      return;
    }

    cancelledRef.current = false;
    setIsSending(true);
    transferStartTimeRef.current = Date.now();
    speedSamplesRef.current = [];
    lastSpeedUpdateRef.current = Date.now();
    lastBytesRef.current = 0;
    fileBytesRef.current = new Map();
    lastProgressUpdateRef.current = 0;

    // Validate and create metadata for all files in parallel
    const results = await Promise.all(
      files.map(async (file) => {
        const validation = await validateFile(file);
        if (!validation.isValid) return { file, validation, metadata: null };
        const metadata = await createFileMetadata(file);
        return { file, validation, metadata };
      })
    );

    const validFiles: Array<{ file: File; metadata: FileMetadata }> = [];
    let totalSize = 0;

    for (const { file, validation, metadata } of results) {
      if (!validation.isValid) {
        logFileValidationFailed(file.name, validation.errors);
        onError?.(`File "${file.name}" failed validation: ${validation.errors.join(', ')}`);
        continue;
      }
      logFileValidationPassed(file.name, file.size);
      validFiles.push({ file, metadata: metadata! });
      totalSize += file.size;
      fileBytesRef.current.set(metadata!.id, 0);
    }

    if (validFiles.length === 0) {
      setIsSending(false);
      onError?.('No valid files to send');
      return;
    }

    if (totalSize > FILE_CONSTANTS.MAX_SESSION_SIZE) {
      setIsSending(false);
      onError?.(`Total size (${formatFileSize(totalSize)}) exceeds session limit of ${formatFileSize(FILE_CONSTANTS.MAX_SESSION_SIZE)}`);
      return;
    }

    logTransferStarted(validFiles.length, totalSize);

    // Initialize progress
    const initialProgress = new Map<string, TransferProgress>();
    validFiles.forEach(({ metadata }, index) => {
      initialProgress.set(metadata.id, {
        fileId: metadata.id,
        fileName: metadata.sanitizedName,
        fileSize: metadata.size,
        bytesTransferred: 0,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        status: index === 0 ? 'transferring' : 'pending',
      });
    });
    setFileProgress(initialProgress);

    const initialBatch: BatchProgress = {
      totalFiles: validFiles.length,
      completedFiles: 0,
      totalBytes: totalSize,
      bytesTransferred: 0,
      overallPercentage: 0,
      averageSpeed: 0,
      currentFileId: validFiles[0]?.metadata.id || null,
      status: 'transferring',
    };
    setBatchProgress(initialBatch);

    const batchId = `batch-${Date.now()}`;
    sendMessage({ type: 'batch_start', timestamp: Date.now(), payload: { batchId, totalFiles: validFiles.length, totalSize } });

    // Send each file sequentially
    for (let fileIndex = 0; fileIndex < validFiles.length; fileIndex++) {
      if (cancelledRef.current) break;

      const { file, metadata } = validFiles[fileIndex]!;

      setBatchProgress(prev => ({ ...prev, currentFileId: metadata.id }));
      updateFileProgress(metadata.id, { status: 'transferring' });

      const metadataPayload: FileMetadataPayload = { ...metadata, batchId, fileIndex, totalFilesInBatch: validFiles.length };
      sendMessage({ type: 'file_metadata', timestamp: Date.now(), payload: metadataPayload });

      let bytesTransferred = 0;
      const chunkChecksums: string[] = [];
      for (let chunkIndex = 0; chunkIndex < metadata.totalChunks; chunkIndex++) {
        if (cancelledRef.current) break;

        // Backpressure: pause sending if the WebRTC send buffer exceeds 1 MB
        if (getBufferedAmount) {
          while (getBufferedAmount() > 1024 * 1024) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        const start = chunkIndex * FILE_CONSTANTS.CHUNK_SIZE;
        const end = Math.min(start + FILE_CONSTANTS.CHUNK_SIZE, file.size);
        const chunkData = await file.slice(start, end).arrayBuffer();
        const checksum = await generateChecksum(chunkData);
        chunkChecksums.push(checksum);

        const chunkPayload: FileChunkPayload = { fileId: metadata.id, chunkIndex, totalChunks: metadata.totalChunks, data: chunkData, checksum };
        const sent = sendMessage({ type: 'file_chunk', timestamp: Date.now(), payload: chunkPayload });

        if (!sent) {
          logTransferFailed('Failed to send chunk');
          updateFileProgress(metadata.id, { status: 'failed', error: 'Send failed' });
          setIsSending(false);
          onError?.('Failed to send file chunk');
          return;
        }

        bytesTransferred = end;

        // Use ref for totalBytes — avoids the stale-state closure bug when reading fileProgress
        fileBytesRef.current.set(metadata.id, bytesTransferred);
        const totalBytesTransferred = Array.from(fileBytesRef.current.values()).reduce((a, b) => a + b, 0);
        const speed = calculateSpeed(totalBytesTransferred);
        const remaining = speed > 0 ? (totalSize - totalBytesTransferred) / speed : Infinity;

        // Throttle React state updates to ~10/sec to prevent jank with many files or small chunks
        const now = Date.now();
        if (now - lastProgressUpdateRef.current > 100) {
          lastProgressUpdateRef.current = now;
          const filePercentage = (bytesTransferred / file.size) * 100;
          const overallPercentage = (totalBytesTransferred / totalSize) * 100;

          updateFileProgress(metadata.id, { bytesTransferred, percentage: filePercentage, speed, estimatedTimeRemaining: remaining });
          setBatchProgress(prev => ({ ...prev, bytesTransferred: totalBytesTransferred, overallPercentage, averageSpeed: speed }));
          onProgress?.(
            { fileId: metadata.id, fileName: metadata.sanitizedName, fileSize: metadata.size, bytesTransferred, percentage: filePercentage, speed, estimatedTimeRemaining: remaining, status: 'transferring' },
            { ...initialBatch, bytesTransferred: totalBytesTransferred, overallPercentage, averageSpeed: speed }
          );
        }
      }

      // Chain hash: SHA-256 of all chunk checksums joined — proves every chunk arrived in
      // the correct order without reading the full file into memory a second time
      const chainHashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(chunkChecksums.join(',')),
      );
      const finalHash = Array.from(new Uint8Array(chainHashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      sendMessage({ type: 'file_complete', timestamp: Date.now(), payload: { fileId: metadata.id, finalHash } as FileCompletePayload });
      updateFileProgress(metadata.id, { status: 'completed', percentage: 100, bytesTransferred: file.size });
      setBatchProgress(prev => ({ ...prev, completedFiles: prev.completedFiles + 1 }));
    }

    if (!cancelledRef.current) {
      sendMessage({ type: 'batch_complete', timestamp: Date.now(), payload: { batchId } });
      const duration = Date.now() - transferStartTimeRef.current;
      logTransferCompleted(validFiles.length, totalSize, duration);
      setBatchProgress(prev => ({ ...prev, status: 'completed', overallPercentage: 100 }));
      onTransferComplete?.();
    }

    setIsSending(false);
  }, [sendMessage, getBufferedAmount, onProgress, onTransferComplete, onError, updateFileProgress, calculateSpeed]);

  // Handle incoming messages
  const handleMessage = useCallback((message: PeerMessage) => {
    switch (message.type) {
      case 'batch_start': {
        const { totalFiles, totalSize } = message.payload as { totalFiles: number; totalSize: number };
        setIsReceiving(true);
        transferStartTimeRef.current = Date.now();
        speedSamplesRef.current = [];
        lastSpeedUpdateRef.current = Date.now();
        lastBytesRef.current = 0;
        receivedChunksRef.current = new Map();
        fileMetadataRef.current = new Map();
        totalBytesReceivedRef.current = 0;
        fileBytesReceivedRef.current = new Map();
        receivedFileChecksumsRef.current = new Map();
        lastProgressUpdateRef.current = 0;

        setBatchProgress({
          totalFiles,
          completedFiles: 0,
          totalBytes: totalSize,
          bytesTransferred: 0,
          overallPercentage: 0,
          averageSpeed: 0,
          currentFileId: null,
          status: 'transferring',
        });
        break;
      }

      case 'file_metadata': {
        const metadata = message.payload as FileMetadataPayload;
        
        // Sanitize metadata
        const sanitizedMetadata: FileMetadata = {
          ...metadata,
          name: sanitizeFileName(metadata.name),
          sanitizedName: sanitizeFileName(metadata.sanitizedName),
        };
        
        fileMetadataRef.current.set(metadata.id, sanitizedMetadata);
        receivedChunksRef.current.set(metadata.id, []);
        receivedFileChecksumsRef.current.set(metadata.id, []);

        setFileProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(metadata.id, {
            fileId: metadata.id,
            fileName: sanitizedMetadata.sanitizedName,
            fileSize: metadata.size,
            bytesTransferred: 0,
            percentage: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'transferring',
          });
          return newMap;
        });

        setBatchProgress(prev => ({
          ...prev,
          currentFileId: metadata.id,
        }));
        break;
      }

      case 'file_chunk': {
        const chunk = message.payload as FileChunkPayload;
        const chunks = receivedChunksRef.current.get(chunk.fileId);

        if (!chunks) {
          onError?.('Received chunk for unknown file');
          return;
        }

        verifyChecksum(chunk.data, chunk.checksum).then(isValid => {
          if (!isValid) {
            logTransferFailed('Chunk checksum mismatch');
            onError?.('File corruption detected');
            return;
          }

          chunks[chunk.chunkIndex] = chunk.data;

          // Store checksum so we can verify the chain hash on file_complete
          const fileChecksums = receivedFileChecksumsRef.current.get(chunk.fileId);
          if (fileChecksums) fileChecksums[chunk.chunkIndex] = chunk.checksum;

          // O(1) byte tracking via refs instead of O(n²) chunk iteration on every message
          const prevFileBytes = fileBytesReceivedRef.current.get(chunk.fileId) ?? 0;
          const newFileBytes = prevFileBytes + chunk.data.byteLength;
          fileBytesReceivedRef.current.set(chunk.fileId, newFileBytes);
          totalBytesReceivedRef.current += chunk.data.byteLength;

          const metadata = fileMetadataRef.current.get(chunk.fileId);
          if (metadata) {
            const totalBytesReceived = totalBytesReceivedRef.current;
            const speed = calculateSpeed(totalBytesReceived);

            // Throttle state updates to ~10/sec to prevent jank with large batches
            const now = Date.now();
            if (now - lastProgressUpdateRef.current > 100) {
              lastProgressUpdateRef.current = now;
              const filePercentage = (newFileBytes / metadata.size) * 100;

              setFileProgress(prev => {
                const newMap = new Map(prev);
                const current = newMap.get(chunk.fileId);
                if (current) {
                  newMap.set(chunk.fileId, { ...current, bytesTransferred: newFileBytes, percentage: filePercentage, speed });
                }
                return newMap;
              });

              setBatchProgress(prev => ({
                ...prev,
                bytesTransferred: totalBytesReceived,
                overallPercentage: prev.totalBytes > 0 ? (totalBytesReceived / prev.totalBytes) * 100 : 0,
                averageSpeed: speed,
              }));
            }
          }
        });
        break;
      }

      case 'file_complete': {
        const { fileId, finalHash } = message.payload as FileCompletePayload;
        const chunks = receivedChunksRef.current.get(fileId);
        const metadata = fileMetadataRef.current.get(fileId);
        const fileChecksums = receivedFileChecksumsRef.current.get(fileId);

        if (!chunks || !metadata) {
          onError?.('File completion for unknown file');
          return;
        }

        // Async: verify chain hash then deliver — uses an IIFE to keep handleMessage synchronous
        void (async () => {
          if (finalHash && fileChecksums) {
            const chainHashBuffer = await crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(fileChecksums.join(',')),
            );
            const computedHash = Array.from(new Uint8Array(chainHashBuffer))
              .map(b => b.toString(16).padStart(2, '0')).join('');

            if (computedHash !== finalHash) {
              logTransferFailed(`Chain hash mismatch for ${metadata.name}`);
              onError?.(`File "${metadata.sanitizedName}" failed integrity check — the transfer may be corrupted`);
              receivedChunksRef.current.delete(fileId);
              receivedFileChecksumsRef.current.delete(fileId);
              return;
            }
          }

          const blob = new Blob(chunks.filter(c => c !== undefined), { type: metadata.type });

          updateFileProgress(fileId, { status: 'completed', percentage: 100, bytesTransferred: metadata.size });
          setBatchProgress(prev => ({ ...prev, completedFiles: prev.completedFiles + 1 }));

          receivedChunksRef.current.delete(fileId);
          receivedFileChecksumsRef.current.delete(fileId);

          onFileReceived?.(blob, metadata);
        })();
        break;
      }

      case 'batch_complete': {
        const duration = Date.now() - transferStartTimeRef.current;
        
        setBatchProgress(prev => {
          logTransferCompleted(prev.totalFiles, prev.totalBytes, duration);
          return {
            ...prev,
            status: 'completed',
            overallPercentage: 100,
          };
        });

        setIsReceiving(false);
        fileMetadataRef.current.clear();
        onTransferComplete?.();
        break;
      }

      case 'file_error': {
        const { fileId, error } = message.payload as { fileId: string; error: string };
        logTransferFailed(error);
        updateFileProgress(fileId, { status: 'failed', error });
        onError?.(error);
        break;
      }
    }
  }, [onFileReceived, onTransferComplete, onError, calculateSpeed, updateFileProgress]);

  // Cancel transfer
  const cancelTransfer = useCallback(() => {
    cancelledRef.current = true;
    setIsSending(false);
    setIsReceiving(false);
    
    setBatchProgress(prev => ({
      ...prev,
      status: 'cancelled',
    }));

    // Update all pending files to cancelled
    setFileProgress(prev => {
      const newMap = new Map(prev);
      newMap.forEach((progress, id) => {
        if (progress.status === 'pending' || progress.status === 'transferring') {
          newMap.set(id, { ...progress, status: 'cancelled' });
        }
      });
      return newMap;
    });

    logTransferFailed('Transfer cancelled by user');
  }, []);

  return {
    sendFiles,
    handleMessage,
    cancelTransfer,
    fileProgress,
    batchProgress,
    isSending,
    isReceiving,
  };
}

