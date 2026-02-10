import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

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

import type { NavItem as UtilsNavItem } from "@/lib/utils";

/**
 * Server-rendered AppSidebar
 *
 * - This component is intentionally a server component (no "use client")
 *   and renders only from the `navMain` prop to avoid hydration mismatches.
 * - It does not read from localStorage or use any client hooks/effects.
 *
 * The nav structure is expected to match the shape produced by `buildSidebar`.
 */

export type NavItem = UtilsNavItem;

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navMain: NavItem[];
}

/** Convert repository/file paths into app hrefs. */
function toHref(url?: string) {
  if (!url) return "#";
  if (url.startsWith("/")) return url;
  return `/notes/${url}`;
}

/** Render nested navigation recursively (pure, server-safe). */
function renderNestedItems(items?: NavItem[], depth = 0): React.ReactNode {
  if (!items || items.length === 0) return null;

  return items.map((item) => {
    const key = `${item.url || item.title}-${depth}-${item.title}`;

    if (item.items && item.items.length > 0) {
      return (
        <SidebarMenuItem key={key}>
          <SidebarMenuButton asChild>
            <a href={toHref(item.url)} className="font-medium">
              {item.title}
            </a>
          </SidebarMenuButton>

          <SidebarMenuSub
            className={depth === 0 ? "ml-0 border-l-0 px-1.5" : ""}
          >
            {item.items.map((sub) => {
              const subKey = `${sub.url || sub.title}-${depth + 1}-${sub.title}`;
              return (
                <SidebarMenuSubItem key={subKey}>
                  <SidebarMenuSubButton asChild>
                    <a href={toHref(sub.url)}>{sub.title}</a>
                  </SidebarMenuSubButton>

                  {sub.items && sub.items.length > 0 ? (
                    <SidebarMenuSub className="ml-2 border-l-0 px-1.5">
                      {renderNestedItems(sub.items, depth + 2)}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={key}>
        <SidebarMenuButton asChild>
          <a href={toHref(item.url)} className="font-medium">
            {item.title}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}

/** Server component: purely renders using the navMain prop. */
export function AppSidebar({ navMain, ...props }: AppSidebarProps) {
  const header = (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <a href="#">
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

  // Only render what was passed from the server to keep SSR/CSR consistent.
  const effectiveNav = Array.isArray(navMain) ? navMain : [];

  return (
    <Sidebar variant="floating" {...props}>
      {header}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu id="server-sidebar-menu" className="gap-2">
            {renderNestedItems(effectiveNav, 0)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
