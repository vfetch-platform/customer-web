'use client';

interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'warning';
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

const styles = {
  error: {
    container: 'bg-error-container',
    icon: 'text-on-error-container',
    text: 'text-on-error-container',
    retry: 'text-on-error-container hover:underline',
    dismiss: 'text-on-error-container/60 hover:text-on-error-container',
    iconName: 'error',
  },
  warning: {
    container: 'bg-tertiary-fixed/10',
    icon: 'text-on-tertiary-fixed-variant',
    text: 'text-on-tertiary-fixed-variant',
    retry: 'text-on-tertiary-fixed-variant hover:underline',
    dismiss: 'text-on-tertiary-fixed-variant/60 hover:text-on-tertiary-fixed-variant',
    iconName: 'warning',
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

  return (
    <div className={`rounded-xl p-4 ghost-border ${s.container} ${className}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined flex-shrink-0 ${s.icon}`}>{s.iconName}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${s.text}`}>{message}</p>
          {onRetry && (
            <button onClick={onRetry} className={`text-sm font-bold mt-1 ${s.retry}`}>Try again</button>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`flex-shrink-0 ${s.dismiss}`}>
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>
    </div>
  );
}
