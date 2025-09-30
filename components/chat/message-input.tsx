"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

interface MessageInputProps {
  channelId: Id<"channels">;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [text, setText] = useState("");
  const [displayText, setDisplayText] = useState(""); // Display version with @userName only
  const [mentions, setMentions] = useState<Map<string, string>>(new Map()); // userName -> userId mapping
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Get users in channel for mentions
  const allUsers = useQuery(api.users.listInChannel, { channelId }) ?? [];

  // Filter users based on mention query
  const mentionSuggestions = mentionQuery
    ? allUsers
        .filter((user) =>
          user.userName.toLowerCase().includes(mentionQuery.toLowerCase()),
        )
        .slice(0, 5)
    : allUsers.slice(0, 5);

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
    (localStore, args) => {
      const { channelId: msgChannelId, text: msgText } = args;

      // Get the current messages for this channel
      const existingMessages = localStore.getQuery(api.messages.getRecent, {
        channelId: msgChannelId,
        limit: 50,
      });

      // Only apply optimistic update if we have loaded messages
      if (existingMessages !== undefined && currentUser) {
        const now = Date.now();
        const optimisticMessage = {
          _id: crypto.randomUUID() as Id<"messages">,
          _creationTime: now,
          channelId: msgChannelId,
          userId: currentUser.userId,
          userName: currentUser.name || currentUser.email || "You",
          text: msgText,
          storageId: args.storageId,
          fileType: args.fileType,
          fileName: args.fileName,
          fileSize: args.fileSize,
        };

        // Add the optimistic message to the end of the list
        localStore.setQuery(
          api.messages.getRecent,
          { channelId: msgChannelId, limit: 50 },
          [...existingMessages, optimisticMessage],
        );
      }
    },
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const insertMention = (userId: string, userName: string) => {
    const textBeforeCursor = displayText.substring(0, cursorPosition);
    const textAfterCursor = displayText.substring(cursorPosition);

    // Find the @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    // Replace from @ to cursor with just @userName (clean display)
    const newDisplayText =
      textBeforeCursor.substring(0, lastAtIndex) +
      `@${userName} ` +
      textAfterCursor;

    // Store the mention mapping
    setMentions((prev) => {
      const updated = new Map(prev);
      updated.set(userName, userId);
      return updated;
    });

    setDisplayText(newDisplayText);
    setText(newDisplayText); // Keep in sync initially
    setShowMentions(false);
    setMentionQuery("");
    setSelectedMentionIndex(0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;

    setDisplayText(newText);
    setText(newText);
    setCursorPosition(cursorPos);

    const textBeforeCursor = newText.substring(0, cursorPos);

    // Check if we're typing a mention
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(" ");
    const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");

    if (
      lastAtIndex > Math.max(lastSpaceIndex, lastNewlineIndex) &&
      lastAtIndex !== -1
    ) {
      // We're in a mention
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      setMentionQuery(query);
      setShowMentions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only intercept keys when mention dropdown is showing
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex(
          (prev) => (prev + 1) % mentionSuggestions.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(
          (prev) =>
            (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length,
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selected = mentionSuggestions[selectedMentionIndex];
        insertMention(selected.userId, selected.userName);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        setMentionQuery("");
        return;
      }
    }

    // When mentions are not showing, handle Enter to submit
    if (!showMentions && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Trigger form submit
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // Trim and validate the message text
    let messageText = message.text?.trim() || "";

    // Prevent double submission using ref
    if (!messageText || submittingRef.current) {
      return;
    }

    // Convert @userName mentions to @[userName](userId) format
    mentions.forEach((userId, userName) => {
      const mentionRegex = new RegExp(`@${userName}\\b`, "g");
      messageText = messageText.replace(mentionRegex, `@[${userName}](${userId})`);
    });

    // Mark as submitting immediately
    submittingRef.current = true;
    setIsSubmitting(true);

    // Clear input immediately for instant feedback
    setText("");
    setDisplayText("");
    setMentions(new Map());
    setShowMentions(false);
    setMentionQuery("");

    try {
      let storageId: Id<"_storage"> | undefined;
      let fileType: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      // Handle file upload if present
      if (message.files && message.files.length > 0) {
        const file = message.files[0]; // Take the first file

        // Convert data URL to Blob
        let blob: Blob;
        if (file.url?.startsWith("data:")) {
          // Data URL format: data:image/png;base64,iVBORw0KG...
          const response = await fetch(file.url);
          blob = await response.blob();
        } else {
          throw new Error("Invalid file format");
        }

        // Generate upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload the file (no Content-Type header, send raw blob)
        const result = await fetch(uploadUrl, {
          method: "POST",
          body: blob,
        });

        if (!result.ok) {
          const errorText = await result.text();
          console.error("Upload failed:", errorText);
          throw new Error("Failed to upload file");
        }

        const response = await result.json();
        console.log("Upload response:", response);
        storageId = response.storageId;
        fileType = file.mediaType;
        fileName = file.filename;
        fileSize = blob.size;
      }

      await sendMessage({
        channelId,
        text: messageText,
        storageId,
        fileType,
        fileName,
        fileSize,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore display text on error so user can retry
      setDisplayText(message.text || "");

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      if (errorMessage !== "Message cannot be empty") {
        alert(errorMessage);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Mention Autocomplete Dropdown */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-popover border rounded-lg shadow-xl overflow-hidden z-[100] max-w-md">
          <div className="px-3 py-2 border-b bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">
              Select user to mention
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {mentionSuggestions.map((user, index) => (
              <button
                key={user.userId}
                type="button"
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-l-2 ${
                  index === selectedMentionIndex
                    ? "bg-accent border-primary"
                    : "hover:bg-accent/50 border-transparent"
                }`}
                onClick={() => insertMention(user.userId, user.userName)}
                onMouseEnter={() => setSelectedMentionIndex(index)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {getInitials(user.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{(user as any).username || user.userName.toLowerCase().replace(/\s+/g, "")}
                  </p>
                </div>
                {index === selectedMentionIndex && (
                  <div className="text-xs text-muted-foreground">↵</div>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                ↓
              </kbd>{" "}
              to navigate •{" "}
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                ↵
              </kbd>{" "}
              to select •{" "}
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                esc
              </kbd>{" "}
              to cancel
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="divide-y-0 relative"
          accept="image/*"
          maxFiles={1}
          maxFileSize={10 * 1024 * 1024} // 10MB
        >
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              value={displayText}
              placeholder="Type a message... (Use @ to mention someone)"
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!displayText.trim() || isSubmitting}
              status={isSubmitting ? "streaming" : "ready"}
            >
              <ArrowUp className="size-4" />
            </PromptInputSubmit>
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
