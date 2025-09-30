"use client";

import { useMutation, useQuery } from "convex/react";
import { BellIcon, Hash } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

export default function NotificationMenu() {
  const notifications = useQuery(api.notifications.list) ?? [];
  const unreadCount = useQuery(api.notifications.unreadCount) ?? 0;
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (
    notificationId: Id<"notifications">,
    channelId: Id<"channels">,
    messageId: Id<"messages">,
  ) => {
    await markAsRead({ notificationId });

    // Navigate to the channel with the message highlighted
    const params = new URLSearchParams(searchParams.toString());
    params.set("channel", channelId);
    params.set("message", messageId);
    router.push(`/dashboard?${params.toString()}`);
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground relative size-8 rounded-full shadow-none"
          aria-label="Open notifications"
        >
          <BellIcon size={16} aria-hidden="true" />
          {unreadCount > 0 && (
            <div
              aria-hidden="true"
              className="bg-primary absolute top-0.5 right-0.5 size-2 rounded-full"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium hover:underline"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="bg-border -mx-1 my-1 h-px"
        />

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className="hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors"
              >
                <div className="relative flex items-start pe-3">
                  <div className="flex-1 space-y-1">
                    <button
                      className="text-foreground/80 text-left after:absolute after:inset-0"
                      onClick={() =>
                        handleNotificationClick(
                          notification._id,
                          notification.channelId,
                          notification.messageId,
                        )
                      }
                    >
                      <span className="text-foreground font-medium hover:underline">
                        {(notification as any).fromUsername
                          ? `@${(notification as any).fromUsername}`
                          : notification.fromUserName}
                      </span>{" "}
                      mentioned you in{" "}
                      <span className="text-foreground font-medium hover:underline inline-flex items-center gap-1">
                        <Hash className="h-3 w-3 inline" />
                        {notification.channelName}
                      </span>
                    </button>
                    <div className="text-muted-foreground text-xs line-clamp-2">
                      {notification.messageText}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {getTimeAgo(notification._creationTime)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute end-0 self-center">
                      <span className="sr-only">Unread</span>
                      <Dot />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
