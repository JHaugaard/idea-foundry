import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface Props {
  children: ReactNode;
  fallbackType?: 'search' | 'general';
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to performance monitor
    performanceMonitor.recordMetric({
      operation: 'error_boundary_triggered',
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    });

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Track retry attempt
    performanceMonitor.recordMetric({
      operation: 'error_boundary_retry',
      duration: 0,
      timestamp: Date.now(),
      metadata: { retryCount: newRetryCount }
    });

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount
    });

    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackType = 'general' } = this.props;
      const isSearchError = fallbackType === 'search';
      
      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              {isSearchError ? (
                <>
                  <Search className="h-4 w-4" />
                  Search Error
                </>
              ) : (
                'Something went wrong'
              )}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isSearchError ? (
                  'There was an issue with the search functionality. You can still browse your notes manually.'
                ) : (
                  'An unexpected error occurred. Please try refreshing the page.'
                )}
              </p>
              
              {this.state.retryCount < 3 && (
                <Button 
                  onClick={this.handleRetry}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              {this.state.retryCount >= 3 && (
                <div className="text-xs text-muted-foreground">
                  <p>Multiple retry attempts failed.</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mt-2 w-full"
                  >
                    Refresh Page
                  </Button>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}