"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** When this value changes while in the error state, reset automatically
   *  (e.g. pass the current pathname so navigation recovers without a reload). */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#111214] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-[#18191c]">
              <span className="text-xl text-[#FFC341]">!</span>
            </div>
            <h1 className="text-lg font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#72767d]">
              Please try again. If this keeps happening, reload the page.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}