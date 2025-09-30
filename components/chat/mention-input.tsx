"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface MentionInputProps {
  channelId: Id<"channels">;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

interface MentionSuggestion {
  userId: string;
  userName: string;
  username: string | null;
}

export function MentionInput({
  channelId,
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({
    top: 0,
    left: 0,
  });
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get users in channel for mentions
  const allUsers = useQuery(api.users.listInChannel, { channelId }) ?? [];

  // Filter users based on mention query
  const filteredUsers = mentionQuery
    ? allUsers.filter((user) =>
        user.userName.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : allUsers;

  const suggestions = filteredUsers.slice(0, 5);

  useEffect(() => {
    // Reset selected index when suggestions change
    setSelectedIndex(0);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const insertMention = (user: MentionSuggestion) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);

    // Find the @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    // Replace from @ to cursor with mention
    const newText =
      textBeforeCursor.substring(0, lastAtIndex) +
      `@${user.userId} ` +
      textAfterCursor;

    onChange(newText);
    setShowSuggestions(false);
    setMentionQuery("");

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + user.userId.length + 2; // +2 for @ and space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setMentionQuery("");
        return;
      }
    }

    // Regular submit on Enter (without shift)
    if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);

    // Check if we're typing a mention
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(" ");

    if (lastAtIndex > lastSpaceIndex && lastAtIndex !== -1) {
      // We're in a mention
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      setMentionQuery(query);
      setShowSuggestions(true);

      // Calculate position for suggestions dropdown
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setSuggestionPosition({
          top: rect.top - 200, // Show above the input
          left: rect.left + 10,
        });
      }
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
    }
  };

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={1}
        style={{ resize: "none", overflow: "hidden" }}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="fixed z-50 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden"
          style={{
            top: suggestionPosition.top,
            left: suggestionPosition.left,
          }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.userId}
              className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(user.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.userName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.userId}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
