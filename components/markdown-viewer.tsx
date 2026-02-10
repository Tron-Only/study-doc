"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchMarkdown } from "@/lib/utils";

type Props = {
  /**
   * Repository owner (e.g. "username"). If omitted, the component will try
   * to read the saved repo owner from localStorage under `study-doc:repo_owner`.
   */
  owner?: string;
  /**
   * Repository name (e.g. "notes"). If omitted, the component will try
   * to read the saved repo name from localStorage under `study-doc:repo_name`.
   */
  repo?: string;
  /**
   * Path to the markdown file inside the repo, e.g. "notes/intro.md".
   * If not provided, `slug` may be used instead (useful for route params).
   */
  path?: string;
  /**
   * Alias for `path` commonly used by pages that pass a slug param.
   */
  slug?: string;
  /**
   * Optional CSS class to apply to the outer container.
   */
  className?: string;
};

export default function MarkdownViewer({
  owner,
  repo,
  path,
  slug,
  className,
}: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filePath = path ?? slug;
    if (!filePath) {
      setError("No file path provided to MarkdownViewer.");
      setContent(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    setContent(null);

    (async () => {
      try {
        let o = owner;
        let r = repo;

        // If owner/repo not provided via props, attempt to read persisted values
        // stored by the startup modal in localStorage.
        if (!o || !r) {
          try {
            const storedOwner = localStorage.getItem("study-doc:repo_owner");
            const storedRepo = localStorage.getItem("study-doc:repo_name");
            if (storedOwner && storedRepo) {
              o = o ?? storedOwner;
              r = r ?? storedRepo;
            }
          } catch {
            // ignore localStorage errors
          }
        }

        if (!o || !r) {
          throw new Error(
            "Repository owner/name not configured. Provide `owner` and `repo` props or save a repo via the startup modal.",
          );
        }

        // Fetch raw markdown text using the project utility
        const md = await fetchMarkdown(o, r, filePath);
        if (!mounted) return;
        setContent(md);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [owner, repo, path, slug]);

  return (
    <div className={className ?? "prose max-w-none"}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading note…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : content ? (
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Open links in a new tab and prevent noreferrer leak
              a: (props: React.ComponentPropsWithoutRef<"a">) => {
                return (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                );
              },
              // Render code blocks with a wrapper so users can style them
              code: (props: {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              }) => {
                const { inline, className, children } = props;
                if (inline) {
                  return <code className={className}>{children}</code>;
                }
                return (
                  <pre
                    className={className ? className : "bg-muted p-2 rounded"}
                  >
                    <code>{children}</code>
                  </pre>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      ) : (
        <div className="text-sm text-muted-foreground">No note to display.</div>
      )}
    </div>
  );
}
