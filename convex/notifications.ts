import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent, getAuthenticatedUser } from "./auth";

// Get all notifications for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .order("desc")
      .take(50);

    // Enrich notifications with username from Better Auth and clean message text
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const authUser = await authComponent.getAnyUserById(ctx, notification.fromUserId);
        const username = authUser ? (authUser as any).username || null : null;

        // Remove userId from mentions in message preview
        // Convert @[userName](userId) to just @userName
        const cleanedMessageText = notification.messageText.replace(
          /@\[([^\]]+)\]\([a-zA-Z0-9_-]+\)/g,
          "@$1",
        );

        return {
          ...notification,
          fromUsername: username,
          messageText: cleanedMessageText,
        };
      }),
    );

    return enrichedNotifications;
  },
});

// Get unread count
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", user.userId).eq("read", false),
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const user = await getAuthenticatedUser(ctx);

    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(notificationId, { read: true });
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", user.userId).eq("read", false),
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true }),
      ),
    );
  },
});

// Create notification (internal use)
export const create = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    messageId: v.id("messages"),
    channelId: v.id("channels"),
    channelName: v.string(),
    fromUserId: v.string(),
    fromUserName: v.string(),
    messageText: v.string(),
  },
  handler: async (ctx, args) => {
    // Don't create notification if user is mentioning themselves
    if (args.userId === args.fromUserId) {
      return;
    }

    await ctx.db.insert("notifications", {
      ...args,
      read: false,
    });
  },
});
