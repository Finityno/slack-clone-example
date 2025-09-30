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
    // Auth check - ensure user is authenticated
    const user = await authComponent.getAuthUser(ctx as any);
    if (!user) {
      throw new Error("Unauthorized: Must be logged in");
    }
    // Use the authenticated user's ID instead of the passed userId for security
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
    // Auth check - ensure user is authenticated
    const user = await authComponent.getAuthUser(ctx as any);
    if (!user || user._id !== userId) {
      throw new Error("Unauthorized");
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
