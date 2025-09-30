"use client";

import { useMutation, useQuery } from "convex/react";
import { Hash, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ChannelListProps {
  selectedChannelId?: Id<"channels">;
  onChannelSelect: (channelId: Id<"channels">) => void;
  onCreateChannel: () => void;
  onChannelDeleted: (channelId: Id<"channels">) => void;
}

export function ChannelList({
  selectedChannelId,
  onChannelSelect,
  onCreateChannel,
  onChannelDeleted,
}: ChannelListProps) {
  const channels = useQuery(api.channels.list);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const deleteChannel = useMutation(api.channels.remove);
  const [deletingChannelId, setDeletingChannelId] =
    useState<Id<"channels"> | null>(null);

  const handleDeleteChannel = async (channelId: Id<"channels">) => {
    if (
      !confirm(
        "Are you sure you want to delete this channel? This will also delete all messages in the channel.",
      )
    ) {
      return;
    }

    try {
      setDeletingChannelId(channelId);
      await deleteChannel({ channelId });
      onChannelDeleted(channelId);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete channel",
      );
    } finally {
      setDeletingChannelId(null);
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Hash className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Channels</span>
                  <span className="truncate text-xs">
                    {channels?.length ?? 0} channels
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>All Channels</span>
            <button
              onClick={onCreateChannel}
              className="ml-auto p-1 rounded-md hover:bg-sidebar-accent transition-colors"
              title="Create Channel"
            >
              <Plus className="h-4 w-4" />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {channels === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No channels yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Create your first channel to get started
                </p>
                <button
                  onClick={onCreateChannel}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Channel
                </button>
              </div>
            ) : (
              <SidebarMenu>
                {channels.map((channel) => {
                  const isCreator = currentUser?.userId === channel.createdBy;
                  const isDeleting = deletingChannelId === channel._id;

                  return (
                    <SidebarMenuItem key={channel._id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            isActive={selectedChannelId === channel._id}
                            onClick={() => onChannelSelect(channel._id)}
                          >
                            <button className="w-full">
                              <Hash className="h-4 w-4" />
                              <span className="truncate">{channel.name}</span>
                            </button>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">#{channel.name}</p>
                            {channel.description && (
                              <p className="text-xs opacity-90">
                                {channel.description}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {isCreator && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              className="data-[state=open]:opacity-100"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                              <span className="sr-only">More</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            className="w-48"
                          >
                            <DropdownMenuItem
                              onClick={() => handleDeleteChannel(channel._id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span>Delete Channel</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
