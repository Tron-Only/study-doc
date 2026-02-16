"use client";

import React, { useEffect, useState, useRef, useId } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${id}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, code);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid render error:", err);
          setError(
            err instanceof Error ? err.message : "Failed to render diagram"
          );
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
        <p className="text-sm text-red-400 mb-2">
          Failed to render Mermaid diagram:
        </p>
        <pre className="text-xs text-red-300 overflow-auto">{error}</pre>
        <pre className="text-xs text-muted-foreground mt-2 overflow-auto bg-muted/50 p-2 rounded">
          {code}
        </pre>
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
