"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SignInPageEnhanced } from "@/components/ui/sign-in-enhanced";

function SignUpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [isMounted, setIsMounted] = useState(false);
  const returnUrl = searchParams.get("returnUrl");

  // Decode and validate the return URL
  const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : "/dashboard";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // If already authenticated, redirect to the return URL or dashboard
    if (isMounted && !isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isMounted, isLoading, isAuthenticated, router, redirectTo]);

  // Wait for client-side mount to avoid hydration mismatch
  if (!isMounted) {
    return <SignInPageEnhanced mode="signup" redirectTo={redirectTo} />;
  }

  // If authenticated, redirect (don't show form)
  if (isAuthenticated) {
    return null;
  }

  return <SignInPageEnhanced mode="signup" redirectTo={redirectTo} />;
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
