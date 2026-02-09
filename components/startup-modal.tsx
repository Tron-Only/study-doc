"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * StartupModal
 *
 * - Shows immediately on mount.
 * - Blocks all interaction with the page until the user clicks the button.
 * - As requested, clicking outside or pressing Escape will NOT close the modal.
 * - Background uses a mostly-opaque black overlay with a slight blur.
 *
 * Note: the "Fetch notes" button currently only closes the modal.
 */
export default function StartupModal() {
  const [open, setOpen] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;

    // Prevent Escape from closing anything or bubbling to other handlers.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent focus moving outside the modal by intercepting focusin
    // and forcing focus back to the first focusable element if needed.
    // This is a lightweight focus-trap: puts focus on the input if focus leaves.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const modal = document.getElementById("startup-modal");
      if (!modal) return;
      if (!modal.contains(target)) {
        // Return focus to the input inside the modal
        const input = modal.querySelector<HTMLInputElement>("input");
        input?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [open]);

  if (!open) return <></>;

  return (
    <div
      id="startup-modal-portal"
      aria-hidden={false}
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center"
      // Prevent any pointer events from reaching the background container.
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Overlay: mostly black and nearly opaque, with a slight blur */}
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
        style={{
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
        }}
        // Swallow clicks on the overlay so clicking outside does nothing.
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Modal content */}
      <div
        id="startup-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Startup modal"
        className="relative z-10 w-full max-w-lg rounded-lg border bg-card text-card-foreground p-6 shadow-lg"
        // prevent clicks from bubbling out
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">Welcome</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          What is the URL for the website?
        </p>

        <Input
          autoFocus
          placeholder="https://github.com/username/notes"
          aria-label="Website URL"
          className="mb-4"
        />

        <div className="flex justify-end">
          <Button
            variant="default"
            onClick={() => {
              // For now, just close the modal. Fetching will be added later.
              setOpen(false);
            }}
          >
            Fetch notes
          </Button>
        </div>
      </div>
    </div>
  );
}
