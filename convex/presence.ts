import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    // Check authentication - silently fail if not authenticated
    let user;
    try {
      user = await authComponent.getAuthUser(ctx as any);
    } catch {
      return null;
    }

    if (!user) return null;

    // Use the authenticated user's ID for security
    return await presence.heartbeat(ctx, roomId, user._id, sessionId, interval);
  },
});

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    // Avoid adding per-user reads so all subscriptions can share same cache.
    return await presence.list(ctx, roomToken);
  },
});

export const updateRoomUser = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    data: v.object({ userName: v.string() })
  },
  handler: async (ctx, { roomId, userId, data }) => {
    // Check authentication - silently fail if not authenticated
    let user;
    try {
      user = await authComponent.getAuthUser(ctx as any);
    } catch {
      return null;
    }

    if (!user) return null;

    // Verify the user is updating their own data
    if (user._id !== userId) {
      throw new Error("Unauthorized: Cannot update another user's presence");
    }

    return await presence.updateRoomUser(ctx, roomId, userId, data);
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Can't check auth here because it's called over http from sendBeacon.
    return await presence.disconnect(ctx, sessionToken);
  },
});
