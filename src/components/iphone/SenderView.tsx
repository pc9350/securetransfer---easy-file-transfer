import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useFileTransfer } from '../../hooks/useFileTransfer';
import { FileWithPreview } from '../../types';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { SecurityBadges } from '../shared/SecurityBadge';
import { Button } from '../shared/Button';
import { FileList } from '../shared/FileItem';
import { ProgressBar } from '../shared/ProgressBar';
import { EnterPINModal } from '../security/EnterPINModal';
import { useToast } from '../shared/Toast';
import { formatFileSize, formatSpeed, formatTimeRemaining, generateImagePreview, validateFile } from '../../utils/fileValidation';
import { isValidRoomCodeFormat, normalizeRoomCode, formatRoomCode } from '../../utils/security';
import { generateFileId } from '../../utils/fileValidation';

export function SenderView() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  
  // Room code state
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [showScanner, setShowScanner] = useState(!searchParams.get('room'));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinResolve, setPinResolve] = useState<((pin: string | null) => void) | null>(null);
  
  // Files state
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle PIN required
  const handlePinRequired = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      setPinResolve(() => resolve);
      setShowPinModal(true);
    });
  }, []);

  // Initialize WebRTC
  const {
    connectionInfo,
    connect,
    disconnect,
    sendMessage,
    isConnected,
  } = useWebRTC({
    mode: 'client',
    onPinRequired: handlePinRequired,
    onConnected: () => {
      toast.success('Connected', 'Ready to send files');
      setShowScanner(false);
    },
    onDisconnected: () => {
      toast.info('Disconnected');
      setSelectedFiles([]);
    },
    onError: (error) => {
      toast.error('Connection failed', error);
      if (error.includes('PIN')) {
        setPinError(error);
      }
    },
  });

  // Handle file transfer progress
  const handleProgress = useCallback(() => {
    // Progress is tracked in the hook
  }, []);

  // Initialize file transfer
  const {
    sendFiles,
    fileProgress,
    batchProgress,
    isSending,
    cancelTransfer,
  } = useFileTransfer({
    sendMessage,
    onProgress: handleProgress,
    onTransferComplete: () => {
      toast.success('Transfer complete', `${selectedFiles.length} files sent`);
    },
    onError: (error) => {
      toast.error('Transfer error', error);
    },
  });

  // Handle connect - defined early so it can be used by QR scanner
  const handleConnect = useCallback(async (code?: string) => {
    const targetCode = code || normalizeRoomCode(roomCode);
    
    if (!isValidRoomCodeFormat(targetCode)) {
      toast.error('Invalid code', 'Please enter a valid 8-character room code');
      return;
    }

    try {
      await connect(targetCode);
    } catch {
      toast.error('Connection failed', 'Please check the room code and try again');
    }
  }, [roomCode, connect, toast]);

  // Ref to hold the latest handleConnect function
  const handleConnectRef = useRef(handleConnect);
  handleConnectRef.current = handleConnect;

  // Track if QR scanner has been initialized
  const scannerInitialized = useRef(false);

  // Initialize QR scanner with auto-start camera
  useEffect(() => {
    if (!showScanner || scannerInitialized.current) return;
    
    // Wait for DOM element to be available
    const initScanner = async () => {
      const element = document.getElementById('qr-reader');
      if (!element) {
        // Element not ready, try again
        setTimeout(initScanner, 100);
        return;
      }

      if (scannerRef.current) return; // Already initialized
      
      scannerInitialized.current = true;
      setIsStartingCamera(true);
      setCameraError(null);

      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        
        if (cameras.length === 0) {
          setCameraError('No camera found on this device');
          setIsStartingCamera(false);
          return;
        }

        // Prefer back camera on mobile
        const backCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );
        const cameraId = backCamera?.id || cameras[0]?.id || 'environment';

        // Start scanning
        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Extract room code from URL or direct code
            let code = decodedText;
            try {
              const url = new URL(decodedText);
              code = url.searchParams.get('room') || decodedText;
            } catch {
              // Not a URL, use as-is
            }

            const normalized = normalizeRoomCode(code);
            if (isValidRoomCodeFormat(normalized)) {
              setRoomCode(formatRoomCode(normalized));
              // Stop scanner and connect
              scanner.stop().catch(console.error);
              scannerRef.current = null;
              scannerInitialized.current = false;
              setShowScanner(false);
              // Use ref to avoid stale closure
              handleConnectRef.current(normalized);
            }
          },
          () => {
            // Ignore scan errors (no QR code in frame)
          }
        );
        
        setIsStartingCamera(false);
      } catch (error) {
        console.error('Camera error:', error);
        const message = error instanceof Error ? error.message : 'Failed to start camera';
        
        if (message.includes('Permission') || message.includes('NotAllowed')) {
          setCameraError('Camera permission denied. Please allow camera access and try again.');
        } else if (message.includes('NotFound') || message.includes('no camera')) {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError('Could not start camera. Try entering the code manually.');
        }
        setIsStartingCamera(false);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
      scannerInitialized.current = false;
    };
  }, [showScanner]);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const filesWithPreview: FileWithPreview[] = await Promise.all(
      files.map(async (file) => {
        const id = generateFileId();
        const validationResult = await validateFile(file);
        
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          try {
            preview = await generateImagePreview(file);
          } catch {
            // Ignore preview errors
          }
        }
        
        return Object.assign(file, {
          id,
          preview,
          validationResult,
        }) as FileWithPreview;
      })
    );

    // Filter out invalid files and show warnings
    const validFiles = filesWithPreview.filter(f => f.validationResult?.isValid !== false);
    const invalidFiles = filesWithPreview.filter(f => f.validationResult?.isValid === false);

    if (invalidFiles.length > 0) {
      toast.warning(
        `${invalidFiles.length} file(s) skipped`,
        'Some files were not added due to validation errors'
      );
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast]);

  // Handle file removal
  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Handle send files
  const handleSendFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.warning('No files selected', 'Please select files to send');
      return;
    }

    await sendFiles(selectedFiles);
  }, [selectedFiles, sendFiles, toast]);

  // Handle PIN submit
  const handlePinSubmit = useCallback((pin: string) => {
    setPinError('');
    if (pinResolve) {
      pinResolve(pin);
      setPinResolve(null);
    }
    setShowPinModal(false);
  }, [pinResolve]);

  // Handle PIN cancel
  const handlePinCancel = useCallback(() => {
    if (pinResolve) {
      pinResolve(null);
      setPinResolve(null);
    }
    setShowPinModal(false);
    disconnect();
  }, [pinResolve, disconnect]);

  // Calculate total size
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Send Files
        </h1>
        <p className="text-slate-400">
          {isConnected 
            ? 'Select files to send to your computer'
            : 'Scan the QR code or enter the room code from your computer'
          }
        </p>
      </div>

      {/* Security badges */}
      <div className="flex justify-center mb-8">
        <SecurityBadges showPin={connectionInfo.isPinRequired} />
      </div>

      {/* Main content */}
      <div className="glass-card">
        {!isConnected ? (
          // Connection UI
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-3">
              <ConnectionStatus state={connectionInfo.state} />
            </div>

            {/* QR Scanner */}
            {showScanner && (
              <div className="space-y-4">
                {/* Camera Loading State */}
                {isStartingCamera && (
                  <div className="w-full max-w-sm mx-auto h-64 bg-slate-800 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-slate-400 text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
                
                {/* Camera Error */}
                {cameraError && (
                  <div className="w-full max-w-sm mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-sm text-center mb-3">{cameraError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setCameraError(null);
                        scannerInitialized.current = false;
                        setShowScanner(false);
                        setTimeout(() => setShowScanner(true), 100);
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
                
                {/* Camera View */}
                {!cameraError && (
                  <div 
                    id="qr-reader" 
                    className="w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-slate-800"
                    style={{ minHeight: isStartingCamera ? 0 : 280 }}
                  />
                )}
                
                {!isStartingCamera && !cameraError && (
                  <p className="text-center text-sm text-slate-500">
                    Point your camera at the QR code on your computer
                  </p>
                )}
              </div>
            )}

            {/* Manual Entry */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    {showScanner ? 'Or enter code manually' : 'Enter room code'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="input-code flex-1"
                  maxLength={9}
                  disabled={connectionInfo.state === 'connecting'}
                />
                <Button
                  variant="primary"
                  onClick={() => handleConnect()}
                  isLoading={connectionInfo.state === 'connecting' || connectionInfo.state === 'awaiting_approval'}
                  disabled={!roomCode || connectionInfo.state === 'connecting'}
                >
                  Connect
                </Button>
              </div>

              {!showScanner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowScanner(true)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan QR Code
                </Button>
              )}
            </div>

            {/* Error */}
            {connectionInfo.error && (
              <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                <p className="text-sm text-danger-400">{connectionInfo.error}</p>
              </div>
            )}
          </div>
        ) : (
          // File selection and transfer UI
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <ConnectionStatus state={isSending ? 'transferring' : connectionInfo.state} />
              <Button
                variant="danger"
                size="sm"
                onClick={disconnect}
                disabled={isSending}
              >
                Disconnect
              </Button>
            </div>

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />

            {/* Select Files Button */}
            {!isSending && (
              <label
                htmlFor="file-input"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-slate-800/30 transition-all"
              >
                <svg className="w-10 h-10 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-slate-400">Tap to select files</span>
                <span className="text-xs text-slate-500 mt-1">Photos, videos, documents</span>
              </label>
            )}

            {/* Transfer Progress */}
            {isSending && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Sending {batchProgress.completedFiles}/{batchProgress.totalFiles} files
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

                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={cancelTransfer}
                >
                  Cancel Transfer
                </Button>
              </div>
            )}

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-300">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formatFileSize(totalSize)}
                  </span>
                </div>
                
                <FileList
                  files={selectedFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    preview: f.preview,
                  }))}
                  progress={isSending ? fileProgress : undefined}
                  onRemove={!isSending ? handleRemoveFile : undefined}
                  showProgress={isSending}
                  className="max-h-60 overflow-y-auto"
                />
              </div>
            )}

            {/* Send Button */}
            {selectedFiles.length > 0 && !isSending && (
              <Button
                variant="success"
                size="lg"
                className="w-full"
                onClick={handleSendFiles}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* PIN Modal */}
      <EnterPINModal
        isOpen={showPinModal}
        onClose={handlePinCancel}
        onSubmit={handlePinSubmit}
        error={pinError}
      />
    </div>
  );
}

