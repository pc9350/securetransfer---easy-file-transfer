import { DeviceInfo } from '../types';

/**
 * Detect device and browser information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // Detect specific platforms
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  
  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';
  
  if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || '';
  } else if (/Chrome/i.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (/Safari/i.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
  }
  
  // Check WebRTC support
  const supportsWebRTC = !!(
    window.RTCPeerConnection ||
    (window as unknown as { mozRTCPeerConnection: unknown }).mozRTCPeerConnection ||
    (window as unknown as { webkitRTCPeerConnection: unknown }).webkitRTCPeerConnection
  );
  
  // Check File System Access API
  const supportsFileSystemAccess = 'showSaveFilePicker' in window;
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isWindows,
    isMac,
    browser,
    browserVersion,
    supportsWebRTC,
    supportsFileSystemAccess,
  };
}

/**
 * Check if browser is compatible with the app
 */
export function checkBrowserCompatibility(): {
  isCompatible: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const info = getDeviceInfo();
  
  // Check WebRTC support
  if (!info.supportsWebRTC) {
    issues.push('WebRTC is not supported in this browser');
  }
  
  // Check Safari version on iOS
  if (info.isIOS && info.browser === 'Safari') {
    const version = parseInt(info.browserVersion);
    if (version < 14) {
      issues.push('Safari 14 or higher is required on iOS');
    }
  }
  
  // Check Chrome version
  if (info.browser === 'Chrome') {
    const version = parseInt(info.browserVersion);
    if (version < 90) {
      issues.push('Chrome 90 or higher is recommended');
    }
  }
  
  // Check Edge version
  if (info.browser === 'Edge') {
    const version = parseInt(info.browserVersion);
    if (version < 90) {
      issues.push('Edge 90 or higher is recommended');
    }
  }
  
  // Check Firefox version
  if (info.browser === 'Firefox') {
    const version = parseInt(info.browserVersion);
    if (version < 88) {
      issues.push('Firefox 88 or higher is recommended');
    }
  }
  
  // Check for secure context
  if (!window.isSecureContext) {
    issues.push('HTTPS is required for secure file transfer');
  }
  
  return {
    isCompatible: issues.length === 0,
    issues,
  };
}

/**
 * Get recommended action based on device
 */
export function getRecommendedMode(): 'send' | 'receive' {
  const info = getDeviceInfo();
  
  // Mobile devices are typically senders
  if (info.isMobile) {
    return 'send';
  }
  
  // Desktop devices are typically receivers
  return 'receive';
}

/**
 * Get device description for display
 */
export function getDeviceDescription(): string {
  const info = getDeviceInfo();
  
  if (info.isIOS) {
    return 'iPhone/iPad';
  }
  if (info.isAndroid) {
    return 'Android device';
  }
  if (info.isWindows) {
    return 'Windows PC';
  }
  if (info.isMac) {
    return 'Mac';
  }
  
  return info.isMobile ? 'Mobile device' : 'Desktop';
}

