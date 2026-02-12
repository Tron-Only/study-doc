"use client";

import React, { useEffect, useState, useRef, useId } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { fetchMarkdown } from "@/lib/utils";
import { AlertTriangle, CheckCircle, HelpCircle, Info, Lightbulb, MessageSquare, XCircle, Flame, BookOpen, Quote, Bug } from "lucide-react";

// Obsidian callout types and their configuration
const CALLOUT_TYPES: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  note: { icon: Info, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)", borderColor: "#3b82f6" },
  abstract: { icon: BookOpen, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)", borderColor: "#06b6d4" },
  summary: { icon: BookOpen, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)", borderColor: "#06b6d4" },
  tldr: { icon: BookOpen, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)", borderColor: "#06b6d4" },
  info: { icon: Info, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)", borderColor: "#3b82f6" },
  todo: { icon: CheckCircle, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)", borderColor: "#3b82f6" },
  tip: { icon: Lightbulb, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  hint: { icon: Lightbulb, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  important: { icon: Lightbulb, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  success: { icon: CheckCircle, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  check: { icon: CheckCircle, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  done: { icon: CheckCircle, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" },
  question: { icon: HelpCircle, color: "#eab308", bgColor: "rgba(234, 179, 8, 0.1)", borderColor: "#eab308" },
  help: { icon: HelpCircle, color: "#eab308", bgColor: "rgba(234, 179, 8, 0.1)", borderColor: "#eab308" },
  faq: { icon: HelpCircle, color: "#eab308", bgColor: "rgba(234, 179, 8, 0.1)", borderColor: "#eab308" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)", borderColor: "#f59e0b" },
  caution: { icon: AlertTriangle, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)", borderColor: "#f59e0b" },
  attention: { icon: AlertTriangle, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)", borderColor: "#f59e0b" },
  failure: { icon: XCircle, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  fail: { icon: XCircle, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  missing: { icon: XCircle, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  danger: { icon: Flame, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  error: { icon: XCircle, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  bug: { icon: Bug, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" },
  example: { icon: MessageSquare, color: "#a855f7", bgColor: "rgba(168, 85, 247, 0.1)", borderColor: "#a855f7" },
  quote: { icon: Quote, color: "#6b7280", bgColor: "rgba(107, 114, 128, 0.1)", borderColor: "#6b7280" },
  cite: { icon: Quote, color: "#6b7280", bgColor: "rgba(107, 114, 128, 0.1)", borderColor: "#6b7280" },
};

// Parse callout from blockquote content
function parseCallout(children: React.ReactNode): { type: string; title: string | null; isCallout: boolean; collapsible: boolean; collapsed: boolean } {
  // First try to extract text from the first paragraph (react-markdown wraps blockquote content in <p>)
  const text = extractFirstParagraphText(children);
  
  // Trim leading/trailing whitespace to handle newlines
  const trimmedText = text.trim();
  
  // Match Obsidian callout syntax at the start of content
  // Supports: [!TYPE], [!TYPE] Title, [!TYPE]- Title (collapsed), [!TYPE]+ Title (expanded)
  const match = trimmedText.match(/^\[!\s*(\w+)\s*\]([+-]?)\s*(.*)/);
  
  if (match) {
    const type = match[1].toLowerCase();
    const collapsibleIndicator = match[2];
    const title = match[3].trim() || null;
    const isCallout = type in CALLOUT_TYPES;
    
    const collapsible = collapsibleIndicator === '+' || collapsibleIndicator === '-';
    const collapsed = collapsibleIndicator === '-';
    
    return { type, title, isCallout, collapsible, collapsed };
  }
  
  return { type: "", title: null, isCallout: false, collapsible: false, collapsed: false };
}

// Extract text from React node for parsing
function extractTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children) {
      return extractTextFromReactNode(element.props.children);
    }
  }
  return "";
}

// Check if first child is a paragraph and extract its text
function extractFirstParagraphText(children: React.ReactNode): string {
  if (Array.isArray(children) && children.length > 0) {
    const firstChild = children[0];
    if (React.isValidElement(firstChild)) {
      const element = firstChild as React.ReactElement<{ children?: React.ReactNode }>;
      // Check if it's a paragraph element
      if (element.type === 'p' && element.props.children) {
        return extractTextFromReactNode(element.props.children);
      }
    }
  }
  return extractTextFromReactNode(children);
}

// Remove the callout marker from the first paragraph
function removeCalloutMarkerFromText(text: string, type: string): string {
  const pattern = new RegExp(`^\\[!\\s*${type}\\s*\\][+-]?\\s*`);
  return text.replace(pattern, "").trim();
}

function removeCalloutMarker(children: React.ReactNode, type: string): React.ReactNode {
  if (!Array.isArray(children)) return children;
  
  // Find the paragraph element in the array (might not be at index 0)
  const paraIndex = children.findIndex(child => 
    React.isValidElement(child) && child.type === 'p'
  );
  
  if (paraIndex === -1) return children;
  
  const paraElement = children[paraIndex] as React.ReactElement<{ children?: React.ReactNode }>;
  const paraChildren = paraElement.props.children;
  
  if (!paraChildren) return children;
  
  let cleanedContent: React.ReactNode;
  
  // Handle string content in paragraph
  if (typeof paraChildren === "string") {
    const cleaned = removeCalloutMarkerFromText(paraChildren, type);
    if (!cleaned) {
      // Remove the paragraph entirely if nothing left
      return [...children.slice(0, paraIndex), ...children.slice(paraIndex + 1)];
    }
    cleanedContent = cleaned;
  } else if (Array.isArray(paraChildren)) {
    // Handle array content in paragraph
    const firstText = paraChildren[0];
    if (typeof firstText === "string") {
      const cleaned = removeCalloutMarkerFromText(firstText, type);
      const newParaChildren = cleaned 
        ? [cleaned, ...paraChildren.slice(1)]
        : paraChildren.slice(1);
      
      if (newParaChildren.length === 0) {
        // Remove the paragraph entirely if nothing left
        return [...children.slice(0, paraIndex), ...children.slice(paraIndex + 1)];
      }
      cleanedContent = newParaChildren;
    } else {
      return children;
    }
  } else {
    return children;
  }
  
  // Reconstruct the children array with the cleaned paragraph
  const newPara = React.createElement('p', { key: paraElement.key || 'callout-content' }, cleanedContent);
  return [
    ...children.slice(0, paraIndex),
    newPara,
    ...children.slice(paraIndex + 1)
  ];
}

// Callout component
function Callout({ type, title, children, collapsible, collapsed: initialCollapsed }: { 
  type: string; 
  title: string | null; 
  children: React.ReactNode;
  collapsible: boolean;
  collapsed: boolean;
}) {
  const config = CALLOUT_TYPES[type] || CALLOUT_TYPES.note;
  const Icon = config.icon;
  const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  const content = removeCalloutMarker(children, type);
  
  return (
    <div 
      className="callout"
      style={{
        backgroundColor: config.bgColor,
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: "6px",
        padding: "12px 16px",
        margin: "16px 0",
      }}
    >
      <div 
        className="callout-title"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: config.color,
          fontWeight: 600,
          marginBottom: isCollapsed ? 0 : "8px",
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <Icon size={18} />
        <span>{displayTitle}</span>
        {collapsible && (
          <span style={{ marginLeft: "auto" }}>
            {isCollapsed ? "▶" : "▼"}
          </span>
        )}
      </div>
      {(!collapsible || !isCollapsed) && (
        <div className="callout-content" style={{ color: "var(--foreground)" }}>
          {content}
        </div>
      )}
    </div>
  );
}

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
  const resolvedOwnerRef = useRef<string | null>(null);
  const resolvedRepoRef = useRef<string | null>(null);

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
        // Store resolved owner/repo for image resolution
        resolvedOwnerRef.current = o;
        resolvedRepoRef.current = r;
        
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
                node?: any;
              }) => {
                const { inline, className: codeClassName, children } = props;
                const codeText = String(children || "").replace(/\n$/, "");
                
                // Check if this is inline code (single backticks) or block code (triple backticks)
                // Inline code: inline === true OR no newlines in content OR no language class
                const isInline = inline === true || (!codeText.includes("\n") && !codeClassName);
                
                if (isInline) {
                  return (
                    <code 
                      className="inline-code"
                      style={{
                        padding: '0.2em 0.4em',
                        margin: 0,
                        fontSize: '85%',
                        backgroundColor: 'var(--muted)',
                        borderRadius: '3px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                        display: 'inline',
                      }}
                    >
                      {children}
                    </code>
                  );
                }

                // Check if this is a mermaid code block
                const language = codeClassName?.replace("language-", "") || "";
                
                if (language === "mermaid") {
                  return <MermaidDiagram code={codeText} />;
                }

                // Regular code block (triple backticks)
                return (
                  <pre className={codeClassName ? codeClassName : "bg-muted p-2 rounded"}>
                    <code>{children}</code>
                  </pre>
                );
              },
              // Handle images - resolve relative paths to GitHub raw URLs
              img: (props: React.ComponentPropsWithoutRef<"img">) => {
                const { src, alt, ...rest } = props;
                const srcStr = src as string;
                
                // If src is already absolute or data URI, use as-is
                if (!srcStr || typeof srcStr !== 'string' || srcStr.startsWith('http://') || srcStr.startsWith('https://') || srcStr.startsWith('data:') || srcStr.startsWith('//')) {
                  return <img {...props} />;
                }
                
                // Get the directory of the current markdown file
                const filePath = path ?? slug ?? '';
                const fileDir = filePath.includes('/') 
                  ? filePath.substring(0, filePath.lastIndexOf('/')) 
                  : '';
                
                // Resolve the relative path
                let resolvedPath = srcStr;
                if (srcStr.startsWith('../')) {
                  // Go up one directory from the file's location
                  const parentDir = fileDir.includes('/') 
                    ? fileDir.substring(0, fileDir.lastIndexOf('/')) 
                    : '';
                  resolvedPath = parentDir + '/' + srcStr.substring(3);
                } else if (srcStr.startsWith('./')) {
                  // Relative to current directory
                  resolvedPath = fileDir + '/' + srcStr.substring(2);
                } else if (fileDir) {
                  // No prefix - relative to current directory
                  resolvedPath = fileDir + '/' + srcStr;
                }
                
                // Remove leading slash if present
                resolvedPath = resolvedPath.replace(/^\//, '');
                
                // Build the GitHub raw URL (always use main branch)
                const owner = resolvedOwnerRef.current;
                const repo = resolvedRepoRef.current;
                if (!owner || !repo) {
                  return <img {...props} />;
                }
                
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${resolvedPath}`;
                
                return <img src={rawUrl} alt={alt} {...rest} style={{ maxWidth: '100%', height: 'auto' }} />;
              },
              // Handle blockquotes - check for callouts
              blockquote: ({ children }: { children?: React.ReactNode }) => {
                const { type, title, isCallout, collapsible, collapsed } = parseCallout(children);
                
                if (isCallout) {
                  return (
                    <Callout 
                      type={type} 
                      title={title} 
                      collapsible={collapsible}
                      collapsed={collapsed}
                    >
                      {children}
                    </Callout>
                  );
                }
                
                // Regular blockquote
                return (
                  <blockquote style={{
                    margin: "0 0 16px 0",
                    padding: "0 1em",
                    color: "var(--muted-foreground)",
                    borderLeft: "0.25em solid var(--border)",
                  }}>
                    {children}
                  </blockquote>
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
          display: inline;
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
