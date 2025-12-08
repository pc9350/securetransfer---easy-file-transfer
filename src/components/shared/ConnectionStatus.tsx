import { ConnectionState } from '../../types';

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
  showText?: boolean;
}

export function ConnectionStatus({ state, className = '', showText = true }: ConnectionStatusProps) {
  const statusConfig: Record<ConnectionState, { color: string; bgColor: string; text: string; pulse?: boolean }> = {
    idle: {
      color: 'text-slate-400',
      bgColor: 'bg-slate-500',
      text: 'Ready',
    },
    connecting: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500',
      text: 'Connecting...',
      pulse: true,
    },
    awaiting_approval: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500',
      text: 'Awaiting approval...',
      pulse: true,
    },
    connected: {
      color: 'text-success-400',
      bgColor: 'bg-success-500',
      text: 'Connected',
    },
    transferring: {
      color: 'text-primary-400',
      bgColor: 'bg-primary-500',
      text: 'Transferring',
      pulse: true,
    },
    completed: {
      color: 'text-success-400',
      bgColor: 'bg-success-500',
      text: 'Completed',
    },
    error: {
      color: 'text-danger-400',
      bgColor: 'bg-danger-500',
      text: 'Error',
    },
    disconnected: {
      color: 'text-slate-500',
      bgColor: 'bg-slate-600',
      text: 'Disconnected',
    },
  };

  const config = statusConfig[state];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-3 w-3">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75 animate-ping`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${config.bgColor}`} />
      </span>
      {showText && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

