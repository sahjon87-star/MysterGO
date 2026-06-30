import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logErrorToDB } from '../../lib/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    logErrorToDB(error, 'ErrorBoundary', 'critical');
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      let displayMessage = errorMessage;
      let isFirestoreError = false;

      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.operationType) {
          displayMessage = `Database Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
          isFirestoreError = true;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-brand-slate rounded-[40px] p-8 shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-cream tracking-tight">Oops! Something went wrong</h2>
              <p className="text-gray-teal text-sm font-medium leading-relaxed">
                {displayMessage}
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-brand-dark text-cream py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
            {isFirestoreError && (
              <p className="text-[10px] text-gray-teal font-bold uppercase tracking-widest">
                This might be a permission issue. Please contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
