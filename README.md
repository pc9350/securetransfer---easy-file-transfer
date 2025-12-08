# SecureTransfer - Peer-to-Peer File Transfer PWA

A secure, privacy-focused Progressive Web App for transferring files between iPhone and Windows PC over local WiFi. No installation required, no cloud storage, no data collection.

## Features

- **End-to-End Encrypted**: WebRTC provides DTLS-SRTP encryption for all transfers
- **Peer-to-Peer**: Files transfer directly between devices, never touching our servers
- **Manual Connection Approval**: Every connection requires explicit user approval
- **Optional PIN Protection**: Add a 4-digit PIN for extra security
- **File Validation**: Blocks executables and validates file types for safety
- **No Account Required**: Just open the website and start transferring
- **Works Offline**: PWA can be installed and works without internet (for local transfers)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **WebRTC**: PeerJS for peer-to-peer connections
- **Build**: Vite
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/file-transfer-pwa.git
cd file-transfer-pwa

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Usage

### On Windows PC (Receiver)

1. Open the website in Chrome, Edge, or Firefox
2. Click "Receive Files"
3. Optionally set a PIN for extra security
4. A QR code and room code will be displayed
5. Approve incoming connections

### On iPhone (Sender)

1. Open the website in Safari
2. Click "Send Files"
3. Scan the QR code or enter the room code
4. Enter PIN if required
5. Select files and tap "Send"

## Security

### Protection Measures

- **Cryptographic Room Codes**: Generated using `crypto.getRandomValues()` with 40 bits of entropy
- **Connection Approval**: Manual approval required for all connections
- **Rate Limiting**: Prevents brute-force attacks on room codes
- **File Validation**: 
  - MIME type checking
  - File signature (magic bytes) verification
  - Blocked file extensions (.exe, .bat, .sh, etc.)
  - File name sanitization
- **Content Security Policy**: Strict CSP headers prevent XSS attacks
- **HTTPS Required**: All connections use secure transport

### What We Don't Do

- Store your files
- Collect personal information
- Track your usage
- Access file contents
- Log transfer history

See [SECURITY.md](./SECURITY.md) for detailed security information.

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist` folder to any static hosting
3. Ensure HTTPS is enabled (required for WebRTC)
4. Configure security headers (see `vercel.json` or `netlify.toml`)

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Safari (iOS) | 14+ | Required for iPhone sender |
| Chrome | 90+ | Recommended for Windows |
| Edge | 90+ | Supported |
| Firefox | 88+ | Supported |

## File Limits

- Maximum file size: 2GB per file
- Maximum session size: 5GB
- Maximum files per batch: 500
- Supported types: Images, Videos, Documents, Audio

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Privacy

This app is designed with privacy as a fundamental principle. See our [Privacy Policy](./src/pages/Privacy.tsx) for details.

---

Built with ❤️ for secure file transfers.

