import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useFileTransfer } from "../../hooks/useFileTransfer";
import { useBeforeUnload } from "../../hooks/useBeforeUnload";
import { FileWithPreview } from "../../types";
import { ConnectionStatus } from "../shared/ConnectionStatus";
import { SecurityBadges } from "../shared/SecurityBadge";
import { Button } from "../shared/Button";
import { FileList } from "../shared/FileItem";
import { ProgressBar } from "../shared/ProgressBar";
import { EnterPINModal } from "../security/EnterPINModal";
import { FilePreviewModal } from "../shared/FilePreviewModal";
import { NetworkWarning } from "../shared/NetworkWarning";
import { useToast } from "../shared/Toast";
import {
  formatFileSize,
  formatSpeed,
  formatTimeRemaining,
} from "../../utils/fileValidation";
import {
  isValidRoomCodeFormat,
  normalizeRoomCode,
} from "../../utils/security";
import { generateFileId } from "../../utils/fileValidation";

export function SenderView() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Room code state
  const [roomCode, setRoomCode] = useState(searchParams.get("room") || "");

  // PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinResolve, setPinResolve] = useState<
    ((pin: string | null) => void) | null
  >(null);

  // Files state
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [filesBeingAdded, setFilesBeingAdded] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    size: number;
    type: string;
    url?: string;
  } | null>(null);

  // Handle PIN required
  const handlePinRequired = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      setPinResolve(() => resolve);
      setShowPinModal(true);
    });
  }, []);

  // Initialize WebRTC
  const { connectionInfo, connect, disconnect, sendMessage, isConnected } =
    useWebRTC({
      mode: "client",
      onPinRequired: handlePinRequired,
      onConnected: () => {
        toast.success("Connected", "Ready to send files");
      },
      onDisconnected: () => {
        toast.info("Disconnected");
        setSelectedFiles([]);
      },
      onError: (error) => {
        toast.error("Connection failed", error);
        if (error.includes("PIN")) {
          setPinError(error);
        }
      },
    });

  // Handle file transfer progress
  const handleProgress = useCallback(() => {
    // Progress is tracked in the hook
  }, []);

  // Initialize file transfer
  const { sendFiles, fileProgress, batchProgress, isSending, cancelTransfer } =
    useFileTransfer({
      sendMessage,
      onProgress: handleProgress,
      onTransferComplete: () => {
        toast.success(
          "Transfer complete",
          `${selectedFiles.length} files sent`,
        );
      },
      onError: (error) => {
        toast.error("Transfer error", error);
      },
    });

  // Warn user before leaving during active session
  useBeforeUnload(
    selectedFiles.length > 0 || isSending,
    'You have files selected or a transfer in progress. Are you sure you want to leave?'
  );

  // Handle connect - defined early so it can be used by QR scanner
  const handleConnect = useCallback(
    async (code?: string) => {
      const targetCode = code || normalizeRoomCode(roomCode);

      if (!isValidRoomCodeFormat(targetCode)) {
        toast.error(
          "Invalid code",
          "Please enter a valid 8-character room code",
        );
        return;
      }

      try {
        await connect(targetCode);
      } catch {
        toast.error(
          "Connection failed",
          "Please check the room code and try again",
        );
      }
    },
    [roomCode, connect, toast],
  );

  // Ref to hold the latest handleConnect function
  const handleConnectRef = useRef(handleConnect);
  handleConnectRef.current = handleConnect;

  // Track if we've attempted auto-connect from URL
  const autoConnectAttempted = useRef(false);

  // Auto-connect if room code is in URL (from QR scan with native camera)
  useEffect(() => {
    const urlRoomCode = searchParams.get("room");
    if (
      urlRoomCode &&
      !autoConnectAttempted.current &&
      !isConnected &&
      connectionInfo.state === "idle"
    ) {
      autoConnectAttempted.current = true;
      const normalized = normalizeRoomCode(urlRoomCode);
      if (isValidRoomCodeFormat(normalized)) {
        // Small delay to let UI render first
        setTimeout(() => {
          handleConnectRef.current(normalized);
        }, 500);
      }
    }
  }, [searchParams, isConnected, connectionInfo.state]);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      // Copy files array immediately - FileList can become stale
      const files = Array.from(fileList);
      const fileCount = files.length;

      // Show loading with count
      setIsLoadingFiles(true);
      setFilesBeingAdded(fileCount);
      setLoadingMessage(
        `Adding ${fileCount} ${fileCount === 1 ? "file" : "files"}...`,
      );

      // Reset input FIRST
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Process files with slight delay to let UI update
      requestAnimationFrame(() => {
        const processedFiles: FileWithPreview[] = [];
        let skippedCount = 0;
        let processed = 0;

        for (const file of files) {
          processed++;

          // Update loading message for large batches
          if (fileCount > 10 && processed % 5 === 0) {
            setLoadingMessage(`Processing ${processed}/${fileCount} files...`);
          }

          // Quick validation
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          const blocked = [
            "exe",
            "bat",
            "cmd",
            "sh",
            "ps1",
            "msi",
            "dll",
            "scr",
            "js",
            "vbs",
          ];

          if (
            file.size > 2 * 1024 * 1024 * 1024 ||
            file.size === 0 ||
            blocked.includes(ext)
          ) {
            skippedCount++;
            continue;
          }

          // Extend the File object with additional properties
          const fileWithPreview = Object.assign(file, {
            id: generateFileId(),
            preview: undefined,
            validationResult: { isValid: true, errors: [], warnings: [] },
          }) as FileWithPreview;

          processedFiles.push(fileWithPreview);
        }

        if (skippedCount > 0) {
          toast.warning(
            `${skippedCount} file(s) skipped`,
            "Some files were too large or invalid",
          );
        }

        // Update state with new files
        setSelectedFiles((prev) => [...prev, ...processedFiles]);
        setIsLoadingFiles(false);
        setFilesBeingAdded(0);
        setLoadingMessage("");

        // Show success message for large batches
        if (processedFiles.length > 5) {
          toast.success(
            `${processedFiles.length} files added`,
            "Ready to send",
          );
        }
      });
    },
    [toast],
  );

  // Handle file selection - optimized for iOS speed with loading feedback
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles],
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  // Handle file removal
  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Handle file preview
  const handlePreviewFile = useCallback(
    (file: { id: string; name: string; size: number; type: string }) => {
      // Find the actual file to create a URL
      const selectedFile = selectedFiles.find((f) => f.id === file.id);
      if (selectedFile) {
        setPreviewFile({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          url: URL.createObjectURL(selectedFile),
        });
      }
    },
    [selectedFiles],
  );

  // Handle send files
  const handleSendFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.warning("No files selected", "Please select files to send");
      return;
    }

    await sendFiles(selectedFiles);
  }, [selectedFiles, sendFiles, toast]);

  // Handle PIN submit
  const handlePinSubmit = useCallback(
    (pin: string) => {
      setPinError("");
      if (pinResolve) {
        pinResolve(pin);
        setPinResolve(null);
      }
      setShowPinModal(false);
    },
    [pinResolve],
  );

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
      {/* Network Warning */}
      <NetworkWarning className="mb-4" />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Send Files</h1>
        <p className="text-slate-400">
          {isConnected
            ? "Select files to send"
            : "Enter the room code from the receiving device"}
        </p>
      </div>

      {/* Security badges */}
      <div className="flex justify-center mb-8">
        <SecurityBadges showPin={connectionInfo.isPinRequired} />
      </div>

      {/* Main content */}
      <div className="glass-card">
        {/* Error State */}
        {connectionInfo.state === "error" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-200 mb-2">
              Connection Failed
            </h3>
            <p className="text-danger-400 text-sm mb-2">
              {connectionInfo.error}
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Please check the room code and try again.
            </p>
            <Button onClick={() => window.location.reload()} variant="primary">
              Try Again
            </Button>
          </div>
        )}

        {/* Disconnected State */}
        {connectionInfo.state === "disconnected" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-200 mb-2">
              Disconnected
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              The connection to the receiver was lost.
            </p>
            <Button onClick={() => window.location.reload()} variant="primary">
              Connect Again
            </Button>
          </div>
        )}

        {/* Normal Connection Flow */}
        {connectionInfo.state !== "error" &&
        connectionInfo.state !== "disconnected" &&
        !isConnected ? (
          // Connection UI
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-3">
              <ConnectionStatus state={connectionInfo.state} />
            </div>

            {/* Manual Entry */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    Enter room code
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
                  disabled={connectionInfo.state === "connecting"}
                />
                <Button
                  variant="primary"
                  onClick={() => handleConnect()}
                  isLoading={
                    connectionInfo.state === "connecting" ||
                    connectionInfo.state === "awaiting_approval"
                  }
                  disabled={!roomCode || connectionInfo.state === "connecting"}
                >
                  Connect
                </Button>
              </div>

              <p className="text-center text-sm text-slate-500 mt-4">
                Tip: Open your camera app to scan the QR code (mobile only)
              </p>
            </div>
          </div>
        ) : isConnected ? (
          // File selection and transfer UI
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <ConnectionStatus
                state={isSending ? "transferring" : connectionInfo.state}
              />
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
              disabled={isLoadingFiles}
            />

            {/* Select Files Button */}
            {!isSending && (
              <label
                htmlFor="file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl transition-all ${
                  isLoadingFiles
                    ? "cursor-wait bg-slate-800/50 border-slate-700"
                    : isDragOver
                      ? "cursor-copy border-primary-500 bg-primary-500/10 scale-[1.02]"
                      : "cursor-pointer border-slate-700 hover:border-primary-500/50 hover:bg-slate-800/30"
                }`}
              >
                {isLoadingFiles ? (
                  <>
                    <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-sm text-slate-400">
                      Processing files...
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Almost done!
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className={`w-10 h-10 mb-2 transition-colors ${isDragOver ? "text-primary-400" : "text-slate-500"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span
                      className={`transition-colors ${isDragOver ? "text-primary-300" : "text-slate-400"}`}
                    >
                      {isDragOver
                        ? "Drop files here"
                        : "Tap to select or drop files"}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Photos, videos, documents
                    </span>
                  </>
                )}
              </label>
            )}

            {/* Transfer Progress */}
            {isSending && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Sending {batchProgress.completedFiles}/
                    {batchProgress.totalFiles} files
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
                  <span>
                    {formatFileSize(batchProgress.bytesTransferred)} /{" "}
                    {formatFileSize(batchProgress.totalBytes)}
                  </span>
                  <span>
                    {batchProgress.averageSpeed > 0 &&
                      `~${formatTimeRemaining((batchProgress.totalBytes - batchProgress.bytesTransferred) / batchProgress.averageSpeed)} remaining`}
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
                  files={selectedFiles.map((f) => ({
                    id: f.id,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    preview: f.preview,
                  }))}
                  progress={isSending ? fileProgress : undefined}
                  onRemove={!isSending ? handleRemoveFile : undefined}
                  onPreview={handlePreviewFile}
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send {selectedFiles.length}{" "}
                {selectedFiles.length === 1 ? "File" : "Files"}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* PIN Modal */}
      <EnterPINModal
        isOpen={showPinModal}
        onClose={handlePinCancel}
        onSubmit={handlePinSubmit}
        error={pinError}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => {
          if (previewFile?.url) {
            URL.revokeObjectURL(previewFile.url);
          }
          setPreviewFile(null);
        }}
        file={previewFile}
      />

      {/* Full-screen loading overlay for file processing */}
      {isLoadingFiles && filesBeingAdded > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
          <div className="text-center p-8">
            {/* Animated loading spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-slate-700 rounded-full"></div>
              <div
                className="absolute inset-2 border-4 border-cyan-500 border-b-transparent rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "0.75s",
                }}
              ></div>
            </div>

            {/* File count */}
            <div className="mb-4">
              <span className="text-4xl font-bold text-white">
                {filesBeingAdded}
              </span>
              <span className="text-lg text-slate-400 ml-2">
                {filesBeingAdded === 1 ? "file" : "files"}
              </span>
            </div>

            {/* Loading message */}
            <p className="text-slate-300 text-lg mb-2">{loadingMessage}</p>
            <p className="text-slate-500 text-sm">
              Please wait while we prepare your files
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1 mt-6">
              <div
                className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
