import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = { fallback: ReactNode; children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

/** Catches render errors below it and shows `fallback` instead of a blank page. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
