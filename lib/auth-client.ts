import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// For auth, always use the current origin (localhost in dev, production URL in prod)
// This ensures auth requests go through Next.js, not directly to Convex
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient()],
});
