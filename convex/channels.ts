import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./auth";

// Get all public channels
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.string(),
      isPrivate: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_isPrivate", (q) => q.eq("isPrivate", false))
      .order("desc")
      .take(100);

    return channels;
  },
});

// Get a single channel by ID
export const get = query({
  args: { channelId: v.id("channels") },
  returns: v.union(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.string(),
      isPrivate: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, { channelId }) => {
    const channel = await ctx.db.get(channelId);
    return channel;
  },
});

// Create a new channel (authenticated)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: v.id("channels"),
  handler: async (ctx, { name, description, isPrivate }) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Validate channel name
    if (name.trim().length === 0) {
      throw new Error("Channel name cannot be empty");
    }

    if (name.length > 80) {
      throw new Error("Channel name must be 80 characters or less");
    }

    // Create the channel
    const channelId = await ctx.db.insert("channels", {
      name: name.trim(),
      description: description?.trim(),
      createdBy: user.userId,
      isPrivate: isPrivate || false,
    });

    return channelId;
  },
});

// Update a channel (only creator can update)
export const update = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("channels"),
  handler: async (ctx, { channelId, name, description }) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Get the channel
    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is the creator
    if (channel.createdBy !== user.userId) {
      throw new Error("Unauthorized: Only the channel creator can update it");
    }

    // Validate updates
    const updates: any = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        throw new Error("Channel name cannot be empty");
      }
      if (name.length > 80) {
        throw new Error("Channel name must be 80 characters or less");
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    // Update the channel
    await ctx.db.patch(channelId, updates);

    return channelId;
  },
});

// Delete a channel (only creator can delete)
export const remove = mutation({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.id("channels"),
  handler: async (ctx, { channelId }) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(ctx);

    // Get the channel
    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is the creator
    if (channel.createdBy !== user.userId) {
      throw new Error("Unauthorized: Only the channel creator can delete it");
    }

    // Delete all messages in the channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the channel
    await ctx.db.delete(channelId);

    return channelId;
  },
});
