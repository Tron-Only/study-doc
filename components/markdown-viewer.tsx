"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchMarkdown } from "@/lib/utils";
import { Callout } from "./markdown/Callout";
import { MermaidDiagram } from "./markdown/MermaidDiagram";
import { CodeBlock, InlineCode } from "./markdown/CodeBlock";
import { parseCallout } from "./markdown/callout-utils";
import "./markdown/markdown-styles.css";

interface MarkdownViewerProps {
  /** Repository owner (e.g. "username"). Falls back to localStorage if not provided. */
  owner?: string;
  /** Repository name (e.g. "notes"). Falls back to localStorage if not provided. */
  repo?: string;
  /** Path to the markdown file inside the repo, e.g. "notes/intro.md". */
  path?: string;
  /** Alias for `path` commonly used by pages that pass a slug param. */
  slug?: string;
  /** Optional CSS class to apply to the outer container. */
  className?: string;
}

// Markdown component renderers
const renderers = {
  a: (props: React.ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),

  code: (props: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const { inline, className: codeClassName, children } = props;
    const codeText = String(children || "").replace(/\n$/, "");
    const isInline =
      inline === true || (!codeText.includes("\n") && !codeClassName);

    if (isInline) {
      return <InlineCode>{children}</InlineCode>;
    }

    const language = codeClassName?.replace("language-", "") || "";

    if (language === "mermaid") {
      return <MermaidDiagram code={codeText} />;
    }

    return <CodeBlock code={codeText} language={language || "text"} />;
  },

  blockquote: ({ children }: { children?: React.ReactNode }) => {
    const parsed = parseCallout(children);

    if (parsed.isCallout) {
      return (
        <Callout {...parsed}>{children}</Callout>
      );
    }

    return (
      <blockquote className="markdown-blockquote">{children}</blockquote>
    );
  },
};

// Image renderer factory - needs path context
function createImageRenderer(path: string | undefined, slug: string | undefined) {
  return (props: React.ComponentPropsWithoutRef<"img">) => {
    const { src, alt, ...rest } = props;
    const srcStr = src as string;

    // Skip if already absolute or data URI
    if (
      !srcStr ||
      typeof srcStr !== "string" ||
      srcStr.startsWith("http://") ||
      srcStr.startsWith("https://") ||
      srcStr.startsWith("data:") ||
      srcStr.startsWith("//")
    ) {
      return <img {...props} />;
    }

    const filePath = path ?? slug ?? "";
    const fileDir = filePath.includes("/")
      ? filePath.substring(0, filePath.lastIndexOf("/"))
      : "";

    let resolvedPath = srcStr;
    if (srcStr.startsWith("../")) {
      const parentDir = fileDir.includes("/")
        ? fileDir.substring(0, fileDir.lastIndexOf("/"))
        : "";
      resolvedPath = parentDir + "/" + srcStr.substring(3);
    } else if (srcStr.startsWith("./")) {
      resolvedPath = fileDir + "/" + srcStr.substring(2);
    } else if (fileDir) {
      resolvedPath = fileDir + "/" + srcStr;
    }

    resolvedPath = resolvedPath.replace(/^\//, "");

    // Build GitHub raw URL - will be set by the main component
    return <ImageWithGitHubUrl src={resolvedPath} alt={alt} {...rest} />;
  };
}

// Helper component to access refs for GitHub URL construction
function ImageWithGitHubUrl(props: React.ComponentPropsWithoutRef<"img"> & { src: string }) {
  const { src, alt, ...rest } = props;
  const [owner, setOwner] = useState<string | null>(null);
  const [repo, setRepo] = useState<string | null>(null);

  useEffect(() => {
    const storedOwner = localStorage.getItem("study-doc:repo_owner");
    const storedRepo = localStorage.getItem("study-doc:repo_name");
    if (storedOwner) setOwner(storedOwner);
    if (storedRepo) setRepo(storedRepo);
  }, []);

  if (!owner || !repo) {
    return <img src={src} alt={alt} {...rest} />;
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${src}`;
  return <img src={rawUrl} alt={alt} {...rest} style={{ maxWidth: "100%", height: "auto" }} />;
}

export default function MarkdownViewer({
  owner,
  repo,
  path,
  slug,
  className,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filePath = path ?? slug;
    if (!filePath) {
      setError("No file path provided to MarkdownViewer.");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        let o = owner;
        let r = repo;

        if (!o || !r) {
          const storedOwner = localStorage.getItem("study-doc:repo_owner");
          const storedRepo = localStorage.getItem("study-doc:repo_name");
          o = o ?? storedOwner ?? undefined;
          r = r ?? storedRepo ?? undefined;
        }

        if (!o || !r) {
          throw new Error(
            "Repository owner/name not configured. Provide `owner` and `repo` props or save a repo via the startup modal."
          );
        }

        const md = await fetchMarkdown(o, r, filePath);

        if (!mounted) return;
        setContent(md);
        trackRecentNote(filePath, md);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [owner, repo, path, slug]);

  const allRenderers = {
    ...renderers,
    img: createImageRenderer(path, slug),
  };

  return (
    <div className={className ?? "max-w-none"}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading note…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : content ? (
        <article className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={allRenderers}>
            {content}
          </ReactMarkdown>
        </article>
      ) : (
        <div className="text-sm text-muted-foreground">No note to display.</div>
      )}
    </div>
  );
}

// Track recent notes in localStorage
function trackRecentNote(filePath: string, content: string) {
  try {
    const decodedPath = decodeURIComponent(filePath);
    const title =
      decodedPath.split("/").pop()?.replace(/\.md$/, "") || decodedPath;
    const recentNote = {
      path: filePath,
      title,
      timestamp: Date.now(),
      preview: content.substring(0, 100).replace(/[#*`]/g, "").trim() + "...",
    };

    const existingNotes = JSON.parse(
      localStorage.getItem("study-doc:recent_notes") || "[]"
    );
    const filteredNotes = existingNotes.filter(
      (note: { path: string }) => note.path !== filePath
    );
    const updatedNotes = [recentNote, ...filteredNotes].slice(0, 10);

    localStorage.setItem("study-doc:recent_notes", JSON.stringify(updatedNotes));
    window.dispatchEvent(new CustomEvent("study-doc:recent-notes-updated"));
  } catch {
    // Silently fail
  }
}
