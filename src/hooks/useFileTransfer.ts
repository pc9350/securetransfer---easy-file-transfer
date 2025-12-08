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
  const { sendMessage, onProgress, onFileReceived, onTransferComplete, onError } = options;

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

    cancelledRef.current = false;
    setIsSending(true);
    transferStartTimeRef.current = Date.now();
    speedSamplesRef.current = [];
    lastSpeedUpdateRef.current = Date.now();
    lastBytesRef.current = 0;

    // Validate all files first
    const validFiles: Array<{ file: File; metadata: FileMetadata }> = [];
    let totalSize = 0;

    for (const file of files) {
      const validation = await validateFile(file);
      
      if (!validation.isValid) {
        logFileValidationFailed(file.name, validation.errors);
        onError?.(`File "${file.name}" failed validation: ${validation.errors.join(', ')}`);
        continue;
      }

      logFileValidationPassed(file.name, file.size);
      const metadata = await createFileMetadata(file);
      validFiles.push({ file, metadata });
      totalSize += file.size;
    }

    if (validFiles.length === 0) {
      setIsSending(false);
      onError?.('No valid files to send');
      return;
    }

    // Check session size limit
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

    // Generate batch ID
    const batchId = `batch-${Date.now()}`;

    // Send batch start message
    const batchStartMessage: PeerMessage = {
      type: 'batch_start',
      timestamp: Date.now(),
      payload: {
        batchId,
        totalFiles: validFiles.length,
        totalSize,
      },
    };
    sendMessage(batchStartMessage);

    let totalBytesTransferred = 0;

    // Send each file
    for (let fileIndex = 0; fileIndex < validFiles.length; fileIndex++) {
      if (cancelledRef.current) break;

      const { file, metadata } = validFiles[fileIndex]!;

      // Update current file
      setBatchProgress(prev => ({
        ...prev,
        currentFileId: metadata.id,
      }));

      updateFileProgress(metadata.id, { status: 'transferring' });

      // Send metadata
      const metadataPayload: FileMetadataPayload = {
        ...metadata,
        batchId,
        fileIndex,
        totalFilesInBatch: validFiles.length,
      };

      const metadataMessage: PeerMessage = {
        type: 'file_metadata',
        timestamp: Date.now(),
        payload: metadataPayload,
      };
      sendMessage(metadataMessage);

      // Send chunks
      let bytesTransferred = 0;
      for (let chunkIndex = 0; chunkIndex < metadata.totalChunks; chunkIndex++) {
        if (cancelledRef.current) break;

        const start = chunkIndex * FILE_CONSTANTS.CHUNK_SIZE;
        const end = Math.min(start + FILE_CONSTANTS.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const chunkData = await chunk.arrayBuffer();
        const checksum = await generateChecksum(chunkData);

        const chunkPayload: FileChunkPayload = {
          fileId: metadata.id,
          chunkIndex,
          totalChunks: metadata.totalChunks,
          data: chunkData,
          checksum,
        };

        const chunkMessage: PeerMessage = {
          type: 'file_chunk',
          timestamp: Date.now(),
          payload: chunkPayload,
        };

        const sent = sendMessage(chunkMessage);
        if (!sent) {
          logTransferFailed('Failed to send chunk');
          updateFileProgress(metadata.id, { status: 'failed', error: 'Send failed' });
          setIsSending(false);
          onError?.('Failed to send file chunk');
          return;
        }

        bytesTransferred = end;
        totalBytesTransferred = totalBytesTransferred - (fileProgress.get(metadata.id)?.bytesTransferred || 0) + bytesTransferred;

        const speed = calculateSpeed(totalBytesTransferred);
        const remaining = (totalSize - totalBytesTransferred) / speed;

        // Update progress (throttled)
        const filePercentage = (bytesTransferred / file.size) * 100;
        const overallPercentage = (totalBytesTransferred / totalSize) * 100;

        updateFileProgress(metadata.id, {
          bytesTransferred,
          percentage: filePercentage,
          speed,
          estimatedTimeRemaining: remaining,
        });

        setBatchProgress(prev => ({
          ...prev,
          bytesTransferred: totalBytesTransferred,
          overallPercentage,
          averageSpeed: speed,
        }));

        onProgress?.(
          {
            fileId: metadata.id,
            fileName: metadata.sanitizedName,
            fileSize: metadata.size,
            bytesTransferred,
            percentage: filePercentage,
            speed,
            estimatedTimeRemaining: remaining,
            status: 'transferring',
          },
          {
            ...initialBatch,
            bytesTransferred: totalBytesTransferred,
            overallPercentage,
            averageSpeed: speed,
          }
        );

        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Send file complete message
      const completePayload: FileCompletePayload = {
        fileId: metadata.id,
        finalHash: metadata.hash || '',
      };

      const completeMessage: PeerMessage = {
        type: 'file_complete',
        timestamp: Date.now(),
        payload: completePayload,
      };
      sendMessage(completeMessage);

      updateFileProgress(metadata.id, { 
        status: 'completed',
        percentage: 100,
        bytesTransferred: file.size,
      });

      setBatchProgress(prev => ({
        ...prev,
        completedFiles: prev.completedFiles + 1,
      }));
    }

    // Send batch complete
    if (!cancelledRef.current) {
      const batchCompleteMessage: PeerMessage = {
        type: 'batch_complete',
        timestamp: Date.now(),
        payload: { batchId },
      };
      sendMessage(batchCompleteMessage);

      const duration = Date.now() - transferStartTimeRef.current;
      logTransferCompleted(validFiles.length, totalSize, duration);

      setBatchProgress(prev => ({
        ...prev,
        status: 'completed',
        overallPercentage: 100,
      }));

      onTransferComplete?.();
    }

    setIsSending(false);
  }, [sendMessage, onProgress, onTransferComplete, onError, updateFileProgress, calculateSpeed, fileProgress]);

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

        // Verify checksum
        verifyChecksum(chunk.data, chunk.checksum).then(isValid => {
          if (!isValid) {
            logTransferFailed('Chunk checksum mismatch');
            onError?.('File corruption detected');
            return;
          }

          chunks[chunk.chunkIndex] = chunk.data;

          // Calculate progress
          const bytesTransferred = chunks.reduce((sum, c) => sum + (c?.byteLength || 0), 0);
          const metadata = fileMetadataRef.current.get(chunk.fileId);
          
          if (metadata) {
            const filePercentage = (bytesTransferred / metadata.size) * 100;
            
            setFileProgress(prev => {
              const newMap = new Map(prev);
              const current = newMap.get(chunk.fileId);
              if (current) {
                newMap.set(chunk.fileId, {
                  ...current,
                  bytesTransferred,
                  percentage: filePercentage,
                });
              }
              return newMap;
            });

            // Update batch progress
            let totalBytesReceived = 0;
            receivedChunksRef.current.forEach(fileChunks => {
              totalBytesReceived += fileChunks.reduce((sum, c) => sum + (c?.byteLength || 0), 0);
            });

            const speed = calculateSpeed(totalBytesReceived);
            
            setBatchProgress(prev => {
              const overallPercentage = (totalBytesReceived / prev.totalBytes) * 100;
              return {
                ...prev,
                bytesTransferred: totalBytesReceived,
                overallPercentage,
                averageSpeed: speed,
              };
            });
          }
        });
        break;
      }

      case 'file_complete': {
        const { fileId } = message.payload as FileCompletePayload;
        const chunks = receivedChunksRef.current.get(fileId);
        const metadata = fileMetadataRef.current.get(fileId);

        if (!chunks || !metadata) {
          onError?.('File completion for unknown file');
          return;
        }

        // Assemble file
        const blob = new Blob(chunks.filter(c => c !== undefined), { type: metadata.type });

        updateFileProgress(fileId, {
          status: 'completed',
          percentage: 100,
          bytesTransferred: metadata.size,
        });

        setBatchProgress(prev => ({
          ...prev,
          completedFiles: prev.completedFiles + 1,
        }));

        // Clear chunks from memory
        receivedChunksRef.current.delete(fileId);

        onFileReceived?.(blob, metadata);
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

