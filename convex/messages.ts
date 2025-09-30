import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./auth";

// Get messages for a channel with pagination
export const list = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("messages"),
        _creationTime: v.number(),
        channelId: v.id("channels"),
        userId: v.string(),
        userName: v.optional(v.string()),
        text: v.string(),
        storageId: v.optional(v.id("_storage")),
        fileType: v.optional(v.string()),
        fileName: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        mentions: v.optional(v.array(v.string())),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { channelId, paginationOpts }) => {
    // Verify channel exists
    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Get messages with pagination, ordered by creation time (newest first for initial load)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .order("desc")
      .paginate(paginationOpts);

    return messages;
  },
});

// Get recent messages for a channel (without pagination)
export const getRecent = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      userId: v.string(),
      userName: v.optional(v.string()),
      text: v.string(),
      storageId: v.optional(v.id("_storage")),
      fileType: v.optional(v.string()),
      fileName: v.optional(v.string()),
      fileSize: v.optional(v.number()),
      mentions: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, { channelId, limit = 50 }) => {
    // Verify channel exists
    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Get recent messages, limited to prevent unbounded queries
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .order("desc")
      .take(Math.min(limit, 100)); // Cap at 100 messages max

    // Return in chronological order (oldest first)
    return messages.reverse();
  },
});

// Generate an upload URL for file attachments
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Get authenticated user
    await getAuthenticatedUser(ctx);

    // Generate and return upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// Send a message to a channel (authenticated)
export const send = mutation({
  args: {
    channelId: v.id("channels"),
    text: v.string(),
    // Optional file attachment
    storageId: v.optional(v.id("_storage")),
    fileType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  returns: v.id("messages"),
  handler: async (
    ctx,
    { channelId, text, storageId, fileType, fileName, fileSize },
  ) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Verify channel exists
    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Validate message text
    if (text.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (text.length > 5000) {
      throw new Error("Message must be 5000 characters or less");
    }

    // Extract mentions from text (format: @[userName](userId))
    const mentionRegex = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // match[1] is userName, match[2] is userId
      mentions.push(match[2]); // Store userId for notifications
    }

    // Get user name from Better Auth user object
    const userName = user.name || user.email || "Unknown User";

    // Insert the message with optional file attachment
    const messageId = await ctx.db.insert("messages", {
      channelId,
      userId: user.userId,
      userName,
      text: text.trim(),
      storageId,
      fileType,
      fileName,
      fileSize,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      const messagePreview = text.trim().slice(0, 100);
      for (const mentionedUserId of mentions) {
        // Skip self-mentions
        if (mentionedUserId !== user.userId) {
          await ctx.scheduler.runAfter(0, internal.notifications.create, {
            userId: mentionedUserId,
            type: "mention",
            messageId,
            channelId,
            channelName: channel.name,
            fromUserId: user.userId,
            fromUserName: userName,
            messageText: messagePreview,
          });
        }
      }
    }

    return messageId;
  },
});

// Update a message (only author can update)
export const update = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { messageId, text }) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Get the message
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author
    if (message.userId !== user.userId) {
      throw new Error("Unauthorized: Only the message author can update it");
    }

    // Validate message text
    if (text.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (text.length > 5000) {
      throw new Error("Message must be 5000 characters or less");
    }

    // Update the message
    await ctx.db.patch(messageId, {
      text: text.trim(),
    });

    return messageId;
  },
});

// Delete a message (only author can delete)
export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.id("messages"),
  handler: async (ctx, { messageId }) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Get the message
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author
    if (message.userId !== user.userId) {
      throw new Error("Unauthorized: Only the message author can delete it");
    }

    // Delete the message
    await ctx.db.delete(messageId);

    return messageId;
  },
});

// Get file URL for a storage ID
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
