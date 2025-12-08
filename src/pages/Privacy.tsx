import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-invert prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Our Commitment to Privacy</h2>
          <p className="text-slate-400">
            SecureTransfer is designed with privacy as a fundamental principle. We believe your files 
            are your business, and we've built this service to ensure we never have access to your data.
          </p>
        </section>

        <section className="glass-card">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Key Points</h3>
          <ul className="space-y-3 text-slate-400">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Files transfer directly between your devices (peer-to-peer)</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>We never store, access, or process your files</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>All transfers are end-to-end encrypted using WebRTC</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No account required, no personal information collected</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Room codes are temporary and expire after 60 minutes</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">What Data Do We Collect?</h2>
          <p className="text-slate-400 mb-4">
            <strong className="text-slate-200">Almost nothing.</strong> Here's what we do and don't collect:
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
              <h4 className="font-medium text-danger-400 mb-2">We DO NOT Collect:</h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Your files or their contents</li>
                <li>• File names, sizes, or metadata</li>
                <li>• Personal information</li>
                <li>• Account data (we don't have accounts)</li>
                <li>• Transfer history</li>
                <li>• Device fingerprints or identifiers</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <h4 className="font-medium text-amber-400 mb-2">We May Collect:</h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Basic anonymous analytics (page views) - optional</li>
                <li>• Error logs for debugging (no personal data)</li>
                <li>• Temporary signaling data for WebRTC connection setup</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">How the Transfer Works</h2>
          <p className="text-slate-400 mb-4">
            Understanding how SecureTransfer works helps explain why your data is private:
          </p>
          
          <ol className="space-y-4 text-slate-400">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-semibold">1</span>
              <div>
                <strong className="text-slate-200">Connection Setup:</strong> When you open the app, we use a 
                signaling server (PeerJS) to help your devices find each other. Only connection metadata 
                is exchanged - never file data.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-semibold">2</span>
              <div>
                <strong className="text-slate-200">Direct Connection:</strong> Once connected, your devices 
                communicate directly using WebRTC. This is a peer-to-peer connection that bypasses our 
                servers entirely.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-semibold">3</span>
              <div>
                <strong className="text-slate-200">Encrypted Transfer:</strong> Files are encrypted using 
                DTLS-SRTP (the same encryption used in video calls) and transferred directly between 
                your devices over your local network.
              </div>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Third-Party Services</h2>
          <p className="text-slate-400 mb-4">
            We use minimal third-party services:
          </p>
          <ul className="text-slate-400 space-y-2">
            <li>
              <strong className="text-slate-200">PeerJS:</strong> Used for WebRTC signaling (connection setup only). 
              See their <a href="https://peerjs.com/privacy" className="text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer">privacy policy</a>.
            </li>
            <li>
              <strong className="text-slate-200">Hosting:</strong> Static files hosted on Vercel/Netlify. 
              No server-side processing of your data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Your Rights</h2>
          <p className="text-slate-400">
            Since we don't collect personal data, there's nothing to delete or export. Your files exist 
            only on your devices. Room codes expire automatically and leave no trace on our systems.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Changes to This Policy</h2>
          <p className="text-slate-400">
            We may update this policy occasionally. Significant changes will be announced on the website. 
            Our commitment to privacy will not change.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Contact</h2>
          <p className="text-slate-400">
            Questions about privacy? Please reach out via our GitHub repository or contact form.
          </p>
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

