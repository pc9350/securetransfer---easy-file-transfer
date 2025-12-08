# Deployment Guide

This guide covers deploying SecureTransfer to various hosting platforms.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git (for version control deployments)

## Build the Project

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

The built files will be in the `dist` directory.

## Deployment Options

### 1. Vercel (Recommended)

Vercel provides automatic HTTPS, global CDN, and easy deployment.

#### Option A: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect Vite and configure the build

#### Option B: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

#### Custom Domain

1. Go to your project settings in Vercel
2. Add your domain under "Domains"
3. Update DNS records as instructed

### 2. Netlify

#### Option A: GitHub Integration

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Build command: `npm run build`
6. Publish directory: `dist`

#### Option B: CLI Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### 3. Cloudflare Pages

1. Push your code to GitHub
2. Go to Cloudflare Dashboard > Pages
3. Create a project and connect your repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`

### 4. GitHub Pages

Note: GitHub Pages doesn't support server-side redirects, so you'll need to handle routing client-side.

```bash
# Install gh-pages
npm i -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

### 5. Self-Hosted (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/securetransfer/dist;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Environment Variables

Create a `.env` file for local development:

```env
VITE_PEERJS_HOST=0.peerjs.com
VITE_PEERJS_PORT=443
VITE_PEERJS_SECURE=true
```

For production, set these in your hosting platform's environment settings.

## Post-Deployment Checklist

### Security

- [ ] HTTPS is enforced (required for WebRTC)
- [ ] Security headers are present (check with securityheaders.com)
- [ ] CSP is properly configured
- [ ] No mixed content warnings

### Performance

- [ ] Assets are cached with long expiry
- [ ] Gzip/Brotli compression enabled
- [ ] CDN is active

### Functionality

- [ ] QR code generation works
- [ ] QR code scanning works on mobile
- [ ] Peer connection establishes
- [ ] File transfer completes
- [ ] Files download correctly

### PWA

- [ ] Service worker registers
- [ ] "Add to Home Screen" prompt appears
- [ ] App works offline (shows offline message)

## Troubleshooting

### "WebRTC not supported"

- Ensure HTTPS is enabled
- Check browser version compatibility
- Verify CSP allows WebSocket connections to PeerJS

### Connection fails

- Both devices must be on the same network
- Check firewall settings
- Verify PeerJS server is accessible

### Files not downloading

- Check browser download settings
- Verify CSP allows blob URLs
- Check for browser popup blockers

### PWA not installing

- Verify manifest.json is served correctly
- Check service worker registration
- Ensure HTTPS is active

## Monitoring

Consider adding:

- Error tracking (Sentry)
- Anonymous analytics (Plausible, Umami)
- Uptime monitoring (UptimeRobot)

## Updates

To update a deployed site:

1. Make changes locally
2. Test with `npm run dev`
3. Build with `npm run build`
4. Deploy using your platform's method

Most platforms auto-deploy when you push to main branch.

---

For more help, check the [README](./README.md) or open an issue.

