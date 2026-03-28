'use client';

import { XCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'warning';
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

const styles = {
  error: {
    container: 'bg-red-50 border border-red-200',
    icon: 'text-red-500',
    text: 'text-red-700',
    retry: 'text-red-700 hover:text-red-800',
    dismiss: 'text-red-400 hover:text-red-600',
  },
  warning: {
    container: 'bg-amber-50 border border-amber-200',
    icon: 'text-amber-500',
    text: 'text-amber-700',
    retry: 'text-amber-700 hover:text-amber-800',
    dismiss: 'text-amber-400 hover:text-amber-600',
  },
};

export default function ErrorBanner({
  message,
  variant = 'error',
  onDismiss,
  onRetry,
  className = '',
}: ErrorBannerProps) {
  const s = styles[variant];
  const Icon = variant === 'error' ? XCircleIcon : ExclamationTriangleIcon;

  return (
    <div className={`rounded-lg p-4 ${s.container} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${s.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${s.text}`}>{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`text-sm font-medium underline mt-1 ${s.retry}`}
            >
              Try again
            </button>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`flex-shrink-0 ${s.dismiss}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
