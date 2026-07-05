import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

/**
 * Last-resort render error boundary — replaces a white screen with a
 * branded recovery card. Network errors are handled per-surface; this
 * only catches unexpected render/runtime crashes.
 */
export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[XpressBnB] Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#F8FAFC' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 24px 64px rgba(15,23,42,0.10)',
          }}
        >
          <h1 className="text-xl font-extrabold mb-2" style={{ color: '#0F172A' }}>
            Something went wrong
          </h1>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#64748B' }}>
            An unexpected error interrupted the page. Reloading usually fixes it —
            your inquiries and bookings are safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl font-bold text-white min-h-[44px]"
              style={{ background: '#059669', boxShadow: '0 6px 20px rgba(5,150,105,0.30)' }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-xl font-semibold min-h-[44px]"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#0F172A',
              }}
            >
              Go to homepage
            </button>
          </div>
        </div>
      </div>
    );
  }
}
