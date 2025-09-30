"use client";

import { Hash, MessageSquare } from "lucide-react";
import NotificationMenu from "@/components/navbar-components/notification-menu";
import UserMenu from "@/components/navbar-components/user-menu";
import { PresenceWrapper } from "@/components/presence-wrapper";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface NavbarProps {
  currentChannel?: {
    name: string;
    description?: string;
  };
  user?: {
    email: string;
    name?: string | null;
    userId: string;
  };
  onSignOut: () => void;
}

export default function Navbar({
  currentChannel,
  user,
  onSignOut,
}: NavbarProps) {
  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        {/* Left side */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <SidebarTrigger className="flex-shrink-0" />

          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="hidden sm:flex">
                <MessageSquare className="h-4 w-4" />
                <span className="ml-2">Slack Clone</span>
              </BreadcrumbItem>
              {currentChannel && (
                <>
                  <BreadcrumbSeparator className="hidden sm:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{currentChannel.name}</span>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right side */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          {user && (
            <PresenceWrapper
              userId={user.userId}
              userName={user.name || user.email.split("@")[0]}
              roomId={currentChannel?.name || "global"}
            />
          )}
          <NotificationMenu />
          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
