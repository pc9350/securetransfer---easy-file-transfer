import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { formatRoomCode } from '../../utils/security';
import { useToast } from './Toast';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  roomCode?: string;
  expiresAt?: number;
  className?: string;
}

export function QRCodeDisplay({ 
  value, 
  size = 200, 
  roomCode,
  expiresAt,
  className = '' 
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // Generate QR code
  useEffect(() => {
    async function generateQR() {
      try {
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#f8fafc', // slate-50
            light: '#00000000', // transparent
          },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
        setError('');
      } catch (err) {
        setError('Failed to generate QR code');
        console.error('QR Code generation error:', err);
      }
    }

    generateQR();
  }, [value, size]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        setIsExpiringSoon(true);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setIsExpiringSoon(minutes < 5);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Copy room code to clipboard
  const handleCopy = useCallback(async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(formatRoomCode(roomCode));
      setCopied(true);
      toast.success('Copied!', 'Room code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formatRoomCode(roomCode);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Copied!', 'Room code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomCode, toast]);

  // Share link via Web Share API or clipboard
  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'SecureTransfer',
      text: `Join my file transfer session with code: ${formatRoomCode(roomCode || '')}`,
      url: value,
    };

    // Try Web Share API (native share sheet on mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or error, fall back to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Link copied!', 'Share link copied to clipboard');
    } catch {
      toast.error('Failed to copy', 'Please copy the link manually');
    }
  }, [value, roomCode, toast]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-800/50 rounded-2xl p-4 ${className}`}>
        <p className="text-danger-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Countdown Timer */}
      {expiresAt && timeRemaining && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          isExpiringSoon 
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
            : 'bg-slate-800/50 text-slate-400'
        }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Expires in {timeRemaining}</span>
        </div>
      )}

      {/* QR Code Container */}
      <div className="relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-cyan-500/20 blur-2xl" />
        
        {/* QR Code */}
        <div className="relative bg-slate-900 rounded-2xl p-4 border border-slate-800">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="QR Code for connection"
              width={size}
              height={size}
              className="rounded-lg"
            />
          ) : (
            <div 
              className="flex items-center justify-center bg-slate-800 rounded-lg animate-pulse"
              style={{ width: size, height: size }}
            >
              <svg className="w-8 h-8 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Room Code Display with Copy Button */}
      {roomCode && (
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Or enter code manually
          </p>
          <div className="flex items-center gap-2 justify-center">
            <p className="text-2xl font-mono font-bold text-slate-100 tracking-widest select-all">
              {formatRoomCode(roomCode)}
            </p>
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all ${
                copied 
                  ? 'bg-success-500/20 text-success-400' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              title="Copy room code"
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Share Link Button */}
      {value && (
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Link
        </button>
      )}
    </div>
  );
}
