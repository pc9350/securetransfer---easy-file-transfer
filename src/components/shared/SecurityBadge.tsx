interface SecurityBadgeProps {
  type: 'encrypted' | 'pin' | 'approval' | 'verified' | 'p2p';
  size?: 'sm' | 'md';
  className?: string;
}

export function SecurityBadge({ type, size = 'md', className = '' }: SecurityBadgeProps) {
  const badges = {
    encrypted: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      text: 'End-to-End Encrypted',
      color: 'text-success-400 border-success-500/30 bg-success-500/10',
    },
    pin: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      text: 'PIN Protected',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    approval: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      text: 'Manual Approval',
      color: 'text-primary-400 border-primary-500/30 bg-primary-500/10',
    },
    verified: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: 'Verified',
      color: 'text-success-400 border-success-500/30 bg-success-500/10',
    },
    p2p: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      text: 'Direct Transfer',
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
  };

  const badge = badges[type];
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${badge.color} ${sizeStyles} ${className}`}
    >
      {badge.icon}
      {badge.text}
    </span>
  );
}

export function SecurityBadges({ showPin = false, className = '' }: { showPin?: boolean; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <SecurityBadge type="encrypted" size="sm" />
      <SecurityBadge type="p2p" size="sm" />
      {showPin && <SecurityBadge type="pin" size="sm" />}
      <SecurityBadge type="approval" size="sm" />
    </div>
  );
}

