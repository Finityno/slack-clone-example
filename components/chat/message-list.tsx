"use client";

import { useQuery } from "convex/react";
import { File, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/src/components/ai-elements/message";

interface MessageListProps {
  channelId: Id<"channels">;
  highlightMessageId?: Id<"messages">;
  onMessageHighlighted?: () => void;
}

function MessageAttachment({
  storageId,
  fileType,
  fileName,
}: {
  storageId: Id<"_storage">;
  fileType?: string;
  fileName?: string;
}) {
  const fileUrl = useQuery(api.messages.getFileUrl, { storageId });

  if (!fileUrl) {
    return (
      <div className="p-2 border rounded-lg bg-muted flex items-center gap-2 max-w-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading attachment...
        </span>
      </div>
    );
  }

  // Check if it's an image
  const isImage = fileType?.startsWith("image/");

  if (isImage) {
    return (
      <div className="flex flex-col gap-1">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={fileUrl}
            alt={fileName || "Image attachment"}
            className="max-w-md max-h-96 rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
          />
        </a>
        {fileName && (
          <p className="text-xs text-muted-foreground px-1">{fileName}</p>
        )}
      </div>
    );
  }

  // For non-image files, show a download link
  return (
    <div className="p-3 border rounded-lg bg-muted flex items-center gap-3 hover:bg-muted/80 transition-colors max-w-xs">
      <File className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:underline truncate block"
        >
          {fileName || "Attachment"}
        </a>
        {fileType && (
          <p className="text-xs text-muted-foreground">{fileType}</p>
        )}
      </div>
    </div>
  );
}

export function MessageList({
  channelId,
  highlightMessageId,
  onMessageHighlighted,
}: MessageListProps) {
  const messages = useQuery(api.messages.getRecent, {
    channelId,
    limit: 50,
  });
  const currentUser = useQuery(api.auth.getCurrentUser);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to and highlight message when highlightMessageId changes
  useEffect(() => {
    if (highlightMessageId && messages) {
      const messageElement = messageRefs.current.get(highlightMessageId);
      if (messageElement) {
        // Small delay to ensure the channel has loaded
        setTimeout(() => {
          // Scroll to the message
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);

        // Remove highlight after some time
        const timeout = setTimeout(() => {
          onMessageHighlighted?.();
        }, 3000);

        return () => clearTimeout(timeout);
      }
    }
  }, [highlightMessageId, messages, onMessageHighlighted]);

  if (messages === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<MessageSquare className="size-12" />}
            title="No messages yet"
            description="Be the first to say something!"
          />
        ) : (
          messages.map((message) => {
            const isCurrentUser = currentUser?.userId === message.userId;
            const isHighlighted = highlightMessageId === message._id;
            return (
              <div
                key={message._id}
                ref={(el) => {
                  if (el) {
                    messageRefs.current.set(message._id, el);
                  } else {
                    messageRefs.current.delete(message._id);
                  }
                }}
                className={`flex flex-col gap-2 transition-all duration-300 ${
                  isHighlighted
                    ? "bg-primary/20 ring-2 ring-primary/50 rounded-lg p-2 animate-pulse"
                    : ""
                }`}
              >
                <Message from={isCurrentUser ? "user" : "assistant"}>
                  <MessageAvatar
                    src=""
                    name={message.userName || "Unknown User"}
                  />
                  <MessageContent variant="flat">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold">
                        {message.userName || "Unknown User"}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(message._creationTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                    {message.text && (
                      <p className="break-words whitespace-pre-wrap">
                        {(() => {
                          const parts: React.ReactNode[] = [];
                          let lastIndex = 0;
                          const mentionRegex = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;
                          let match;

                          while ((match = mentionRegex.exec(message.text)) !== null) {
                            // Add text before the mention
                            if (match.index > lastIndex) {
                              parts.push(
                                message.text.substring(lastIndex, match.index)
                              );
                            }

                            // Add the mention
                            const userName = match[1];
                            const userId = match[2];
                            const isSelfMention = currentUser?.userId === userId;

                            parts.push(
                              <span
                                key={match.index}
                                className={`font-semibold ${
                                  isSelfMention
                                    ? "bg-primary/20 text-primary px-1 rounded"
                                    : "text-primary"
                                }`}
                              >
                                @{userName}
                              </span>
                            );

                            lastIndex = match.index + match[0].length;
                          }

                          // Add remaining text after last mention
                          if (lastIndex < message.text.length) {
                            parts.push(message.text.substring(lastIndex));
                          }

                          return parts;
                        })()}
                      </p>
                    )}
                  </MessageContent>
                </Message>

                {/* Display attachment below the message */}
                {message.storageId && (
                  <div
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} px-12`}
                  >
                    <MessageAttachment
                      storageId={message.storageId}
                      fileType={message.fileType}
                      fileName={message.fileName}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
