import { Link } from 'react-router-dom';
import { SecurityBadge } from '../components/shared/SecurityBadge';

export default function Security() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Security</h1>
      
      <div className="prose prose-invert prose-slate max-w-none space-y-8">
        <p className="text-lg text-slate-400">
          Security is at the core of SecureTransfer. Here's how we protect your files and ensure 
          safe transfers.
        </p>

        {/* Security Features */}
        <section className="grid gap-4">
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-success-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">End-to-End Encryption</h3>
            </div>
            <p className="text-slate-400">
              All file transfers are encrypted using WebRTC's built-in DTLS-SRTP encryption. This is the 
              same encryption standard used by video conferencing apps like Zoom and Google Meet. Your 
              files are encrypted on your device and can only be decrypted by the receiving device.
            </p>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Peer-to-Peer Transfer</h3>
            </div>
            <p className="text-slate-400">
              Files transfer directly between your devices without passing through any servers. This means 
              your data never leaves your local network, and there's no central point where your files 
              could be intercepted or stored.
            </p>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Manual Connection Approval</h3>
            </div>
            <p className="text-slate-400">
              Every connection requires manual approval from the receiving device. When someone tries to 
              connect using your room code, you'll see a notification and must explicitly approve the 
              connection. Unapproved connections are automatically denied after 30 seconds.
            </p>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Optional PIN Protection</h3>
            </div>
            <p className="text-slate-400">
              For additional security, you can set a 4-digit PIN. The sender must enter this PIN after 
              scanning the QR code, adding another layer of verification. PINs are hashed before 
              transmission and never stored.
            </p>
          </div>
        </section>

        {/* Technical Details */}
        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Technical Security Measures</h2>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Cryptographic Room Codes</h4>
              <p className="text-slate-400 text-sm">
                Room codes are generated using <code className="text-primary-400">crypto.getRandomValues()</code> for 
                cryptographic randomness. Each 8-character code provides ~40 bits of entropy, making 
                brute-force attacks impractical. Codes expire after 60 minutes.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-200 mb-2">File Validation</h4>
              <p className="text-slate-400 text-sm">
                All files are validated before transfer. We check MIME types, file signatures (magic bytes), 
                and block potentially dangerous file types like executables (.exe, .bat, .sh). File names 
                are sanitized to prevent XSS and path traversal attacks.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-200 mb-2">Rate Limiting</h4>
              <p className="text-slate-400 text-sm">
                Connection attempts are rate-limited to prevent brute-force attacks. After 3 failed 
                attempts within 5 minutes, further connections are temporarily blocked. This protects 
                against automated attacks.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-200 mb-2">Content Security Policy</h4>
              <p className="text-slate-400 text-sm">
                The application implements strict CSP headers to prevent XSS attacks, limit resource 
                loading to trusted domains, and protect against code injection.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-200 mb-2">HTTPS Only</h4>
              <p className="text-slate-400 text-sm">
                SecureTransfer requires HTTPS. This ensures all communication with our servers is 
                encrypted and prevents man-in-the-middle attacks during the initial connection setup.
              </p>
            </div>
          </div>
        </section>

        {/* What We Protect Against */}
        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">What We Protect Against</h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-success-500/5 border border-success-500/20 rounded-xl">
              <h4 className="font-medium text-success-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Protected
              </h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Eavesdropping on transfers</li>
                <li>• Unauthorized access</li>
                <li>• Malicious file uploads</li>
                <li>• Brute-force attacks</li>
                <li>• Man-in-the-middle attacks</li>
                <li>• XSS and injection attacks</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <h4 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                User Responsibility
              </h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Keeping devices secure</li>
                <li>• Not sharing room codes publicly</li>
                <li>• Using PIN for sensitive transfers</li>
                <li>• Approving only known devices</li>
                <li>• Keeping browser updated</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Report Security Issues */}
        <section className="glass-card">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Report Security Issues</h2>
          <p className="text-slate-400 mb-4">
            Found a security vulnerability? We appreciate responsible disclosure. Please report 
            security issues through our GitHub repository's security advisories or contact us directly.
          </p>
          <div className="flex items-center gap-2">
            <SecurityBadge type="verified" size="sm" />
            <span className="text-sm text-slate-500">We take all reports seriously</span>
          </div>
        </section>

        <p className="text-sm text-slate-500 pt-8 border-t border-slate-800">
          Last updated: December 2024
        </p>
      </div>

      <div className="mt-8">
        <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

