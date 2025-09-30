import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { type MutationCtx, type QueryCtx, query } from "./_generated/server";

const siteUrl = process.env.SITE_URL || "http://localhost:3001";

export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false, // Enable verbose logging to debug auth issues
});

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: true,
    },
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    anonymous: {
      enabled: process.env.NODE_ENV !== "production",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
          defaultValue: "",
        },
      },
    },
    plugins: [convex()],
  });
};

// Helper function to get authenticated user in queries and mutations
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ userId: string; email: string; name: string | null; username: string | null }> {
  const user = await authComponent.getAuthUser(ctx as any);
  if (!user || !user._id) {
    throw new Error("Unauthorized: Must be logged in");
  }
  return {
    userId: user._id, // Better Auth Convex component uses _id as the user ID
    email: user.email || "",
    name: user.name || null,
    username: (user as any).username || null,
  };
}

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.string(),
      name: v.union(v.string(), v.null()),
      username: v.union(v.string(), v.null()),
      emailVerified: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx as any);
      if (!user) return null;

      // Map _id to userId for consistency with the rest of the app
      return {
        userId: user._id,
        email: user.email,
        name: user.name,
        username: (user as any).username || null,
        emailVerified: user.emailVerified,
      };
    } catch (_error) {
      // Return null when user is not authenticated
      return null;
    }
  },
});
