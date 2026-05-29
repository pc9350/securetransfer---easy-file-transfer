import { describe, it, expect } from 'vitest';
import {
  isAllowedMimeType,
  isBlockedExtension,
  getFileCategory,
  getFileIcon,
  formatFileSize,
  formatSpeed,
  formatTimeRemaining,
  getFileExtension,
} from '../fileValidation';

// ─── MIME Type Allowlist ───────────────────────────────────────────────────────

describe('isAllowedMimeType', () => {
  it('allows common image types', () => {
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('image/webp')).toBe(true);
    expect(isAllowedMimeType('image/gif')).toBe(true);
    expect(isAllowedMimeType('image/svg+xml')).toBe(true);
    expect(isAllowedMimeType('image/avif')).toBe(true);
    expect(isAllowedMimeType('image/tiff')).toBe(true);
    expect(isAllowedMimeType('image/bmp')).toBe(true);
  });

  it('allows common video types', () => {
    expect(isAllowedMimeType('video/mp4')).toBe(true);
    expect(isAllowedMimeType('video/webm')).toBe(true);
    expect(isAllowedMimeType('video/quicktime')).toBe(true);
    expect(isAllowedMimeType('video/x-matroska')).toBe(true);
  });

  it('allows common audio types', () => {
    expect(isAllowedMimeType('audio/mpeg')).toBe(true);
    expect(isAllowedMimeType('audio/wav')).toBe(true);
    expect(isAllowedMimeType('audio/flac')).toBe(true);
    expect(isAllowedMimeType('audio/aac')).toBe(true);
  });

  it('allows document types including new ones', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('text/plain')).toBe(true);
    expect(isAllowedMimeType('text/csv')).toBe(true);
    expect(isAllowedMimeType('text/markdown')).toBe(true);
    expect(isAllowedMimeType('application/json')).toBe(true);
    expect(isAllowedMimeType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
    expect(isAllowedMimeType('application/epub+zip')).toBe(true);
  });

  it('allows archive types', () => {
    expect(isAllowedMimeType('application/zip')).toBe(true);
    expect(isAllowedMimeType('application/x-7z-compressed')).toBe(true);
    expect(isAllowedMimeType('application/gzip')).toBe(true);
    expect(isAllowedMimeType('application/vnd.rar')).toBe(true);
  });

  it('rejects unknown or dangerous types', () => {
    expect(isAllowedMimeType('application/x-executable')).toBe(false);
    expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
    expect(isAllowedMimeType('text/javascript')).toBe(false);
    expect(isAllowedMimeType('')).toBe(false);
    expect(isAllowedMimeType('unknown/type')).toBe(false);
  });
});

// ─── Blocked Extensions ───────────────────────────────────────────────────────

describe('isBlockedExtension', () => {
  it('blocks executable extensions', () => {
    expect(isBlockedExtension('virus.exe')).toBe(true);
    expect(isBlockedExtension('setup.msi')).toBe(true);
    expect(isBlockedExtension('run.bat')).toBe(true);
    expect(isBlockedExtension('script.cmd')).toBe(true);
  });

  it('blocks script extensions', () => {
    expect(isBlockedExtension('deploy.sh')).toBe(true);
    expect(isBlockedExtension('task.ps1')).toBe(true);
    expect(isBlockedExtension('code.vbs')).toBe(true);
  });

  it('blocks installer extensions', () => {
    expect(isBlockedExtension('app.dmg')).toBe(true);
    expect(isBlockedExtension('package.apk')).toBe(true);
    expect(isBlockedExtension('app.deb')).toBe(true);
  });

  it('allows safe extensions', () => {
    expect(isBlockedExtension('photo.jpg')).toBe(false);
    expect(isBlockedExtension('document.pdf')).toBe(false);
    expect(isBlockedExtension('archive.zip')).toBe(false);
    expect(isBlockedExtension('data.csv')).toBe(false);
    expect(isBlockedExtension('readme.md')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isBlockedExtension('virus.EXE')).toBe(true);
    expect(isBlockedExtension('script.PS1')).toBe(true);
  });
});

// ─── File Category ────────────────────────────────────────────────────────────

describe('getFileCategory', () => {
  it('identifies images', () => {
    expect(getFileCategory('image/jpeg')).toBe('image');
    expect(getFileCategory('image/svg+xml')).toBe('image');
    expect(getFileCategory('image/avif')).toBe('image');
  });

  it('identifies videos', () => {
    expect(getFileCategory('video/mp4')).toBe('video');
    expect(getFileCategory('video/x-matroska')).toBe('video');
  });

  it('identifies audio', () => {
    expect(getFileCategory('audio/mpeg')).toBe('audio');
    expect(getFileCategory('audio/flac')).toBe('audio');
  });

  it('identifies documents', () => {
    expect(getFileCategory('application/pdf')).toBe('document');
    expect(getFileCategory('text/csv')).toBe('document');
    expect(getFileCategory('application/json')).toBe('document');
  });

  it('identifies archives', () => {
    expect(getFileCategory('application/zip')).toBe('archive');
    expect(getFileCategory('application/x-7z-compressed')).toBe('archive');
    expect(getFileCategory('application/gzip')).toBe('archive');
  });

  it('returns unknown for unrecognised types', () => {
    expect(getFileCategory('application/x-executable')).toBe('unknown');
    expect(getFileCategory('')).toBe('unknown');
  });
});

// ─── File Icons ───────────────────────────────────────────────────────────────

describe('getFileIcon', () => {
  it('returns image icon for image types', () => {
    expect(getFileIcon('image/jpeg')).toBe('🖼️');
  });

  it('returns video icon for video types', () => {
    expect(getFileIcon('video/mp4')).toBe('🎬');
  });

  it('returns audio icon for audio types', () => {
    expect(getFileIcon('audio/mpeg')).toBe('🎵');
  });

  it('returns archive icon for archive types', () => {
    expect(getFileIcon('application/zip')).toBe('🗜️');
    expect(getFileIcon('application/x-7z-compressed')).toBe('🗜️');
  });

  it('returns PDF icon for PDFs', () => {
    expect(getFileIcon('application/pdf')).toBe('📄');
  });

  it('returns spreadsheet icon for CSV and Excel', () => {
    expect(getFileIcon('text/csv')).toBe('📊');
    expect(getFileIcon('application/vnd.ms-excel')).toBe('📊');
  });

  it('returns document icon for other documents', () => {
    expect(getFileIcon('text/plain')).toBe('📝');
    expect(getFileIcon('application/msword')).toBe('📝');
  });

  it('returns folder icon for unknown types', () => {
    expect(getFileIcon('application/x-unknown')).toBe('📁');
  });
});

// ─── File Extension ───────────────────────────────────────────────────────────

describe('getFileExtension', () => {
  it('extracts the extension in lowercase', () => {
    expect(getFileExtension('photo.JPG')).toBe('.jpg');
    expect(getFileExtension('document.pdf')).toBe('.pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
  });

  it('returns empty string for files without extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
    expect(getFileExtension('README')).toBe('');
  });
});

// ─── Size Formatting ──────────────────────────────────────────────────────────

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });
});

// ─── Speed Formatting ─────────────────────────────────────────────────────────

describe('formatSpeed', () => {
  it('formats zero speed', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
  });

  it('formats MB/s', () => {
    expect(formatSpeed(5 * 1024 * 1024)).toBe('5 MB/s');
  });
});

// ─── Time Formatting ──────────────────────────────────────────────────────────

describe('formatTimeRemaining', () => {
  it('returns placeholder for invalid values', () => {
    expect(formatTimeRemaining(-1)).toBe('--:--');
    expect(formatTimeRemaining(Infinity)).toBe('--:--');
  });

  it('formats seconds', () => {
    expect(formatTimeRemaining(30)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimeRemaining(90)).toBe('1m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatTimeRemaining(3720)).toBe('1h 2m');
  });
});
