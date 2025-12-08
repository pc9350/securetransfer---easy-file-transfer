import { Link } from 'react-router-dom';
import { getDeviceInfo } from '../utils/deviceDetection';

export default function Help() {
  const deviceInfo = getDeviceInfo();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Help & Support</h1>
      
      <div className="space-y-8">
        {/* Quick Start */}
        <section className="glass-card">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Quick Start Guide</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">1</span>
                On your Windows PC
              </h3>
              <ul className="text-slate-400 text-sm space-y-2 ml-8">
                <li>Open this website in Chrome, Edge, or Firefox</li>
                <li>Click "Receive Files"</li>
                <li>A QR code and room code will appear</li>
                <li>Optionally, click "Set PIN" for extra security</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">2</span>
                On your iPhone
              </h3>
              <ul className="text-slate-400 text-sm space-y-2 ml-8">
                <li>Open this website in Safari</li>
                <li>Click "Send Files"</li>
                <li>Scan the QR code shown on your PC, or enter the code manually</li>
                <li>If prompted, enter the PIN set on your PC</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">3</span>
                Approve & Transfer
              </h3>
              <ul className="text-slate-400 text-sm space-y-2 ml-8">
                <li>On your PC, click "Approve" when the connection request appears</li>
                <li>On your iPhone, select the files you want to send</li>
                <li>Tap "Send Files"</li>
                <li>Files will download automatically on your PC</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Troubleshooting</h2>
          
          <div className="space-y-4">
            <details className="glass-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-100">Connection won't establish</span>
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 text-slate-400 text-sm space-y-2">
                <p><strong className="text-slate-200">Make sure both devices are on the same WiFi network.</strong></p>
                <p>Check that:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>The room code is entered correctly (case doesn't matter)</li>
                  <li>You approved the connection on the receiving device</li>
                  <li>Your firewall isn't blocking WebRTC connections</li>
                  <li>The room code hasn't expired (codes expire after 60 minutes)</li>
                </ul>
              </div>
            </details>

            <details className="glass-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-100">QR scanner not working</span>
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 text-slate-400 text-sm space-y-2">
                <p>If the QR scanner doesn't work:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Make sure you've granted camera permission to the browser</li>
                  <li>Ensure good lighting on the QR code</li>
                  <li>Hold your phone steady and not too close</li>
                  <li>Try cleaning your camera lens</li>
                  <li>Use the manual code entry as a backup</li>
                </ul>
              </div>
            </details>

            <details className="glass-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-100">Transfer is slow</span>
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 text-slate-400 text-sm space-y-2">
                <p>Transfer speed depends on your WiFi connection:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Move closer to your WiFi router</li>
                  <li>Reduce interference from other devices</li>
                  <li>5GHz WiFi is faster than 2.4GHz</li>
                  <li>Close bandwidth-heavy apps on your devices</li>
                  <li>Expected speed: 5-15 MB/s on typical home WiFi</li>
                </ul>
              </div>
            </details>

            <details className="glass-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-100">Files not downloading on PC</span>
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 text-slate-400 text-sm space-y-2">
                <p>If files aren't downloading automatically:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Check your browser's download settings</li>
                  <li>Look in your Downloads folder</li>
                  <li>Some browsers may block multiple automatic downloads</li>
                  <li>Allow pop-ups/downloads for this site</li>
                  <li>Check if your antivirus is blocking downloads</li>
                </ul>
              </div>
            </details>

            <details className="glass-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-100">File type not allowed</span>
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 text-slate-400 text-sm space-y-2">
                <p>For security, we block certain file types:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Executables (.exe, .bat, .sh, .app)</li>
                  <li>Scripts (.js, .vbs, .ps1)</li>
                  <li>Some archive types</li>
                </ul>
                <p className="mt-2">
                  To transfer these files, you can zip them first (but the zip will be flagged if it 
                  contains executables).
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* System Requirements */}
        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">System Requirements</h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-card">
              <h3 className="font-medium text-slate-200 mb-3">iPhone (Sender)</h3>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  iOS 14.0 or later
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Safari browser (recommended)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Camera permission for QR scanning
                </li>
              </ul>
            </div>

            <div className="glass-card">
              <h3 className="font-medium text-slate-200 mb-3">Windows PC (Receiver)</h3>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Windows 10 or later
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Chrome 90+, Edge 90+, or Firefox 88+
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Same WiFi network as iPhone
                </li>
              </ul>
            </div>
          </div>

          {/* Current Device Info */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
            <h4 className="font-medium text-slate-200 mb-2">Your Current Device</h4>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Browser: {deviceInfo.browser} {deviceInfo.browserVersion}</p>
              <p>Platform: {deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : deviceInfo.isWindows ? 'Windows' : deviceInfo.isMac ? 'macOS' : 'Unknown'}</p>
              <p>WebRTC Support: {deviceInfo.supportsWebRTC ? '✅ Supported' : '❌ Not Supported'}</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="glass-card">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Still Need Help?</h2>
          <p className="text-slate-400 mb-4">
            If you're still experiencing issues or have questions, please check our GitHub repository 
            for known issues and updates.
          </p>
          <div className="flex flex-wrap gap-3">
            <a 
              href="#" 
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

