"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class PresenceErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-auth related errors
    if (
      !error.message?.includes("roomToken") &&
      !error.message?.includes("Unauthenticated")
    ) {
      console.error("Presence error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Silently fail - don't show anything when presence errors occur
      return null;
    }

    return this.props.children;
  }
}
