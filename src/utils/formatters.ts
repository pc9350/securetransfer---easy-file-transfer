// Re-export from fileValidation for convenience
export { formatFileSize, formatSpeed, formatTimeRemaining } from './fileValidation';

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Truncate filename keeping extension
 */
export function truncateFilename(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) return filename;
  
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return truncate(filename, maxLength);
  }
  
  const ext = filename.slice(lastDot);
  const name = filename.slice(0, lastDot);
  const maxNameLength = maxLength - ext.length - 3;
  
  if (maxNameLength < 5) {
    return truncate(filename, maxLength);
  }
  
  return name.slice(0, maxNameLength) + '...' + ext;
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format count with label
 */
export function formatCount(count: number, label: string, pluralLabel?: string): string {
  return `${count} ${pluralize(count, label, pluralLabel)}`;
}

