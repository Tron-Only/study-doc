"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRepos } from "@/components/repo";
import type { NavItem } from "@/lib/utils";

interface SearchResult {
  path: string;
  title: string;
  breadcrumb: string[];
  preview?: string;
  matchesContent: boolean;
}

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contentSearch, setContentSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { activeRepo } = useRepos();

  // Open/Close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  // Listen for open event
  useEffect(() => {
    const handleOpen = () => open();
    window.addEventListener("study-doc:open-search", handleOpen);
    return () => window.removeEventListener("study-doc:open-search", handleOpen);
  }, [open]);

  // Search functionality
  const performSearch = useCallback(async () => {
    if (!query.trim() || !activeRepo?.sidebar) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchTerm = query.toLowerCase();

    // Flatten sidebar to get all files
    const allFiles: { item: NavItem; breadcrumb: string[] }[] = [];
    const flattenNav = (items: NavItem[] | undefined, breadcrumb: string[] = []) => {
      if (!items) return;
      items.forEach((item) => {
        const newBreadcrumb = [...breadcrumb, item.title];
        if (item.items && item.items.length > 0) {
          // It's a folder
          flattenNav(item.items, newBreadcrumb);
        } else if (item.url.endsWith(".md")) {
          // It's a file
          allFiles.push({ item, breadcrumb: newBreadcrumb });
        }
      });
    };
    flattenNav(activeRepo.sidebar);

    // Title search (always performed)
    const titleResults = allFiles
      .filter(({ item }) => item.title.toLowerCase().includes(searchTerm))
      .map(({ item, breadcrumb }) => ({
        path: item.url,
        title: item.title,
        breadcrumb: breadcrumb.slice(0, -1), // Exclude the file itself from breadcrumb
        matchesContent: false,
      }));

    let finalResults = titleResults;

    // Content search (if enabled)
    if (contentSearch && titleResults.length < 10) {
      const filesToSearch = allFiles.filter(
        ({ item }) => !titleResults.some((r) => r.path === item.url)
      );

      const contentResults: SearchResult[] = [];
      
      for (const { item, breadcrumb } of filesToSearch.slice(0, 20)) {
        try {
          const { fetchMarkdown } = await import("@/lib/utils");
          const content = await fetchMarkdown(
            activeRepo.owner,
            activeRepo.name,
            item.url
          );
          
          if (content.toLowerCase().includes(searchTerm)) {
            const lines = content.split("\n");
            const matchLine = lines.find((line) => 
              line.toLowerCase().includes(searchTerm)
            );
            
            contentResults.push({
              path: item.url,
              title: item.title,
              breadcrumb: breadcrumb.slice(0, -1),
              preview: matchLine?.substring(0, 100).replace(/[#*`]/g, "").trim(),
              matchesContent: true,
            });
          }
        } catch (e) {
          // Skip files that can't be fetched
        }
      }

      finalResults = [...titleResults, ...contentResults];
    }

    setResults(finalResults.slice(0, 10));
    setIsSearching(false);
  }, [query, activeRepo, contentSearch]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch();
      } else {
        setResults([]);
      }
    }, contentSearch ? 500 : 150);

    return () => clearTimeout(timer);
  }, [query, performSearch, contentSearch]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        router.push(`/notes/${results[selectedIndex].path}`);
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, results, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-2xl bg-popover border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
          <button
            onClick={close}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content Search Toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Switch
              id="content-search"
              checked={contentSearch}
              onCheckedChange={setContentSearch}
            />
            <Label htmlFor="content-search" className="text-sm cursor-pointer">
              Content Search
            </Label>
          </div>
          <span className="text-xs text-muted-foreground">
            {contentSearch ? "Searching file contents..." : "Searching titles only"}
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {!query && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Start typing to search notes</p>
              <p className="text-xs mt-1">
                {contentSearch 
                  ? "Will search both titles and content" 
                  : "Currently searching titles only"}
              </p>
            </div>
          )}

          {query && results.length === 0 && !isSearching && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">
                Try a different search term or enable content search
              </p>
            </div>
          )}

          {results.map((result, index) => (
            <Link
              key={result.path}
              href={`/notes/${result.path}`}
              onClick={close}
              className={`block px-4 py-3 transition-colors border-b last:border-b-0 ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{result.title}</span>
                    {result.matchesContent && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        content
                      </span>
                    )}
                  </div>
                  {result.breadcrumb.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.breadcrumb.join(" / ")}
                    </p>
                  )}
                  {result.preview && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {result.preview}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </div>
          <span>
            {results.length > 0 && `${results.length} result${results.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
