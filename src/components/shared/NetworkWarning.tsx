import { useState, useEffect } from 'react';

interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType?: string;
  downlink?: number;
}

/**
 * Detect network connection type using Navigator.connection API
 * Falls back gracefully on unsupported browsers
 */
function getNetworkInfo(): NetworkInfo {
  // Navigator.connection is not available on all browsers
  const connection = (navigator as Navigator & {
    connection?: {
      type?: string;
      effectiveType?: string;
      downlink?: number;
    };
  }).connection;

  if (!connection) {
    return { type: 'unknown' };
  }

  let type: NetworkInfo['type'] = 'unknown';
  
  // Only use connection.type for detection - it's the only reliable indicator
  // Note: effectiveType ('4g', '3g', etc.) refers to SPEED, not connection type!
  // An ethernet connection can report '4g' effectiveType, so don't use it.
  if (connection.type === 'wifi') {
    type = 'wifi';
  } else if (connection.type === 'cellular') {
    type = 'cellular';
  } else if (connection.type === 'ethernet') {
    type = 'ethernet';
  }
  // If connection.type is undefined or other values, leave as 'unknown'
  // This is safer than showing false warnings

  return {
    type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
  };
}

interface NetworkWarningProps {
  className?: string;
}

export function NetworkWarning({ className = '' }: NetworkWarningProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ type: 'unknown' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    setNetworkInfo(getNetworkInfo());

    // Listen for connection changes if supported
    const connection = (navigator as Navigator & {
      connection?: EventTarget & {
        addEventListener: (type: string, listener: () => void) => void;
        removeEventListener: (type: string, listener: () => void) => void;
      };
    }).connection;

    if (connection) {
      const updateNetwork = () => setNetworkInfo(getNetworkInfo());
      connection.addEventListener('change', updateNetwork);
      return () => connection.removeEventListener('change', updateNetwork);
    }
  }, []);

  // Only show warning for cellular connections
  if (networkInfo.type !== 'cellular' || dismissed) {
    return null;
  }

  return (
    <div className={`bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        {/* Message */}
        <div className="flex-1">
          <p className="text-sm text-amber-300 font-medium">
            You're on mobile data
          </p>
          <p className="text-xs text-amber-400/80 mt-1">
            File transfers work best on WiFi. Large files may use significant data.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-amber-400 hover:text-amber-300 transition-colors"
          aria-label="Dismiss warning"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
