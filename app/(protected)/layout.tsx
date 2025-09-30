"use client";

import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  // IMPORTANT: Only redirect after loading is complete
  // Don't redirect while still loading to prevent iframe issues
  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) {
      console.log("[ProtectedLayout] Loading user...");
      return;
    }

    // Only redirect if we've confirmed user is not authenticated
    if (!isAuthenticated) {
      console.log("[ProtectedLayout] Not authenticated, redirecting to signin");
      router.push("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null; // Redirecting
  }

  // User is authenticated, render children
  return <>{children}</>;
}
