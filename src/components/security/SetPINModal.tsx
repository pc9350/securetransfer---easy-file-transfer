import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { isValidPinFormat } from '../../utils/security';
import { SECURITY_CONSTANTS } from '../../types';

interface SetPINModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetPIN: (pin: string) => void;
}

export function SetPINModal({ isOpen, onClose, onSetPIN }: SetPINModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setStep('enter');
      setError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleInputChange = (
    index: number, 
    value: string, 
    isConfirm: boolean
  ) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const currentPin = isConfirm ? [...confirmPin] : [...pin];
    currentPin[index] = value;
    
    if (isConfirm) {
      setConfirmPin(currentPin);
    } else {
      setPin(currentPin);
    }

    setError('');

    // Move to next input
    if (value && index < SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[index + 1]?.focus();
    }

    // Check if complete
    if (value && index === SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      const fullPin = currentPin.join('');
      if (isValidPinFormat(fullPin)) {
        if (!isConfirm) {
          // Move to confirm step
          setStep('confirm');
          setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
        } else {
          // Verify PINs match
          const originalPin = pin.join('');
          if (fullPin === originalPin) {
            onSetPIN(fullPin);
            onClose();
          } else {
            setError('PINs do not match');
            setConfirmPin(['', '', '', '']);
            setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
          }
        }
      }
    }
  };

  const handleKeyDown = (
    index: number, 
    e: KeyboardEvent<HTMLInputElement>,
    isConfirm: boolean
  ) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const currentPin = isConfirm ? confirmPin : pin;

    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowRight' && index < SECURITY_CONSTANTS.PIN_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, isConfirm: boolean) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, SECURITY_CONSTANTS.PIN_LENGTH);
    
    if (/^\d+$/.test(pastedData)) {
      const newPin = pastedData.split('').concat(['', '', '', '']).slice(0, SECURITY_CONSTANTS.PIN_LENGTH);
      if (isConfirm) {
        setConfirmPin(newPin);
      } else {
        setPin(newPin);
      }
    }
  };

  const renderPinInputs = (isConfirm: boolean) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    return (
      <div className="flex justify-center gap-3">
        {currentPin.map((digit, index) => (
          <input
            key={index}
            ref={el => { refs.current[index] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleInputChange(index, e.target.value, isConfirm)}
            onKeyDown={e => handleKeyDown(index, e, isConfirm)}
            onPaste={e => handlePaste(e, isConfirm)}
            className="w-14 h-14 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-700 
                       rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 
                       focus:ring-primary-500/20 transition-all"
            aria-label={`PIN digit ${index + 1}`}
          />
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Security PIN"
      size="sm"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        {/* Instructions */}
        <p className="text-slate-400 mb-6">
          {step === 'enter' 
            ? 'Enter a 4-digit PIN for extra security'
            : 'Confirm your PIN'
          }
        </p>

        {/* PIN Input */}
        {step === 'enter' ? renderPinInputs(false) : renderPinInputs(true)}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-danger-400">{error}</p>
        )}

        {/* Info */}
        <div className="mt-6 p-3 bg-slate-800/50 rounded-xl">
          <p className="text-xs text-slate-400">
            The sender will need to enter this PIN to connect.
            The PIN is only valid for this session.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          {step === 'confirm' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setStep('enter');
                setError('');
                setPin(['', '', '', '']);
                setConfirmPin(['', '', '', '']);
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
              }}
            >
              Start Over
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

