"use client";

import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated?: () => void;
}

export function CreateChannelDialog({
  isOpen,
  onClose,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createChannel = useMutation(api.channels.create);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onChannelCreated?.();
      onClose();
    } catch (error) {
      console.error("Failed to create channel:", error);
      alert(
        error instanceof Error ? error.message : "Failed to create channel",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Create a Channel
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="channel-name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Channel Name <span className="text-destructive">*</span>
              </label>
              <input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. general, random, announcements"
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                maxLength={80}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label
                htmlFor="channel-description"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="channel-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Channel"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
