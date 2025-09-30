import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// Get all users who have sent messages in a channel (for @mention autocomplete)
export const listInChannel = query({
  args: { channelId: v.id("channels") },
  returns: v.array(
    v.object({
      userId: v.string(),
      userName: v.string(),
      username: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { channelId }) => {
    // Get unique users from messages in this channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();

    // Create a map to deduplicate users
    const usersMap = new Map<
      string,
      { userId: string; userName: string; username: string | null }
    >();

    for (const message of messages) {
      if (!usersMap.has(message.userId)) {
        // Try to get user from Better Auth to get username
        const authUser = await authComponent.getAnyUserById(ctx, message.userId);
        const username = authUser ? (authUser as any).username || null : null;

        usersMap.set(message.userId, {
          userId: message.userId,
          userName: message.userName || "Unknown User",
          username: username,
        });
      }
    }

    return Array.from(usersMap.values());
  },
});

// Search users by name for autocomplete
export const searchByName = query({
  args: {
    channelId: v.id("channels"),
    query: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      userName: v.string(),
      username: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { channelId, query }) => {
    const users = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();

    // Deduplicate and filter users
    const usersMap = new Map<
      string,
      { userId: string; userName: string; username: string | null }
    >();

    for (const message of users) {
      const userName = message.userName || "Unknown User";
      if (
        !usersMap.has(message.userId) &&
        userName.toLowerCase().includes(query.toLowerCase())
      ) {
        // Try to get user from Better Auth to get username
        const authUser = await authComponent.getAnyUserById(ctx, message.userId);
        const username = authUser ? (authUser as any).username || null : null;

        usersMap.set(message.userId, {
          userId: message.userId,
          userName,
          username: username,
        });
      }
    }

    return Array.from(usersMap.values()).slice(0, 10);
  },
});
