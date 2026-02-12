"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, FileText, PanelLeftClose, PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { NavItem as UtilsNavItem, GitTreeEntry } from "@/lib/utils";
import { fetchRepoTree, buildSidebar } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type NavItem = UtilsNavItem;

export interface AppSidebarClientProps extends React.ComponentProps<
  typeof Sidebar
> {
  /**
   * Optionally provide initial navigation from the server.
   * If omitted, the component will try to read persisted nav from localStorage.
   */
  navMain?: NavItem[] | null;
}

/** Check if a URL is a markdown file that should be clickable. */
function isMarkdownFile(url?: string): boolean {
  if (!url) return false;
  return url.endsWith(".md");
}

/** Convert repository/file paths into app hrefs. Only markdown files get links. */
function toHref(url?: string): string | undefined {
  if (!url || !isMarkdownFile(url)) return undefined;
  if (url.startsWith("/")) return url;
  return `/notes/${url}`;
}

/** Determines whether item (or any of its descendants) matches the current pathname */
function itemIsActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  const href = toHref(item.url);
  if (href === pathname) return true;
  if (item.items) {
    return item.items.some((child) => itemIsActive(child, pathname));
  }
  return false;
}

/** Skeleton loading component */
function SidebarSkeleton() {
  // Fixed widths to avoid hydration mismatch
  const skeletonWidths = ['65%', '75%', '70%', '73%', '68%', '82%', '72%', '88%'];
  
  return (
    <div className="sidebar-skeleton">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton-item" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="skeleton-icon" />
          <div className="skeleton-text" style={{ width: skeletonWidths[i] }} />
        </div>
      ))}
    </div>
  );
}

/** Render nested items recursively with collapsible dropdowns. */
function renderNestedItems(
  items: NavItem[] | undefined,
  pathname: string | null,
  depth = 0,
): React.ReactNode {
  if (!items || items.length === 0) return null;

  return items.map((item) => {
    const key = `${item.url || item.title}-${depth}-${item.title}`;
    const href = toHref(item.url);
    const active = itemIsActive(item, pathname);
    const isFolder = item.items && item.items.length > 0;

    if (isFolder) {
      return (
        <Collapsible
          key={key}
          defaultOpen={active}
          className="sidebar-folder"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <button className="sidebar-folder-trigger">
                <Folder className="sidebar-icon" size={16} />
                <span className="sidebar-item-text">{item.title}</span>
                <ChevronRight className="sidebar-chevron" size={14} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className={depth === 0 ? "sidebar-sub-root" : "sidebar-sub-nested"}>
                {renderNestedItems(item.items, pathname, depth + 1)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={key}>
        {href ? (
          <a
            href={href}
            className={`sidebar-file-link ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <FileText className="sidebar-icon" size={16} />
            <span className="sidebar-item-text">{item.title}</span>
          </a>
        ) : (
          <div className="sidebar-folder-label">
            <Folder className="sidebar-icon" size={16} />
            <span className="sidebar-item-text">{item.title}</span>
          </div>
        )}
      </SidebarMenuItem>
    );
  });
}

/** Collapse button component */
function SidebarCollapseButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="sidebar-collapse-button"
      aria-label="Toggle sidebar"
    >
      <PanelLeftClose size={18} />
    </Button>
  );
}

/** Floating trigger when sidebar is collapsed */
function FloatingTrigger() {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="floating-sidebar-trigger"
      aria-label="Open sidebar"
    >
      <PanelLeft size={20} />
    </Button>
  );
}

/**
 * Client-side AppSidebar that loads navigation from localStorage.
 * Falls back to navMain prop (from server) or an empty state.
 */
export default function AppSidebarClient({
  navMain,
  ...props
}: AppSidebarClientProps) {
  const pathname = usePathname();
  const [nav, setNav] = useState<NavItem[] | undefined>(() => {
    if (navMain && Array.isArray(navMain) && navMain.length > 0) {
      return navMain;
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted nav from localStorage
  useEffect(() => {
    if (nav && nav.length > 0) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // 1) Try to load persisted sidebar from localStorage
      try {
        const raw = localStorage.getItem("study-doc:sidebar");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setTimeout(() => {
              if (cancelled) return;
              setNav(parsed as NavItem[]);
              setIsLoading(false);
            }, 0);
            return;
          }
        }
      } catch (e) {
        console.warn("AppSidebarClient: error reading persisted sidebar", e);
      }

      // 2) If no persisted sidebar, try to fetch the repo tree
      try {
        const owner = localStorage.getItem("study-doc:repo_owner");
        const repo = localStorage.getItem("study-doc:repo_name");
        if (owner && repo) {
          try {
            const tree = await fetchRepoTree(owner, repo);
            if (Array.isArray(tree) && tree.length > 0) {
              const built = buildSidebar(tree as GitTreeEntry[]);
              try {
                localStorage.setItem("study-doc:sidebar", JSON.stringify(built));
              } catch {
                // ignore localStorage write errors
              }
              setTimeout(() => {
                if (cancelled) return;
                setNav(built);
                setIsLoading(false);
              }, 0);
              return;
            }
          } catch (fetchErr) {
            console.warn("AppSidebarClient: fetchRepoTree failed", fetchErr);
          }
        }
      } catch (e) {
        console.warn("AppSidebarClient: error while attempting repo fetch/build", e);
      }

      // 3) Fall back to navMain or empty nav
      setTimeout(() => {
        if (cancelled) return;
        if (navMain && Array.isArray(navMain) && navMain.length > 0) {
          setNav(navMain);
        } else {
          setNav([]);
        }
        setIsLoading(false);
      }, 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [navMain, nav]);

  // Refresh handler (reads persisted sidebar)
  const refreshFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem("study-doc:sidebar");
      if (!raw) {
        setNav([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setNav(parsed as NavItem[]);
      } else {
        setNav([]);
      }
    } catch (err) {
      console.warn("AppSidebarClient.refreshFromStorage: failed to parse persisted sidebar", err);
    }
  }, []);

  // Listen to custom event and storage events
  useEffect(() => {
    const onNavUpdated = () => {
      refreshFromStorage();
    };

    const onStorage = (e: StorageEvent) => {
      const key = e.key;
      const triggerKeys = new Set([
        "study-doc:sidebar",
        "study-doc:repo",
        "study-doc:repo_owner",
        "study-doc:repo_name",
      ]);

      if (!key) {
        refreshFromStorage();
        return;
      }

      if (triggerKeys.has(key)) {
        refreshFromStorage();
      }
    };

    window.addEventListener("study-doc:nav-updated", onNavUpdated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("study-doc:nav-updated", onNavUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshFromStorage]);

  const renderNav = useMemo(
    () => (nav && nav.length ? nav : []),
    [nav],
  );

  return (
    <>
      <Sidebar className="minimal-sidebar" {...props}>
        <SidebarContent>
          <SidebarGroup>
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <SidebarMenu className="sidebar-menu">
                {renderNestedItems(renderNav, pathname, 0)}
              </SidebarMenu>
            )}
          </SidebarGroup>
        </SidebarContent>
        
        {/* Collapse button at bottom */}
        <div className="sidebar-footer">
          <SidebarCollapseButton />
        </div>
      </Sidebar>
      
      {/* Floating trigger when collapsed */}
      <FloatingTrigger />
    </>
  );
}
