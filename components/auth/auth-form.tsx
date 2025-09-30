"use client";

import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 48 48"
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z"
    />
  </svg>
);

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-all duration-200 focus-within:border-violet-400/70 focus-within:bg-violet-500/5">
    {children}
  </div>
);

interface AuthFormProps {
  mode?: "signin" | "signup";
  redirectTo?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  mode: initialMode = "signin",
  redirectTo = "/dashboard",
}) => {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    username: "",
    rememberMe: false,
  });

  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        if (!formData.name.trim()) {
          throw new Error("Name is required");
        }
        if (!formData.username.trim()) {
          throw new Error("Username is required");
        }

        await authClient.signUp.email(
          {
            email: formData.email,
            password: formData.password,
            name: formData.name.trim(),
            username: formData.username.trim(),
          } as any,
          {
            onSuccess: () => {
              // Navigate on successful signup
              router.push(redirectTo);
            },
            onError: (ctx) => {
              console.log("Signup error:", ctx.error);
              const errorMessage = (ctx.error?.message || ctx.error || "Signup failed").toString().toLowerCase();

              // Convert technical error messages to user-friendly ones
              if (errorMessage.includes("username") && errorMessage.includes("already exists")) {
                setError("Username is already taken. Please choose another.");
              } else if (errorMessage.includes("email") && errorMessage.includes("already exists")) {
                setError("Email is already registered. Please sign in instead.");
              } else if (errorMessage.includes("failed to create user")) {
                setError("Failed to create account. Username or email may already be in use.");
              } else {
                setError(ctx.error?.message || "Signup failed. Please try again.");
              }
              setIsLoading(false);
            },
          },
        );
      } else {
        await authClient.signIn.email(
          {
            email: formData.email,
            password: formData.password,
            rememberMe: formData.rememberMe,
          },
          {
            onSuccess: () => {
              // Navigate on successful signin
              router.push(redirectTo);
            },
            onError: (ctx) => {
              setError(ctx.error.message || "Sign in failed");
              setIsLoading(false);
            },
          },
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
    setFormData((prev) => ({ ...prev, name: "", username: "" }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-semibold mb-2">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue to your account"
              : "Start your journey with us today"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <>
              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  Full Name
                </label>
                <GlassInputWrapper>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                    disabled={isLoading}
                    required
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  Username
                </label>
                <GlassInputWrapper>
                  <input
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a unique username"
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                    disabled={isLoading}
                    required
                  />
                </GlassInputWrapper>
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4" />
              Email Address
            </label>
            <GlassInputWrapper>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                required
                disabled={isLoading}
              />
            </GlassInputWrapper>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" />
              Password
            </label>
            <GlassInputWrapper>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={
                    mode === "signup"
                      ? "Create a strong password"
                      : "Enter your password"
                  }
                  className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  )}
                </button>
              </div>
            </GlassInputWrapper>
          </div>

          {mode === "signin" && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                  disabled={isLoading}
                />
                <span className="text-foreground/90">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => router.push("/auth/reset-password")}
                className="hover:underline text-violet-500 transition-colors"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-violet-600 py-4 font-medium text-white hover:bg-violet-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === "signin" ? "Signing in..." : "Creating account..."}
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <span className="w-full border-t border-border"></span>
          <span className="px-4 text-sm text-muted-foreground bg-background absolute">
            Or continue with
          </span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              New to our platform?{" "}
              <button
                onClick={toggleMode}
                className="text-violet-500 hover:underline transition-colors font-medium"
                disabled={isLoading}
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-violet-500 hover:underline transition-colors font-medium"
                disabled={isLoading}
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
