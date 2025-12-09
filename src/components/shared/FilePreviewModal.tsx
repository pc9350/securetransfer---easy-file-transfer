import { useState, useEffect, useCallback } from 'react';
import { formatFileSize } from '../../utils/fileValidation';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    size: number;
    type: string;
    url?: string; // Object URL or blob URL
    blob?: Blob;  // For received files
  } | null;
}

export function FilePreviewModal({ isOpen, onClose, file }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create preview URL when file changes
  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Use existing URL or create from blob
    if (file.url) {
      setPreviewUrl(file.url);
      setIsLoading(false);
    } else if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      setPreviewUrl(url);
      setIsLoading(false);
      
      // Cleanup on unmount
      return () => URL.revokeObjectURL(url);
    } else {
      setError('No preview available');
      setIsLoading(false);
    }
  }, [file, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen || !file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close preview"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* File info header */}
      <div className="absolute top-4 left-4 z-10 max-w-[60%]">
        <h3 className="text-white font-medium truncate">{file.name}</h3>
        <p className="text-white/60 text-sm">{formatFileSize(file.size)}</p>
      </div>

      {/* Content */}
      <div className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="mt-4 text-white/60">Loading preview...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-8">
            <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-white/60">{error}</p>
          </div>
        )}

        {!isLoading && !error && previewUrl && (
          <>
            {isImage && (
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => setError('Failed to load image')}
              />
            )}

            {isVideo && (
              <video
                src={previewUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[85vh] rounded-lg"
                onLoadedData={() => setIsLoading(false)}
                onError={() => setError('Failed to load video')}
              >
                Your browser does not support video playback.
              </video>
            )}

            {isAudio && (
              <div className="bg-slate-800 rounded-xl p-8 min-w-[300px]">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
                <audio
                  src={previewUrl}
                  controls
                  autoPlay
                  className="w-full"
                  onLoadedData={() => setIsLoading(false)}
                  onError={() => setError('Failed to load audio')}
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {!isImage && !isVideo && !isAudio && (
              <div className="text-center p-8">
                <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white/60">Preview not available for this file type</p>
                <p className="text-white/40 text-sm mt-2">{file.type || 'Unknown type'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Swipe hint for mobile */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
        Tap outside or press ESC to close
      </p>
    </div>
  );
}

