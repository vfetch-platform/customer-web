'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { OTP_RESEND_COOLDOWN_SECONDS, OTP_LENGTH, OTP_FOCUS_DELAY_MS, OTP_ERROR_FOCUS_DELAY_MS } from '@/constants/claimSteps';

interface OTPModalProps {
  email: string;
  otpVerifying: boolean;
  otpSending: boolean;
  otpError: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onClose: () => void;
}

export default function OTPModal({ email, otpVerifying, otpSending, otpError, onVerify, onResend, onClose }: OTPModalProps) {
  const [digits, setDigits] = useState(Array<string>(OTP_LENGTH).fill(''));
  const [resendCountdown, setResendCountdown] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmitted = useRef(false);

  // Start countdown on mount
  useEffect(() => {
    intervalRef.current = setInterval(() =>
      setResendCountdown((c) => (c > 0 ? c - 1 : 0)), 1000
    );
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Auto-focus first input on open
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), OTP_FOCUS_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Reset digits and re-focus when an error comes back
  useEffect(() => {
    if (otpError) {
      hasSubmitted.current = false;
      setDigits(Array<string>(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), OTP_ERROR_FOCUS_DELAY_MS);
    }
  }, [otpError]);

  const trySubmit = useCallback((currentDigits: string[]) => {
    if (currentDigits.every((d) => d !== '') && !hasSubmitted.current) {
      hasSubmitted.current = true;
      onVerify(currentDigits.join(''));
    }
  }, [onVerify]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    trySubmit(newDigits);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      trySubmit(newDigits);
    }
  };

  const handleResend = () => {
    hasSubmitted.current = false;
    setDigits(Array<string>(OTP_LENGTH).fill(''));
    setResendCountdown(OTP_RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() =>
      setResendCountdown((c) => (c > 0 ? c - 1 : 0)), 1000
    );
    onResend();
    setTimeout(() => inputRefs.current[0]?.focus(), OTP_ERROR_FOCUS_DELAY_MS);
  };

  const isActive = !otpVerifying && !otpSending;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">mark_email_unread</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="font-headline text-xl font-bold text-primary text-center mb-1">
          Check your email
        </h2>
        <p className="text-sm text-outline text-center mb-6">
          We sent a 6-digit code to<br />
          <span className="font-medium text-on-surface">{email}</span>
        </p>

        {/* Digit inputs */}
        <div className="flex gap-2 justify-center mb-2" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={!isActive}
              className={[
                'w-11 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all focus:outline-none',
                digit ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 bg-surface-container-low text-on-surface',
                otpError ? 'border-error bg-error/5' : '',
                !isActive ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Status */}
        <div className="min-h-[24px] flex items-center justify-center mb-4">
          {otpVerifying && (
            <span className="flex items-center gap-1.5 text-sm text-outline">
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Verifying…
            </span>
          )}
          {otpError && !otpVerifying && (
            <p className="text-xs text-error text-center">{otpError}</p>
          )}
        </div>

        {/* Resend */}
        <p className="text-center text-sm text-outline">
          Didn&apos;t receive it?{' '}
          {resendCountdown > 0 ? (
            <span className="text-outline/70">Resend in {resendCountdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={otpSending}
              className="text-primary font-medium hover:underline disabled:opacity-50"
            >
              {otpSending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
