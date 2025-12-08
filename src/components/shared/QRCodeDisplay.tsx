import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatRoomCode } from '../../utils/security';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  roomCode?: string;
  className?: string;
}

export function QRCodeDisplay({ 
  value, 
  size = 200, 
  roomCode,
  className = '' 
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

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

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-800/50 rounded-2xl p-4 ${className}`}>
        <p className="text-danger-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
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

      {/* Room Code Display */}
      {roomCode && (
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            Or enter code manually
          </p>
          <p className="text-2xl font-mono font-bold text-slate-100 tracking-widest select-all">
            {formatRoomCode(roomCode)}
          </p>
        </div>
      )}
    </div>
  );
}

