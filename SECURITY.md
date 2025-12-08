# Security Policy

## Overview

SecureTransfer is designed with security as a core principle. This document outlines our security measures, threat model, and vulnerability disclosure process.

## Security Features

### 1. End-to-End Encryption

All file transfers use WebRTC's built-in DTLS-SRTP encryption:
- Perfect Forward Secrecy (PFS)
- AES-128 or AES-256 encryption
- Peer-to-peer communication bypasses servers entirely

### 2. Cryptographic Room Codes

- Generated using `crypto.getRandomValues()` for cryptographic randomness
- 8-character codes from base32 alphabet (excludes ambiguous characters)
- ~40 bits of entropy (~1 trillion combinations)
- Expires after 60 minutes
- One-time use (destroyed after session)

### 3. Connection Security

- **Manual Approval**: Every connection requires explicit user approval
- **30-Second Timeout**: Unapproved connections are automatically denied
- **Rate Limiting**: Max 3 attempts per 5 minutes per peer
- **PIN Protection**: Optional 4-digit PIN (hashed with SHA-256)
- **Heartbeat**: Continuous connection monitoring

### 4. File Validation

#### Blocked File Types
```
.exe, .bat, .cmd, .com, .msi, .scr  (Windows executables)
.vbs, .vbe, .js, .jse, .ws, .wsf    (Scripts)
.ps1, .psm1, .psd1                   (PowerShell)
.sh, .bash, .zsh                     (Shell scripts)
.app, .dmg, .pkg                     (macOS)
.apk, .deb, .rpm                     (Mobile/Linux)
```

#### Validation Checks
- MIME type verification
- File signature (magic bytes) verification
- File name sanitization (removes path traversal, XSS vectors)
- Size limits (2GB per file, 10GB per session)

### 5. Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
connect-src 'self' wss://0.peerjs.com https://0.peerjs.com;
worker-src 'self' blob:;
media-src 'self' blob:;
```

### 6. Additional Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`

## Threat Model

### Protected Against

| Threat | Mitigation |
|--------|------------|
| Eavesdropping | WebRTC DTLS-SRTP encryption |
| Man-in-the-Middle | HTTPS, WebRTC encryption |
| Brute-Force Room Codes | Rate limiting, 40-bit entropy |
| Unauthorized Access | Manual approval, optional PIN |
| Malicious Files | File type blocking, validation |
| XSS Attacks | CSP, input sanitization |
| CSRF | No server-side state to exploit |
| Data Theft | No server storage |

### User Responsibilities

Users should:
- Only approve connections they initiated
- Use PIN protection for sensitive transfers
- Keep their browser updated
- Not share room codes publicly
- Verify the receiving device before approving

### Out of Scope

- Malware on user devices
- Compromised browsers
- Network-level attacks (ISP monitoring)
- Physical device access

## Data Flow

```
iPhone                    Signaling Server              Windows PC
   |                           |                            |
   |  1. Create room code     |                            |
   |<--------------------------|                            |
   |                           |                            |
   |                           |   2. Request connection    |
   |                           |<---------------------------|
   |                           |                            |
   |  3. Connection request    |                            |
   |<--------------------------|                            |
   |                           |                            |
   |  4. User approves         |                            |
   |-------------------------->|                            |
   |                           |                            |
   |=================== WebRTC Direct Connection ===========|
   |                                                        |
   |  5. Files transfer directly (encrypted)                |
   |<------------------------------------------------------>|
```

## Vulnerability Disclosure

### Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **Do NOT** create a public GitHub issue
2. Email security details to: [security@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Based on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Recognition

We appreciate responsible disclosure and will:
- Credit researchers in our changelog (with permission)
- Not pursue legal action for good-faith research
- Keep you informed of fix progress

## Security Checklist for Deployment

- [ ] HTTPS enabled (required for WebRTC)
- [ ] Security headers configured
- [ ] CSP headers active
- [ ] No sensitive data in logs
- [ ] Dependencies up to date
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] Rate limiting functional
- [ ] Error messages don't leak information

## Audit Log

Security-relevant events are logged client-side (in-memory only):
- Connection attempts
- Approvals/denials
- PIN verification attempts
- Transfer completion
- Errors

Logs are:
- Not persisted
- Not sent to servers
- Cleared on session end
- Sanitized (no file contents, partial peer IDs)

## Updates

This security policy may be updated as we improve our security measures. Check the version date below for the latest revision.

---

**Last Updated**: December 2024
**Version**: 1.0

