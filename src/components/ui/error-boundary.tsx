'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.withScope((scope) => {
      if (this.props.label) scope.setTag('boundary', this.props.label);
      scope.setExtra('componentStack', info.componentStack);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <p className="text-trello-danger font-semibold mb-1">Something went wrong</p>
            <p className="text-xs text-trello-textSubtle mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="btn-soft text-sm px-4 py-2"
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
