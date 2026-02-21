import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  stack?: string;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error), stack: String(error?.stack || '') };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App crashed with error:', error, errorInfo);
    try {
      // expose last error for quick inspection in DevTools
      (window as any).__LAST_ERROR__ = {
        message: String(error?.message || error),
        stack: String(error?.stack || ''),
        info: errorInfo,
        time: new Date().toISOString(),
      };
      // lightweight beacon to server (non-blocking) – safe endpoint returns 204
      navigator.sendBeacon?.('/~api/analytics', new Blob([JSON.stringify({
        type: 'client_error',
        message: String(error?.message || error),
        stack: String(error?.stack || ''),
        time: Date.now(),
      })], { type: 'application/json' }));
    } catch {}
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-panel-strong rounded-xl p-8 text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">An unexpected error occurred. Please reload the page.</p>
            {this.state.message && (
              <div className="text-left bg-gray-800/60 border border-gray-700 rounded-md p-3 text-xs text-gray-300 mb-4 overflow-auto max-h-40">
                <div className="font-semibold mb-1">Error:</div>
                <div className="mb-2 break-all">{this.state.message}</div>
                {this.state.stack && (
                  <>
                    <div className="font-semibold mb-1">Stack:</div>
                    <pre className="whitespace-pre-wrap break-all">{this.state.stack}</pre>
                  </>
                )}
              </div>
            )}
            <button onClick={this.handleReload} className="btn-primary text-white px-4 py-2 rounded-md">Reload</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;