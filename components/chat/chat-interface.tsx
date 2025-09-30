"use client";

import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { getSidebarStateFromCookie } from "@/lib/sidebar-utils";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

export function ChatInterface() {
  const [selectedChannelId, setSelectedChannelId] = useState<
    Id<"channels"> | undefined
  >();
  const [highlightMessageId, setHighlightMessageId] = useState<
    Id<"messages"> | undefined
  >();
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [sidebarDefaultOpen] = useState(() => getSidebarStateFromCookie());
  const router = useRouter();
  const searchParams = useSearchParams();

  const channels = useQuery(api.channels.list);
  const selectedChannel = useQuery(
    api.channels.get,
    selectedChannelId ? { channelId: selectedChannelId } : "skip",
  );
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Handle URL params for direct navigation from notifications
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    const messageParam = searchParams.get("message");

    if (channelParam) {
      setSelectedChannelId(channelParam as Id<"channels">);
    }

    if (messageParam) {
      setHighlightMessageId(messageParam as Id<"messages">);
    }
  }, [searchParams]);

  // Auto-select first channel when channels load
  if (channels && channels.length > 0 && !selectedChannelId) {
    setSelectedChannelId(channels[0]._id);
  }

  const handleChannelCreated = () => {
    // The channel list will automatically update via Convex reactivity
  };

  const handleChannelDeleted = (deletedChannelId: Id<"channels">) => {
    // If the deleted channel was selected, clear selection
    if (selectedChannelId === deletedChannelId) {
      setSelectedChannelId(undefined);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push("/signin");
    router.refresh();
  };

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen} className="h-screen">
      <ChannelList
        selectedChannelId={selectedChannelId}
        onChannelSelect={setSelectedChannelId}
        onCreateChannel={() => setIsCreateChannelOpen(true)}
        onChannelDeleted={handleChannelDeleted}
      />
      <SidebarInset className="flex flex-col overflow-hidden">
        {/* Navbar */}
        <div className="flex-shrink-0">
          <Navbar
            currentChannel={selectedChannel || undefined}
            user={
              currentUser
                ? {
                    email: currentUser.email,
                    name: currentUser.name,
                    userId: currentUser.userId,
                  }
                : undefined
            }
            onSignOut={handleSignOut}
          />
        </div>

        {/* Messages + Input */}
        {selectedChannelId ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageList
                channelId={selectedChannelId}
                highlightMessageId={highlightMessageId}
                onMessageHighlighted={() => setHighlightMessageId(undefined)}
              />
            </div>
            <div className="flex-shrink-0 border-t">
              <MessageInput channelId={selectedChannelId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            {channels === undefined ? (
              <p>Loading channels...</p>
            ) : channels.length === 0 ? (
              <div className="text-center">
                <p className="mb-4">No channels yet.</p>
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Your First Channel
                </button>
              </div>
            ) : (
              <p>Select a channel from the sidebar</p>
            )}
          </div>
        )}
      </SidebarInset>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onChannelCreated={handleChannelCreated}
      />
    </SidebarProvider>
  );
}
