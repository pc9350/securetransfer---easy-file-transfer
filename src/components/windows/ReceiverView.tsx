import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useFileTransfer } from '../../hooks/useFileTransfer';
import { FileMetadata, PeerMessage } from '../../types';
import { QRCodeDisplay } from '../shared/QRCodeDisplay';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { SecurityBadges } from '../shared/SecurityBadge';
import { Button } from '../shared/Button';
import { FileList } from '../shared/FileItem';
import { ProgressBar } from '../shared/ProgressBar';
import { ConnectionApprovalModal } from '../security/ConnectionApprovalModal';
import { SetPINModal } from '../security/SetPINModal';
import { useToast } from '../shared/Toast';
import { formatFileSize, formatSpeed, formatTimeRemaining } from '../../utils/fileValidation';
import { sanitizeFileName } from '../../utils/security';
import { logPinSet } from '../../utils/auditLog';

export function ReceiverView() {
  const toast = useToast();
  
  // Connection approval state
  const [pendingApproval, setPendingApproval] = useState<{
    peerId: string;
    resolve: (approved: boolean) => void;
  } | null>(null);
  
  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  
  // Received files
  const [receivedFiles, setReceivedFiles] = useState<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    blob: Blob;
  }>>([]);

  // Handle connection approval request
  const handleConnectionRequest = useCallback((peerId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingApproval({ peerId, resolve });
    });
  }, []);

  // Handle file received - defined first so it can be used by useFileTransfer
  const handleFileReceived = useCallback((blob: Blob, metadata: FileMetadata) => {
    console.log('[Receiver] File received:', metadata.name, metadata.size);
    const sanitizedName = sanitizeFileName(metadata.name);
    
    setReceivedFiles(prev => [...prev, {
      id: metadata.id,
      name: sanitizedName,
      size: metadata.size,
      type: metadata.type,
      blob,
    }]);

    // Auto-download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('File received', sanitizedName);
  }, [toast]);

  // Initialize file transfer hook first
  const {
    handleMessage: handleTransferMessage,
    fileProgress,
    batchProgress,
    isReceiving,
  } = useFileTransfer({
    sendMessage: () => false, // Will be updated after WebRTC init
    onFileReceived: handleFileReceived,
    onTransferComplete: () => {
      toast.success('Transfer complete', `All files received!`);
    },
    onError: (error) => {
      toast.error('Transfer error', error);
    },
  });

  // Forward messages to file transfer handler
  const handleIncomingMessage = useCallback((message: PeerMessage) => {
    console.log('[Receiver] Incoming message:', message.type);
    if (['batch_start', 'file_metadata', 'file_chunk', 'file_complete', 'batch_complete', 'file_error'].includes(message.type)) {
      handleTransferMessage(message);
    }
  }, [handleTransferMessage]);

  // Initialize WebRTC with message handler
  const {
    connectionInfo,
    connect,
    disconnect,
    setPin,
    roomCode,
    isConnected,
  } = useWebRTC({
    mode: 'host',
    onConnectionRequest: handleConnectionRequest,
    onMessage: handleIncomingMessage, // THIS WAS MISSING!
    onConnected: () => {
      toast.success('Device connected', 'Ready to receive files');
    },
    onDisconnected: () => {
      // Only show if we were actually connected to a peer
      if (receivedFiles.length > 0) {
        toast.info('Device disconnected');
        setReceivedFiles([]);
      }
    },
    onError: (error) => {
      // Don't show toast for network errors during initial connection
      if (!error.includes('network') && !error.includes('Lost connection to server')) {
        toast.error('Connection error', error);
      } else {
        console.warn('[Receiver] Network error (may be transient):', error);
      }
    },
  });

  // Track if we've already initialized
  const hasInitialized = useRef(false);

  // Initialize connection on mount - only once!
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    connect();
    
    // Cleanup function
    return () => {
      // Don't reset hasInitialized on cleanup to prevent re-init on HMR
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle approval
  const handleApprove = useCallback(() => {
    if (pendingApproval) {
      pendingApproval.resolve(true);
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  const handleDeny = useCallback(() => {
    if (pendingApproval) {
      pendingApproval.resolve(false);
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  // Handle PIN set
  const handleSetPin = useCallback((pin: string) => {
    setPin(pin);
    setIsPinSet(true);
    logPinSet();
    toast.success('PIN set', 'Connection now requires PIN');
  }, [setPin, toast]);

  // Get URL for QR code
  const getConnectionUrl = useCallback(() => {
    if (!roomCode) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/send?room=${roomCode}`;
  }, [roomCode]);

  // Convert progress map to array for FileList
  const progressArray = Array.from(fileProgress.values());

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Receive Files
        </h1>
        <p className="text-slate-400">
          {isConnected 
            ? 'Connected and ready to receive files'
            : 'Scan the QR code or enter the room code on your iPhone'
          }
        </p>
      </div>

      {/* Security badges */}
      <div className="flex justify-center mb-8">
        <SecurityBadges showPin={isPinSet} />
      </div>

      {/* Main content */}
      <div className="glass-card">
        {!isConnected ? (
          // Waiting for connection
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-3">
              <ConnectionStatus state={connectionInfo.state} />
              {connectionInfo.state === 'connecting' && (
                <span className="text-sm text-slate-400">Setting up secure room...</span>
              )}
            </div>

            {/* QR Code - only show when room is ready */}
            {roomCode && connectionInfo.state === 'idle' && (
              <QRCodeDisplay
                value={getConnectionUrl()}
                size={200}
                roomCode={roomCode}
                className="py-4"
              />
            )}

            {/* Show loading while connecting */}
            {connectionInfo.state === 'connecting' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-primary-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Connecting to server...</p>
              </div>
            )}

            {/* Show error state */}
            {connectionInfo.state === 'error' && (
              <div className="text-center py-4">
                <p className="text-danger-400 mb-4">{connectionInfo.error}</p>
                <Button onClick={() => window.location.reload()} variant="secondary">
                  Refresh Page
                </Button>
              </div>
            )}

            {/* Set PIN button */}
            <div className="flex justify-center">
              {!isPinSet ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPinModal(true)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Set Security PIN (Optional)
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-success-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  PIN Protection Enabled
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <h3 className="font-medium text-slate-200 mb-2">How to connect:</h3>
              <ol className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2">
                  <span className="text-primary-400 font-semibold">1.</span>
                  Open this website on your iPhone
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400 font-semibold">2.</span>
                  Tap "Send Files" and scan the QR code
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400 font-semibold">3.</span>
                  Approve the connection on this screen
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400 font-semibold">4.</span>
                  Files will download automatically
                </li>
              </ol>
            </div>
          </div>
        ) : (
          // Connected - receiving files
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <ConnectionStatus state={isReceiving ? 'transferring' : connectionInfo.state} />
              <Button
                variant="danger"
                size="sm"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>

            {/* Transfer Progress */}
            {isReceiving && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Receiving {batchProgress.completedFiles}/{batchProgress.totalFiles} files
                  </span>
                  <span className="text-slate-300 font-medium">
                    {formatSpeed(batchProgress.averageSpeed)}
                  </span>
                </div>
                
                <ProgressBar 
                  progress={batchProgress.overallPercentage} 
                  variant="primary"
                  showPercentage
                />
                
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{formatFileSize(batchProgress.bytesTransferred)} / {formatFileSize(batchProgress.totalBytes)}</span>
                  <span>
                    {batchProgress.averageSpeed > 0 && 
                      `~${formatTimeRemaining((batchProgress.totalBytes - batchProgress.bytesTransferred) / batchProgress.averageSpeed)} remaining`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* File List */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                {isReceiving ? 'Incoming Files' : receivedFiles.length > 0 ? 'Received Files' : 'Waiting for files...'}
              </h3>
              
              {progressArray.length > 0 ? (
                <FileList
                  files={progressArray.map(p => ({
                    id: p.fileId,
                    name: p.fileName,
                    size: p.fileSize,
                    type: '',
                  }))}
                  progress={fileProgress}
                  showProgress
                />
              ) : receivedFiles.length > 0 ? (
                <FileList
                  files={receivedFiles}
                  progress={new Map(receivedFiles.map(f => [f.id, {
                    fileId: f.id,
                    fileName: f.name,
                    fileSize: f.size,
                    bytesTransferred: f.size,
                    percentage: 100,
                    speed: 0,
                    estimatedTimeRemaining: 0,
                    status: 'completed' as const,
                  }]))}
                />
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <p>Waiting for sender to select files...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection Approval Modal */}
      <ConnectionApprovalModal
        isOpen={!!pendingApproval}
        peerId={pendingApproval?.peerId || ''}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />

      {/* Set PIN Modal */}
      <SetPINModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSetPIN={handleSetPin}
      />
    </div>
  );
}

