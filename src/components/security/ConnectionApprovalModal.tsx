import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { SECURITY_CONSTANTS } from '../../types';

interface ConnectionApprovalModalProps {
  isOpen: boolean;
  peerId: string;
  onApprove: () => void;
  onDeny: () => void;
}

export function ConnectionApprovalModal({
  isOpen,
  peerId,
  onApprove,
  onDeny,
}: ConnectionApprovalModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(SECURITY_CONSTANTS.APPROVAL_TIMEOUT_MS / 1000);
  const [isExpired, setIsExpired] = useState(false);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(SECURITY_CONSTANTS.APPROVAL_TIMEOUT_MS / 1000);
      setIsExpired(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isExpired) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isExpired]);

  // Auto-deny on timeout
  useEffect(() => {
    if (isExpired) {
      onDeny();
    }
  }, [isExpired, onDeny]);

  const handleApprove = useCallback(() => {
    if (!isExpired) {
      onApprove();
    }
  }, [isExpired, onApprove]);

  const handleDeny = useCallback(() => {
    onDeny();
  }, [onDeny]);

  // Mask peer ID for display (only show first 8 characters)
  const maskedPeerId = peerId.length > 8 ? `${peerId.slice(0, 8)}...` : peerId;

  // Calculate progress for timer ring
  const progress = (timeRemaining / (SECURITY_CONSTANTS.APPROVAL_TIMEOUT_MS / 1000)) * 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDeny}
      title="Connection Request"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Message */}
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          A device wants to connect
        </h3>
        <p className="text-slate-400 mb-4">
          Device ID: <span className="font-mono text-slate-300">{maskedPeerId}</span>
        </p>

        {/* Timer */}
        <div className="mb-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                className="stroke-slate-700"
                strokeWidth={3}
                fill="transparent"
                r={28}
                cx={32}
                cy={32}
              />
              <circle
                className={`transition-all duration-1000 ease-linear ${
                  timeRemaining <= 10 ? 'stroke-danger-500' : 'stroke-amber-500'
                }`}
                strokeWidth={3}
                strokeLinecap="round"
                fill="transparent"
                r={28}
                cx={32}
                cy={32}
                style={{
                  strokeDasharray: 2 * Math.PI * 28,
                  strokeDashoffset: ((100 - progress) / 100) * 2 * Math.PI * 28,
                }}
              />
            </svg>
            <span className={`absolute text-lg font-semibold ${
              timeRemaining <= 10 ? 'text-danger-400' : 'text-slate-200'
            }`}>
              {timeRemaining}s
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Connection will be denied automatically if not approved
          </p>
        </div>

        {/* Security Warning */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-slate-300 font-medium">Security Check</p>
              <p className="text-xs text-slate-400 mt-1">
                Only approve if you initiated this connection from another device.
                If you don't recognize this request, deny it.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleDeny}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Deny
          </Button>
          <Button
            variant="success"
            className="flex-1"
            onClick={handleApprove}
            disabled={isExpired}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
}

