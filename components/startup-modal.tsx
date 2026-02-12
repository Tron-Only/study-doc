"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseGithubUrl } from "@/lib/utils";
import { useRepos } from "@/components/repo";

/**
 * StartupModal
 *
 * - Only shows on the main page ("/").
 * - Does NOT auto-close on refresh - user must choose an action.
 * - Blocks all interaction with the page until the user clicks the button.
 * - As requested, clicking outside or pressing Escape will NOT close the modal.
 * - Background uses a mostly-opaque black overlay with a slight blur.
 *
 * This version:
 * - Lets the user enter a GitHub repo URL.
 * - Uses RepoProvider to manage repositories.
 * - "Use Notes" button is enabled only when repos exist.
 * - Shows status and basic errors; does not close the modal on failure.
 */
export default function StartupModal() {
  const pathname = usePathname();
  const { repos, addRepo, isLoading: isRepoLoading, activeRepo } = useRepos();
  const [open, setOpen] = useState<boolean>(true);
  const [url, setUrl] = useState<string>(() => {
    try {
      return localStorage.getItem("study-doc:repo") || "";
    } catch {
      return "";
    }
  });
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasExistingNotes = repos.length > 0;

  // Listen for event to show modal from sidebar
  useEffect(() => {
    const handleShowModal = () => {
      setOpen(true);
    };
    window.addEventListener("study-doc:show-startup-modal", handleShowModal);
    return () => window.removeEventListener("study-doc:show-startup-modal", handleShowModal);
  }, []);

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

  // Only show modal on the main page
  if (!open || pathname !== "/") return <></>;

  async function handleFetch() {
    setStatus(null);

    if (!url || !url.trim()) {
      setStatus("Please enter a GitHub repository URL.");
      return;
    }

    setStatus("Parsing repository URL...");

    try {
      const { owner, repo } = parseGithubUrl(url.trim());
      setStatus(`Fetching repository tree for ${owner}/${repo}...`);

      await addRepo(owner, repo, url.trim());

      setStatus("Fetched and saved repository successfully.");
      // Give a moment for users to see the message then close
      setTimeout(() => {
        setOpen(false);
      }, 400);
    } catch (err: unknown) {
      // Safely extract an error message from unknown error types
      console.error(err);
      let message = "Failed to fetch repository. Check the URL and try again.";

      // Narrow the unknown error into known shapes without using `any`.
      type HasMessage = { message?: unknown };

      if (typeof err === "string") {
        message = err;
      } else if (err && typeof err === "object" && "message" in err) {
        const maybeMsg = (err as HasMessage).message;
        if (typeof maybeMsg === "string") {
          message = maybeMsg;
        }
      }

      setStatus(message);
    }
  }

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
          To get started, enter the GitHub repository URL that contains your
          notes (e.g. https://github.com/username/repo).
        </p>

        <Input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          placeholder="https://github.com/username/notes"
          aria-label="Website URL"
          className="mb-4"
        />

        <div className="mb-3 text-sm min-h-[1.25rem]">
          {isRepoLoading ? (
            <span className="text-muted-foreground">
              Working... {status || ""}
            </span>
          ) : status ? (
            <span className="text-muted-foreground">{status}</span>
          ) : hasExistingNotes ? (
            <span className="text-muted-foreground">Notes available. Click &quot;Use Notes&quot; to continue or fetch new notes.</span>
          ) : (
            <span className="text-muted-foreground">No notes found. Enter a GitHub repo URL to fetch notes.</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={!hasExistingNotes}
            onClick={() => {
              if (hasExistingNotes) {
                setOpen(false);
              }
            }}
          >
            Use Notes
          </Button>
          <Button variant="default" onClick={handleFetch} disabled={isRepoLoading}>
            {isRepoLoading ? "Fetching..." : "Fetch notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
