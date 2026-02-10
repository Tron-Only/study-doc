import React from "react";
import MarkdownViewer from "@/components/markdown-viewer";

type Props = {
  params?: {
    slug?: string[];
  };
};

/**
 * Dynamic notes route.
 *
 * This component is server-rendered and mounts the client `MarkdownViewer`
 * to fetch and render the raw markdown from the repository. The viewer will
 * read `owner` and `repo` from localStorage if they are not provided via props.
 *
 * URL examples:
 * - /notes/README.md          -> slug = ["README.md"]
 * - /notes/docs/intro.md      -> slug = ["docs", "intro.md"]
 *
 * If no slug is provided, we render a small instructional message.
 */
export default function NotesRoute({ params }: Props) {
  const slugArray = params?.slug;

  if (!slugArray || slugArray.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">No note selected</h1>
        <p className="mt-2 text-muted-foreground">
          Use the sidebar to select a note. If you have not fetched a repository
          yet, open the startup modal and provide a GitHub repository containing
          your notes.
        </p>
      </div>
    );
  }

  // Reconstruct the repository-relative path from the slug segments.
  const filePath = slugArray.join("/");

  // Render the client MarkdownViewer which will fetch the raw file from GitHub.
  return (
    <div className="p-6">
      <MarkdownViewer slug={filePath} />
    </div>
  );
}
