interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  size = 'md',
  showPercentage = false,
  variant = 'primary',
  animated = true,
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-amber-500',
    danger: 'bg-danger-500',
  };

  const bgVariantStyles = {
    primary: 'bg-primary-500/20',
    success: 'bg-success-500/20',
    warning: 'bg-amber-500/20',
    danger: 'bg-danger-500/20',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full rounded-full overflow-hidden ${sizeStyles[size]} ${bgVariantStyles[variant]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variantStyles[variant]} ${
            animated && clampedProgress < 100 ? 'animate-pulse' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-slate-400 font-mono">
            {clampedProgress.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 4,
  variant = 'primary',
  showPercentage = true,
  className = '',
}: CircularProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;

  const variantColors = {
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    warning: 'stroke-amber-500',
    danger: 'stroke-danger-500',
  };

  const bgColors = {
    primary: 'stroke-primary-500/20',
    success: 'stroke-success-500/20',
    warning: 'stroke-amber-500/20',
    danger: 'stroke-danger-500/20',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          className={bgColors[variant]}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${variantColors[variant]} transition-all duration-300 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-sm font-semibold text-slate-200">
          {clampedProgress.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

