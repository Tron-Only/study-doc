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
 * - Clicking outside or pressing Escape will NOT close the modal.
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

    // Lightweight focus-trap: puts focus on the input if focus leaves.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const modal = document.getElementById("startup-modal");
      if (!modal) return;
      if (!modal.contains(target)) {
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
      console.error(err);
      let message = "Failed to fetch repository. Check the URL and try again.";

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
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Overlay — warm dark scrim */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "oklch(0.12 0.006 55 / 0.92)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Modal dialog */}
      <div
        id="startup-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Startup modal"
        className="relative z-10 w-full max-w-md rounded-lg border bg-card text-card-foreground p-6 shadow-xl"
        style={{
          boxShadow: "0 8px 32px oklch(0 0 0 / 0.15), 0 2px 8px oklch(0 0 0 / 0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="mb-1 text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-ibm-plex-sans), var(--font-geist-sans), system-ui" }}
        >
          Welcome
        </h2>
        <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
          Enter the GitHub repository URL that contains your notes to get started.
        </p>

        <Input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          placeholder="https://github.com/username/notes"
          aria-label="Website URL"
          className="mb-4 text-sm"
        />

        <div className="mb-4 text-xs min-h-[1rem] leading-relaxed">
          {isRepoLoading ? (
            <span className="text-muted-foreground">
              {status || "Working..."}
            </span>
          ) : status ? (
            <span className="text-muted-foreground">{status}</span>
          ) : hasExistingNotes ? (
            <span className="text-muted-foreground">Notes available. Click &quot;Use Notes&quot; to continue or fetch new notes.</span>
          ) : (
            <span className="text-muted-foreground/60">No notes found. Enter a GitHub repo URL to fetch notes.</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasExistingNotes}
            onClick={() => {
              if (hasExistingNotes) {
                setOpen(false);
              }
            }}
          >
            Use Notes
          </Button>
          <Button variant="default" size="sm" onClick={handleFetch} disabled={isRepoLoading}>
            {isRepoLoading ? "Fetching..." : "Fetch notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
