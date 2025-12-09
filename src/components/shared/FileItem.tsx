import { TransferProgress } from '../../types';
import { getFileIcon, formatFileSize } from '../../utils/fileValidation';
import { truncateFilename } from '../../utils/formatters';
import { ProgressBar } from './ProgressBar';

interface FileItemProps {
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    preview?: string;
    blob?: Blob;
  };
  progress?: TransferProgress;
  onRemove?: () => void;
  onPreview?: () => void;
  showProgress?: boolean;
  className?: string;
}

export function FileItem({ 
  file, 
  progress, 
  onRemove,
  onPreview,
  showProgress = false,
  className = '' 
}: FileItemProps) {
  const icon = getFileIcon(file.type);
  const isImage = file.type.startsWith('image/');
  
  const statusColors = {
    pending: 'text-slate-400',
    transferring: 'text-primary-400',
    completed: 'text-success-400',
    failed: 'text-danger-400',
    cancelled: 'text-slate-500',
  };

  const statusIcons = {
    pending: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    transferring: (
      <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    ),
    completed: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    cancelled: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  };

  const isPreviewable = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/');
  
  return (
    <div className={`flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl ${className}`}>
      {/* Preview/Icon - clickable for preview */}
      <button
        onClick={onPreview}
        disabled={!onPreview || !isPreviewable}
        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-700/50 flex items-center justify-center transition-all ${
          onPreview && isPreviewable 
            ? 'cursor-pointer hover:ring-2 hover:ring-primary-500/50 active:scale-95' 
            : ''
        }`}
        title={onPreview && isPreviewable ? 'Click to preview' : undefined}
      >
        {isImage && file.preview ? (
          <img src={file.preview} alt="" className="w-full h-full object-cover" />
        ) : isImage || file.type.startsWith('video/') ? (
          <div className="w-full h-full bg-gradient-to-br from-primary-500/20 to-cyan-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </button>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate" title={file.name}>
          {truncateFilename(file.name, 30)}
        </p>
        <p className="text-xs text-slate-400">
          {formatFileSize(file.size)}
          {progress && progress.status !== 'pending' && (
            <span className="ml-2">
              {progress.status === 'transferring' && `${progress.percentage.toFixed(0)}%`}
              {progress.status === 'completed' && 'Complete'}
              {progress.status === 'failed' && 'Failed'}
            </span>
          )}
        </p>
        
        {/* Progress Bar */}
        {showProgress && progress && progress.status === 'transferring' && (
          <ProgressBar 
            progress={progress.percentage} 
            size="sm" 
            className="mt-2"
          />
        )}
      </div>

      {/* Status/Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {progress && (
          <span className={statusColors[progress.status]}>
            {statusIcons[progress.status]}
          </span>
        )}
        
        {onRemove && !progress && (
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface FileListProps {
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    preview?: string;
    blob?: Blob;
  }>;
  progress?: Map<string, TransferProgress>;
  onRemove?: (id: string) => void;
  onPreview?: (file: { id: string; name: string; size: number; type: string; preview?: string; blob?: Blob }) => void;
  showProgress?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function FileList({ 
  files, 
  progress, 
  onRemove,
  onPreview,
  showProgress = false,
  className = '',
  emptyMessage = 'No files selected'
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-slate-500 ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {files.map(file => (
        <FileItem
          key={file.id}
          file={file}
          progress={progress?.get(file.id)}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
          onPreview={onPreview ? () => onPreview(file) : undefined}
          showProgress={showProgress}
        />
      ))}
    </div>
  );
}

