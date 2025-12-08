import { Link } from 'react-router-dom';
import { getRecommendedMode, checkBrowserCompatibility } from '../utils/deviceDetection';
import { SecurityBadge } from '../components/shared/SecurityBadge';
import { Button } from '../components/shared/Button';

export default function Landing() {
  const recommended = getRecommendedMode();
  const compatibility = checkBrowserCompatibility();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-100 mb-6 animate-fade-in">
          Transfer files{' '}
          <span className="gradient-text">instantly</span>
          <br />
          between devices
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 animate-fade-in animate-delay-100">
          Secure peer-to-peer file transfer between iPhone and Windows PC.
          No installation, no account, no cloud storage.
        </p>

        {/* Security Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in animate-delay-200">
          <SecurityBadge type="encrypted" />
          <SecurityBadge type="p2p" />
          <SecurityBadge type="approval" />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animate-delay-300">
          <Link to="/receive">
            <Button
              variant={recommended === 'receive' ? 'primary' : 'secondary'}
              size="lg"
              className="w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Receive Files
              {recommended === 'receive' && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">
                  Recommended
                </span>
              )}
            </Button>
          </Link>
          
          <Link to="/send">
            <Button
              variant={recommended === 'send' ? 'primary' : 'secondary'}
              size="lg"
              className="w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Files
              {recommended === 'send' && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">
                  Recommended
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Compatibility Warning */}
        {!compatibility.isCompatible && (
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md mx-auto">
            <p className="text-sm text-amber-400">
              {compatibility.issues.join('. ')}
            </p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 text-center mb-12">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="text-center animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Open on PC
            </h3>
            <p className="text-slate-400 text-sm">
              Click "Receive Files" on your Windows PC to generate a QR code and room code
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center animate-slide-up animate-delay-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Connect from iPhone
            </h3>
            <p className="text-slate-400 text-sm">
              Scan the QR code or enter the room code on your iPhone, then approve the connection
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center animate-slide-up animate-delay-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-success-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Send Files
            </h3>
            <p className="text-slate-400 text-sm">
              Select photos, videos, or documents and tap send. Files download automatically on your PC
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 text-center mb-12">
          Why Use SecureTransfer?
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {/* Fast */}
          <div className="glass-card animate-slide-up">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-100 mb-2">Lightning Fast</h3>
            <p className="text-sm text-slate-400">
              Direct device-to-device transfer over your local WiFi. No cloud upload delays.
            </p>
          </div>

          {/* Secure */}
          <div className="glass-card animate-slide-up animate-delay-100">
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-100 mb-2">End-to-End Encrypted</h3>
            <p className="text-sm text-slate-400">
              WebRTC provides secure, encrypted transfers. Your files never touch our servers.
            </p>
          </div>

          {/* Private */}
          <div className="glass-card animate-slide-up animate-delay-200">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-100 mb-2">100% Private</h3>
            <p className="text-sm text-slate-400">
              No accounts, no data collection, no tracking. Your files are your business.
            </p>
          </div>

          {/* Easy */}
          <div className="glass-card animate-slide-up animate-delay-300">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-100 mb-2">No Installation</h3>
            <p className="text-sm text-slate-400">
              Works in your browser. No apps to install, no plugins, no hassle.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="max-w-2xl mx-auto space-y-4">
          <details className="glass-card group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium text-slate-100">Is my data safe?</span>
              <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-slate-400 text-sm">
              Yes! Files transfer directly between your devices using WebRTC encryption. 
              We never store, access, or even see your files. The connection is peer-to-peer.
            </p>
          </details>

          <details className="glass-card group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium text-slate-100">What file types can I transfer?</span>
              <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-slate-400 text-sm">
              Photos (JPG, PNG, GIF, WebP, HEIC), Videos (MP4, MOV), Documents (PDF, Word, Excel, TXT), 
              and Audio files. Executable files are blocked for security.
            </p>
          </details>

          <details className="glass-card group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium text-slate-100">What are the file size limits?</span>
              <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-slate-400 text-sm">
              Maximum 2GB per file, 5GB per session. Transfer up to 500 files at once. 
              Perfect for photos, videos, and documents.
            </p>
          </details>

          <details className="glass-card group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium text-slate-100">Does it work on Android or Mac?</span>
              <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-slate-400 text-sm">
              Currently optimized for iPhone to Windows transfers, but it should work on any 
              modern browser that supports WebRTC. Android and Mac support is available.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

