import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { formatFileSize, getFileIcon } from '../../utils/fileValidation';
import { getDeviceInfo } from '../../utils/deviceDetection';
import { Button } from './Button';
import { useToast } from './Toast';

interface ReceivedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
}

interface FileGalleryProps {
  files: ReceivedFile[];
  onPreview?: (file: ReceivedFile) => void;
  className?: string;
}

export function FileGallery({ files, onPreview, className = '' }: FileGalleryProps) {
  const toast = useToast();
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const deviceInfo = getDeviceInfo();

  // Download single file
  const handleDownload = useCallback((file: ReceivedFile) => {
    setDownloadingIds(prev => new Set(prev).add(file.id));

    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }, 1000);

    toast.success('Downloaded', file.name);
  }, [toast]);

  // Share file using Web Share API (for iOS "Save to Photos")
  const handleShare = useCallback(async (file: ReceivedFile) => {
    const shareFile = new File([file.blob], file.name, { type: file.type });
    
    if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({
          files: [shareFile],
          title: file.name,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        // Fall back to download
      }
    }

    // Fallback: regular download
    handleDownload(file);
  }, [handleDownload]);

  // Download all files as ZIP
  const handleDownloadAllAsZip = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreatingZip(true);
    toast.info('Creating ZIP', 'Bundling your files...');

    try {
      const zip = new JSZip();

      // Add all files to the ZIP
      for (const file of files) {
        zip.file(file.name, file.blob);
      }

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SecureTransfer_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('ZIP downloaded', `${files.length} files bundled`);
    } catch (err) {
      console.error('ZIP creation failed:', err);
      toast.error('ZIP failed', 'Could not create ZIP file');
    } finally {
      setIsCreatingZip(false);
    }
  }, [files, toast]);

  // Calculate total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Check if file is shareable (images/videos that can be saved to Photos)
  const isShareable = (file: ReceivedFile) => {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  };

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 text-slate-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        <p>No files received yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with file count and actions */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-300">
            Received Files ({files.length})
          </h3>
          <p className="text-xs text-slate-500">
            Total: {formatFileSize(totalSize)}
          </p>
        </div>

        {files.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadAllAsZip}
            isLoading={isCreatingZip}
            disabled={isCreatingZip}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Save All as ZIP
          </Button>
        )}
      </div>

      {/* File list */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {files.map((file) => (
          <div 
            key={file.id}
            className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
          >
            {/* File icon / thumbnail */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-slate-700/50 text-xl">
              {getFileIcon(file.type)}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm text-slate-200 truncate cursor-pointer hover:text-primary-400"
                onClick={() => onPreview?.(file)}
                title={file.name}
              >
                {file.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(file.size)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-2">
              {/* Share button for images/videos on iOS */}
              {deviceInfo.isMobile && isShareable(file) && (
                <button
                  onClick={() => handleShare(file)}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Share / Save to Photos"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              )}

              {/* Download button */}
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingIds.has(file.id)}
                className={`p-2 rounded-lg transition-colors ${
                  downloadingIds.has(file.id)
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-slate-700 hover:bg-primary-500/20 text-slate-400 hover:text-primary-400'
                }`}
                title="Download"
              >
                {downloadingIds.has(file.id) ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile tip */}
      {deviceInfo.isMobile && files.some(isShareable) && (
        <p className="text-xs text-slate-500 mt-4 text-center">
          Tip: Use the share button to save images directly to your Photos app
        </p>
      )}
    </div>
  );
}
