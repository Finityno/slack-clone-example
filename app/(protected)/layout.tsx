"use client";

import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect once loading is complete and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log("[ProtectedLayout] Not authenticated, redirecting to signin");
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/signin?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Show loading state while checking auth
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

  // Don't render protected content while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
