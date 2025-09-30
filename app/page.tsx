"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4">
          Convex + Better Auth Template
        </h1>
        <p className="text-gray-600 mb-8">
          A minimal authentication template with Convex and Better Auth
        </p>

        {user === undefined ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <p className="text-green-600 mb-4">
              ✓ You are signed in as {user.email}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => router.push("/signin")}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
