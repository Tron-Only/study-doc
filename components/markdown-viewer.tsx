"use client";

import React, { useEffect, useState, useRef, useId } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
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

// Mermaid diagram renderer component
function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const renderDiagram = async () => {
      try {
        // Initialize mermaid with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });

        // Generate unique ID for this diagram
        const uniqueId = `mermaid-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(uniqueId, code);
        
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid render error:", err);
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50/10 p-4 my-4">
        <p className="text-sm text-red-400 mb-2">Failed to render Mermaid diagram:</p>
        <pre className="text-xs text-red-300 overflow-auto">{error}</pre>
        <pre className="text-xs text-muted-foreground mt-2 overflow-auto bg-muted/50 p-2 rounded">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-md border border-border bg-muted/50 p-4 my-4 text-center">
        <p className="text-sm text-muted-foreground">Loading diagram...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-diagram my-4 overflow-auto rounded-md border border-border bg-[#1e1e1e] p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

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
    <div className={className ?? "max-w-none"}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading note…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : content ? (
        <article className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Open links in a new tab and prevent noreferrer leak
              a: (props: React.ComponentPropsWithoutRef<"a">) => {
                return (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                );
              },
              // Handle code blocks - check for mermaid
              code: (props: {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              }) => {
                const { inline, className: codeClassName, children } = props;
                
                if (inline) {
                  return <code className={codeClassName}>{children}</code>;
                }

                // Check if this is a mermaid code block
                const language = codeClassName?.replace("language-", "") || "";
                const code = String(children).replace(/\n$/, "");
                
                if (language === "mermaid") {
                  return <MermaidDiagram code={code} />;
                }

                // Regular code block
                return (
                  <pre className={codeClassName ? codeClassName : "bg-muted p-2 rounded"}>
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
      
      <style jsx global>{`
        .markdown-body {
          color: var(--foreground);
          line-height: 1.6;
          word-wrap: break-word;
        }
        
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
          color: var(--foreground);
        }
        
        .markdown-body h1 {
          font-size: 2em;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.3em;
        }
        
        .markdown-body h2 {
          font-size: 1.5em;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.3em;
        }
        
        .markdown-body h3 {
          font-size: 1.25em;
        }
        
        .markdown-body h4 {
          font-size: 1em;
        }
        
        .markdown-body p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .markdown-body ul,
        .markdown-body ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 2em;
        }
        
        .markdown-body ul {
          list-style-type: disc;
        }
        
        .markdown-body ol {
          list-style-type: decimal;
        }
        
        .markdown-body li {
          margin: 0.25em 0;
        }
        
        .markdown-body li > p {
          margin-top: 16px;
        }
        
        .markdown-body blockquote {
          margin: 0 0 16px 0;
          padding: 0 1em;
          color: var(--muted-foreground);
          border-left: 0.25em solid var(--border);
        }
        
        .markdown-body blockquote > :first-child {
          margin-top: 0;
        }
        
        .markdown-body blockquote > :last-child {
          margin-bottom: 0;
        }
        
        .markdown-body code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: var(--muted);
          border-radius: 3px;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        }
        
        .markdown-body pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: var(--muted);
          border-radius: 6px;
          margin-bottom: 16px;
        }
        
        .markdown-body pre code {
          display: inline;
          max-width: auto;
          padding: 0;
          margin: 0;
          overflow: visible;
          line-height: inherit;
          word-wrap: normal;
          background-color: transparent;
          border: 0;
        }
        
        .markdown-body a {
          color: #58a6ff;
          text-decoration: none;
        }
        
        .markdown-body a:hover {
          text-decoration: underline;
        }
        
        .markdown-body strong {
          font-weight: 600;
        }
        
        .markdown-body hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: var(--border);
          border: 0;
        }
        
        .markdown-body table {
          border-spacing: 0;
          border-collapse: collapse;
          margin-bottom: 16px;
          width: 100%;
          overflow: auto;
        }
        
        .markdown-body table th,
        .markdown-body table td {
          padding: 6px 13px;
          border: 1px solid var(--border);
        }
        
        .markdown-body table th {
          font-weight: 600;
          background-color: var(--muted);
        }
        
        .markdown-body table tr:nth-child(2n) {
          background-color: var(--muted);
        }
        
        .markdown-body img {
          max-width: 100%;
          box-sizing: content-box;
          background-color: var(--background);
        }
        
        .markdown-body input[type="checkbox"] {
          margin-right: 0.5em;
        }
        
        /* Mermaid diagram styling */
        .mermaid-diagram {
          display: flex;
          justify-content: center;
        }
        
        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
