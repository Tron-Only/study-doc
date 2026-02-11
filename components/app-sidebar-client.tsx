"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GalleryVerticalEnd, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { NavItem as UtilsNavItem, GitTreeEntry } from "@/lib/utils";
import { fetchRepoTree, buildSidebar } from "@/lib/utils";

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

    if (item.items && item.items.length > 0) {
      return (
        <Collapsible
          key={key}
          defaultOpen={active}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="w-full justify-between">
                <span className="break-words font-medium leading-tight">{item.title}</span>
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub
                className={depth === 0 ? "ml-0 border-l-0 px-1.5" : ""}
              >
                {item.items.map((sub) => {
                  const subKey = `${sub.url || sub.title}-${depth + 1}-${sub.title}`;
                  const subHref = toHref(sub.url);
                  const subActive = itemIsActive(sub, pathname);

                  return (
                    <SidebarMenuSubItem key={subKey}>
                      {sub.items && sub.items.length > 0 ? (
                        <Collapsible
                          defaultOpen={subActive}
                          className="group/collapsible"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton isActive={subActive} className="justify-between">
                              <span className="break-words leading-tight">{sub.title}</span>
                              <ChevronRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-2 border-l-0 px-1.5">
                              {renderNestedItems(sub.items, pathname, depth + 2)}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : subHref ? (
                        <SidebarMenuSubButton asChild isActive={subActive}>
                          <a href={subHref}>{sub.title}</a>
                        </SidebarMenuSubButton>
                      ) : (
                        <div className="text-sidebar-foreground flex min-h-7 min-w-0 -translate-x-px items-start gap-2 rounded-md px-2 py-1 text-sm opacity-60 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
                          <span className="break-words leading-tight">{sub.title}</span>
                        </div>
                      )}
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
        <SidebarMenuItem key={key}>
        {href ? (
          <SidebarMenuButton asChild>
            <a
              href={href}
              className="font-medium"
              aria-current={active ? "page" : undefined}
            >
              {item.title}
            </a>
          </SidebarMenuButton>
        ) : (
          <div className="peer/menu-button flex w-full min-h-8 items-start gap-2 rounded-md p-2 text-left text-sm opacity-60 [&>span]:break-words [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
            <span className="break-words font-medium leading-tight">{item.title}</span>
          </div>
        )}
      </SidebarMenuItem>
    );
  });
}

/**
 * Client-side AppSidebar that loads navigation from localStorage.
 * Falls back to navMain prop (from server) or an empty state.
 *
 * - Emits informative console logs to aid debugging.
 */
export default function AppSidebarClient({
  navMain,
  ...props
}: AppSidebarClientProps) {
  const pathname = usePathname();
  const [nav, setNav] = useState<NavItem[] | undefined>(() => {
    // If initial prop provided, use it immediately to avoid flashing empty UI.
    if (navMain && Array.isArray(navMain) && navMain.length > 0) {
      return navMain;
    }
    return undefined;
  });

  // Load persisted nav from localStorage if we don't already have nav from props.
  // If none is found, attempt to fetch the repo tree using saved repo owner/name
  // and build the sidebar dynamically (persisting it afterward).
  useEffect(() => {
    if (nav && nav.length > 0) return;

    let cancelled = false;

    (async () => {
      // 1) Try to load persisted sidebar from localStorage
      try {
        console.debug(
          "AppSidebarClient: attempting to read persisted sidebar from localStorage",
        );
        const raw = localStorage.getItem("study-doc:sidebar");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // defer to avoid synchronous setState inside effect
            setTimeout(() => {
              if (cancelled) return;
              console.info(
                "AppSidebarClient: loaded persisted sidebar",
                parsed,
              );
              setNav(parsed as NavItem[]);
            }, 0);
            return;
          }
        } else {
          console.debug(
            "AppSidebarClient: no persisted sidebar found in localStorage",
          );
        }
      } catch (e) {
        console.warn("AppSidebarClient: error reading persisted sidebar", e);
      }

      // 2) If no persisted sidebar, try to fetch the repo tree using saved owner/repo
      try {
        const owner = localStorage.getItem("study-doc:repo_owner");
        const repo = localStorage.getItem("study-doc:repo_name");
        if (owner && repo) {
          console.debug(
            "AppSidebarClient: fetching repo tree for",
            owner,
            repo,
          );
          try {
            const tree = await fetchRepoTree(owner, repo);
            if (Array.isArray(tree) && tree.length > 0) {
              const built = buildSidebar(tree as GitTreeEntry[]);
              // persist the built sidebar and set state (deferred)
              try {
                localStorage.setItem(
                  "study-doc:sidebar",
                  JSON.stringify(built),
                );
              } catch {
                // ignore localStorage write errors
              }
              setTimeout(() => {
                if (cancelled) return;
                console.info(
                  "AppSidebarClient: built sidebar from repo",
                  owner,
                  repo,
                );
                setNav(built);
              }, 0);
              return;
            }
          } catch (fetchErr) {
            console.warn("AppSidebarClient: fetchRepoTree failed", fetchErr);
          }
        } else {
          console.debug(
            "AppSidebarClient: no repo_owner/repo_name in localStorage to fetch from",
          );
        }
      } catch (e) {
        console.warn(
          "AppSidebarClient: error while attempting repo fetch/build",
          e,
        );
      }

      // 3) Fall back to the server-provided navMain or empty nav (deferred)
      setTimeout(() => {
        if (cancelled) return;
        if (navMain && Array.isArray(navMain) && navMain.length > 0) {
          console.debug(
            "AppSidebarClient: using navMain provided from server",
            navMain,
          );
          setNav(navMain);
        } else {
          console.debug(
            "AppSidebarClient: no server navMain; setting empty nav",
          );
          setNav([]);
        }
      }, 0);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navMain]);

  // Refresh handler (reads persisted sidebar)
  const refreshFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem("study-doc:sidebar");
      if (!raw) {
        console.debug(
          "AppSidebarClient.refreshFromStorage: no persisted sidebar",
        );
        setNav([]);
        // restore server menu if present
      return;
    }
    const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        console.info(
          "AppSidebarClient.refreshFromStorage: updated nav",
          parsed,
        );
        setNav(parsed as NavItem[]);
      } else {
        setNav([]);
      }
    } catch (err) {
      console.warn(
        "AppSidebarClient.refreshFromStorage: failed to parse persisted sidebar",
        err,
      );
      // ignore parse errors
    }
  }, []);

  // Listen to custom event and storage events to update nav reactively.
  useEffect(() => {
    const onNavUpdated = () => {
      console.info(
        "AppSidebarClient: custom event 'study-doc:nav-updated' received — refreshing sidebar from storage",
      );
      refreshFromStorage();
    };

    const onStorage = (e: StorageEvent) => {
      const key = e.key;
      // Keys that should trigger a refresh of the sidebar
      const triggerKeys = new Set([
        "study-doc:sidebar",
        "study-doc:repo",
        "study-doc:repo_owner",
        "study-doc:repo_name",
      ]);

      if (!key) {
        // storage cleared (e.g. localStorage.clear())
        console.info(
          "AppSidebarClient: storage event with no key (storage cleared) — refreshing sidebar",
        );
        refreshFromStorage();
        return;
      }

      if (triggerKeys.has(key)) {
        console.info(
          `AppSidebarClient: storage event for '${key}' — old='${e.oldValue ?? ""}' new='${e.newValue ?? ""}'`,
        );
        refreshFromStorage();
      } else {
        // Non-related storage key changed; ignore but leave a debug trace.
        console.debug(
          `AppSidebarClient: storage event for unrelated key '${key}' — ignoring`,
        );
      }
    };

    window.addEventListener("study-doc:nav-updated", onNavUpdated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("study-doc:nav-updated", onNavUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshFromStorage]);

  // Ensure we always have some renderable nav
  const renderNav = useMemo(
    () => (nav && nav.length ? nav : [{ title: "Home", url: "/" }]),
    [nav],
  );

  const header = (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <a href="#" className="flex items-center gap-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Study Doc</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );

  return (
    <Sidebar variant="floating" {...props}>
      {header}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {renderNestedItems(renderNav, pathname, 0)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
