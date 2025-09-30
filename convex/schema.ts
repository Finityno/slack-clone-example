import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // userId from Better Auth
    isPrivate: v.optional(v.boolean()),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_isPrivate", ["isPrivate"])
    .searchIndex("search_name", {
      searchField: "name",
    }),

  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.string(), // userId from Better Auth
    userName: v.optional(v.string()), // Cache user name for display
    text: v.string(),
    // File attachments
    storageId: v.optional(v.id("_storage")),
    fileType: v.optional(v.string()), // MIME type
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    // Mentions
    mentions: v.optional(v.array(v.string())), // Array of mentioned userIds
  })
    .index("by_channelId", ["channelId"])
    .index("by_userId", ["userId"]),

  notifications: defineTable({
    userId: v.string(), // User who receives the notification
    type: v.string(), // "mention", "reply", etc.
    messageId: v.id("messages"),
    channelId: v.id("channels"),
    channelName: v.string(),
    fromUserId: v.string(),
    fromUserName: v.string(),
    messageText: v.string(), // Preview of the message
    read: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),

  // Better Auth tables are automatically created by the component
  // when you register it in convex.config.ts
});
