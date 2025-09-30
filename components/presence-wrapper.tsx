"use client";

import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { PresenceIndicator } from "./presence-indicator";
import { PresenceErrorBoundary } from "./presence-error-boundary";

interface PresenceWrapperProps {
  userId: string;
  userName: string;
  roomId?: string;
}

export function PresenceWrapper({ userId, userName, roomId }: PresenceWrapperProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only render presence after auth is stable and confirmed
    if (isAuthenticated && !isLoading) {
      // Add a small delay to ensure auth is fully settled
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Immediately stop rendering when auth changes
      setShouldRender(false);
    }
  }, [isAuthenticated, isLoading]);

  // Don't render the component with hooks at all if not authenticated
  if (!shouldRender || !isAuthenticated || isLoading) {
    return null;
  }

  return (
    <PresenceErrorBoundary key={`${userId}-${roomId}`}>
      <PresenceIndicator userId={userId} userName={userName} roomId={roomId} />
    </PresenceErrorBoundary>
  );
}
