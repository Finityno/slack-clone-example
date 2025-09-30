# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start Next.js development server (http://localhost:3000)
- `npx convex dev` - Start Convex backend in development mode (required for database and auth)

### Build & Deploy
- `npm run build` - Build Next.js production bundle
- `npm start` - Run production server locally
- `npx convex deploy` - Deploy Convex backend to production

### Code Quality
- `npm run lint` - Run Biome linter to check code quality
- `npm run format` - Format code with Biome

## Architecture Overview

This is a Slack clone built with Next.js 15, Convex, and Better Auth. It demonstrates real-time messaging, channel management, and authentication best practices.

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Better Auth with Convex integration (`@convex-dev/better-auth`)
- **Styling**: Tailwind CSS v4 with lucide-react icons

### Features
- **Real-time Messaging**: Messages update instantly across all clients using Convex reactivity
- **Channel Management**: Create, list, and select channels with proper authorization
- **User Authentication**: Secure sign-in/sign-up with Better Auth
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **Input Validation**: Server-side validation for channels and messages
- **Auto-scroll**: Messages automatically scroll to bottom on new message

### Project Structure

```
app/
├── (auth)/              # Auth pages (signin, signup) - route group without auth protection
├── (protected)/         # Protected routes requiring authentication
│   ├── layout.tsx       # Checks auth status, redirects to signin if not authenticated
│   └── dashboard/       # Main Slack clone interface
├── api/auth/[...all]/   # Auth API route handler (Better Auth + Convex integration)
├── layout.tsx           # Root layout with ConvexClientProvider
└── ConvexClientProvider.tsx  # Wraps app with Convex + Better Auth providers

convex/
├── _generated/          # Auto-generated Convex types and API
├── auth.ts             # Better Auth configuration with Convex adapter
├── auth.config.ts      # Auth provider configuration
├── convex.config.ts    # Convex app configuration with Better Auth component
├── http.ts             # HTTP handlers for Convex
├── schema.ts           # Database schema (channels, messages)
├── channels.ts         # Channel CRUD operations
└── messages.ts         # Message operations with pagination

lib/
├── auth-client.ts      # Better Auth client for frontend (React hooks)
└── utils.ts            # Utility functions (e.g., cn for className merging)

components/
├── auth/               # Auth-related components
├── chat/               # Slack clone chat components
│   ├── chat-interface.tsx       # Main chat layout with sidebar and message area
│   ├── channel-list.tsx         # Channel sidebar with create button
│   ├── message-list.tsx         # Real-time message display with auto-scroll
│   ├── message-input.tsx        # Message composition with send button
│   └── create-channel-dialog.tsx # Modal for creating new channels
└── ui/                 # Reusable UI components
```

### Authentication System

The app uses Better Auth integrated with Convex:

1. **Auth Configuration**: `convex/auth.ts` creates the Better Auth instance with Convex database adapter
2. **Client Setup**: `lib/auth-client.ts` configures the Better Auth React client
3. **Provider Setup**: `app/ConvexClientProvider.tsx` wraps the app with both Convex and Better Auth providers
4. **API Routes**: `app/api/auth/[...all]/route.ts` handles all auth requests (signin, signup, etc.)
5. **Protected Routes**: Routes in `app/(protected)/` check authentication via `layout.tsx` which queries `api.auth.getCurrentUser`
6. **Convex Integration**: `authComponent` from `convex/auth.ts` provides `getAuthUser()` to access current user in Convex functions

### Convex Backend Patterns

This Slack clone demonstrates Convex best practices:

**Query with Index** (from `convex/channels.ts`):
```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("channels")
      .filter((q) => q.or(q.eq(q.field("isPrivate"), false), q.eq(q.field("isPrivate"), undefined)))
      .order("desc")
      .collect();
  },
});
```

**Authenticated Mutation with Validation** (from `convex/channels.ts`):
```typescript
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, description }) => {
    const user = await authComponent.getAuthUser(ctx as any);
    if (!user) {
      throw new Error("Unauthorized: Must be logged in to create a channel");
    }

    if (name.trim().length === 0 || name.length > 80) {
      throw new Error("Invalid channel name");
    }

    return await ctx.db.insert("channels", {
      name: name.trim(),
      description: description?.trim(),
      createdBy: user.userId,
      isPrivate: false,
    });
  },
});
```

**Paginated Query** (from `convex/messages.ts`):
```typescript
export const list = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { channelId, paginationOpts }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .order("desc")
      .paginate(paginationOpts);
  },
});
```

### Convex Best Practices Demonstrated

This codebase follows Convex best practices:

1. **Proper Indexing**: All queries use indexes for efficient data retrieval
   - `messages` table has `by_channelId` index for fast channel message lookups
   - Indexes automatically include `_creationTime` (don't add it explicitly)

2. **Avoid Unbounded Queries**: Use pagination or `.take()` to limit results
   - `messages.list` uses pagination for large message lists
   - `messages.getRecent` uses `.take(limit)` capped at 100

3. **Authentication & Authorization**: Always check user identity in mutations
   - Uses `authComponent.getAuthUser()` for authentication
   - Validates ownership before updates/deletes

4. **Argument Validation**: All functions use `v` validators for type safety
   - Required fields: `v.string()`, `v.id("tableName")`
   - Optional fields: `v.optional(v.string())`

5. **Proper Schema Design**:
   - Use `v.id("tableName")` for foreign keys (e.g., `channelId: v.id("channels")`)
   - Add indexes on frequently queried fields
   - Use search indexes for text search (`search_name` on channels)

6. **Error Handling**: Throw descriptive errors for better debugging
   - "Unauthorized: Must be logged in to..."
   - "Channel not found"
   - Validation errors with clear messages

### Important Configuration Details

- **Better Auth Base URL**: Auth client (`lib/auth-client.ts`) uses `window.location.origin` to ensure auth requests always go through Next.js API routes, not directly to Convex
- **Convex Component System**: Better Auth is registered as a Convex component in `convex/convex.config.ts` using `defineApp()` and `app.use(betterAuth)`
- **Auth Tables**: Better Auth tables are automatically created by the component registration (don't manually define in schema)
- **Type Safety**: Convex generates TypeScript types in `convex/_generated/` - import from `@/convex/_generated/api` for type-safe API calls
- **Index Creation**: Never explicitly add `_creationTime` to index definitions - Convex adds it automatically

### Development Workflow

1. Start both servers for full-stack development:
   - Terminal 1: `npm run dev` (Next.js)
   - Terminal 2: `npx convex dev` (Convex backend)

2. The Convex dev server must be running for:
   - Database queries/mutations
   - Authentication to work
   - Real-time updates

3. Environment variables required:
   - `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
   - `CONVEX_SITE_URL` - Site URL for Better Auth configuration
   - Additional vars in `.env.local`