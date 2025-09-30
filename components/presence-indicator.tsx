"use client";

import { useEffect, useState } from "react";
import usePresence from "@convex-dev/presence/react";
import { useMutation } from "convex/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";

interface PresenceIndicatorProps {
  userId: string;
  userName: string;
  roomId?: string;
}

interface CachedPresenceState {
  userId: string;
  updated: number;
  data?: { userName?: string };
  online: boolean;
  lastDisconnected?: number;
}

export function PresenceIndicator({
  userId,
  userName,
  roomId = "global",
}: PresenceIndicatorProps) {
  const presenceState = usePresence(api.presence, roomId, userId, 10000);
  const updateRoomUser = useMutation(api.presence.updateRoomUser);

  // Load cached state from localStorage
  const [cachedState, setCachedState] = useState<CachedPresenceState[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(`presence-${roomId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Update presence data with userName when it changes
  useEffect(() => {
    if (userName) {
      updateRoomUser({
        roomId,
        userId,
        data: { userName },
      }).catch((err) => console.error("Failed to update presence:", err));
    }
  }, [userName, roomId, userId, updateRoomUser]);

  // Cache presence state to localStorage when it updates
  useEffect(() => {
    if (presenceState && presenceState.length > 0) {
      try {
        const stateToCache = presenceState.map((user: any) => ({
          userId: user.userId,
          updated: user.updated,
          data: user.data,
          online: user.online,
          lastDisconnected: user.lastDisconnected,
        }));
        localStorage.setItem(`presence-${roomId}`, JSON.stringify(stateToCache));
        setCachedState(stateToCache);
      } catch (err) {
        console.error("Failed to cache presence:", err);
      }
    }
  }, [presenceState, roomId]);

  // Use cached state if presenceState is not yet loaded
  const displayState = presenceState || cachedState;

  // Don't render until we have data to prevent flashing
  if (!displayState) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center -space-x-2">
          <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {userName?.slice(0, 2)?.toUpperCase() || "ME"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    );
  }

  // Filter out current user and extract other users
  const otherUsers = displayState.filter((user: any) => user.userId !== userId);

  // Create combined list with current user first
  const allUsers = [
    {
      userId,
      userName,
      updated: Date.now(),
      isSelf: true,
      online: true,
      lastDisconnected: undefined,
    },
    ...otherUsers.map((user: any) => ({
      userId: user.userId,
      userName: user.data?.userName || user.userId,
      updated: user.updated,
      isSelf: false,
      online: user.online,
      lastDisconnected: user.lastDisconnected,
    })),
  ];

  const totalOnline = allUsers.length;
  const maxVisibleAvatars = 3;
  const visibleUsers = allUsers.slice(0, maxVisibleAvatars);
  const remainingCount = Math.max(0, totalOnline - maxVisibleAvatars);

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "for 1 minute";
    if (minutes < 60) return `for ${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "for 1 hour";
    if (hours < 24) return `for ${hours} hours`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "for 1 day";
    return `for ${days} days`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer">
          {/* Avatar Stack */}
          <div className="flex items-center -space-x-2">
            {visibleUsers.map((user) => {
              // Use the online property from presence state (true for self and online users)
              const isActive = user.isSelf || user.online;

              return (
                <div key={user.userId} className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border">
                    <AvatarFallback
                      className={`text-xs ${
                        user.isSelf
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {getInitials(user.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -end-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background ${
                      isActive ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  >
                    <span className="sr-only">
                      {isActive ? "Online" : "Offline"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Remaining Count Button */}
          {remainingCount > 0 && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:bg-secondary hover:text-foreground ring-1 ring-border"
            >
              +{remainingCount}
            </Button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Online Users</h4>
            <span className="text-xs text-muted-foreground">
              {totalOnline} {totalOnline === 1 ? "user" : "users"}
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {allUsers.map((user) => {
              // Use the online property from presence state
              const isActive = user.isSelf || user.online;

              return (
                <div
                  key={user.userId}
                  className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors ${
                    user.isSelf ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={`text-xs ${
                          user.isSelf
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {getInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background ${
                        isActive ? "bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.userName}
                      {user.isSelf && " (You)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isActive
                        ? "Active now"
                        : user.lastDisconnected
                          ? `Away ${getTimeAgo(user.lastDisconnected)}`
                          : "Offline"}
                    </p>
                  </div>
                </div>
              );
            })}

            {allUsers.length === 1 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No other users online
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
