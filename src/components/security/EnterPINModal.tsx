import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { SECURITY_CONSTANTS } from '../../types';

interface EnterPINModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  attemptsRemaining?: number;
  error?: string;
}

export function EnterPINModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  attemptsRemaining = SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS,
  error: externalError,
}: EnterPINModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setIsSubmitting(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Reset on error
  useEffect(() => {
    if (externalError) {
      setPin(['', '', '', '']);
      setIsSubmitting(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [externalError]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Move to next input
    if (value && index < SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      const fullPin = newPin.join('');
      if (fullPin.length === SECURITY_CONSTANTS.PIN_LENGTH) {
        setIsSubmitting(true);
        onSubmit(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowRight' && index < SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, SECURITY_CONSTANTS.PIN_LENGTH);
    
    if (/^\d+$/.test(pastedData)) {
      const newPin = pastedData.split('').concat(['', '', '', '']).slice(0, SECURITY_CONSTANTS.PIN_LENGTH);
      setPin(newPin);
      
      if (pastedData.length === SECURITY_CONSTANTS.PIN_LENGTH) {
        setIsSubmitting(true);
        onSubmit(pastedData);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter PIN"
      size="sm"
      closeOnOverlayClick={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Instructions */}
        <p className="text-slate-400 mb-2">
          This connection requires a PIN
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Ask the receiver for the 4-digit PIN
        </p>

        {/* PIN Input */}
        <div className="flex justify-center gap-3">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInputChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isSubmitting}
              className={`w-14 h-14 text-center text-2xl font-bold bg-slate-800 border-2 
                         rounded-xl focus:outline-none focus:ring-2 transition-all
                         disabled:opacity-50
                         ${externalError 
                           ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20 animate-shake' 
                           : 'border-slate-700 focus:border-primary-500 focus:ring-primary-500/20'
                         }`}
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Error */}
        {externalError && (
          <p className="mt-4 text-sm text-danger-400">{externalError}</p>
        )}

        {/* Attempts Warning */}
        {attemptsRemaining < SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS && (
          <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl">
            <p className="text-sm text-danger-400">
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

