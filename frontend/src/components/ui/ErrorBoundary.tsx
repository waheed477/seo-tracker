import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fade-in max-w-4xl p-6 lg:p-8">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-100 dark:border-red-800/40 dark:bg-red-900/40">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6 text-red-600 dark:text-red-400"
              >
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 5v3.5M8 11h.01" />
              </svg>
            </div>
            <h2 className="font-heading text-[var(--color-text-primary)] mb-2 text-lg font-semibold">Something went wrong</h2>
            <p className="text-[var(--color-text-secondary)] mx-auto mb-4 max-w-md text-sm">
              An unexpected error occurred on this page. The rest of the app is still running.
            </p>
            {this.state.error?.message && (
              <p className="mx-auto mb-4 max-w-lg font-mono text-xs text-red-600 dark:text-red-400/60">{this.state.error.message}</p>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-[var(--color-accent)]/20 border-[var(--color-accent)]/30 text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/30 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
