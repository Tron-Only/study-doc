import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./sidebar.css";
import AppSidebarClient from "@/components/app-sidebar-client";
import StartupModal from "@/components/startup-modal";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GrainTextureOverlay } from "@/components/theme/grain-overlay";
import { RepoProvider } from "@/components/repo/repo-provider";
import { CommandPaletteProvider } from "@/components/command-palette";
import { SearchModal } from "@/components/search";
import { ShortcutsModal } from "@/components/shortcuts";
import type { ReactNode } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Study Doc",
  description: "A platform for sharing and collaborating on study materials.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Modal open state is managed inside the client `StartupModal` component.

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <ThemeProvider>
          <RepoProvider>
            <CommandPaletteProvider>
              {/* Grain texture overlay - only visible when enabled */}
              <GrainTextureOverlay />
              
              {/* Search Modal - can be opened from command palette */}
              <SearchModal />
              
              {/* Keyboard Shortcuts Modal */}
              <ShortcutsModal />
              
              {/* Client startup modal rendered on every page load (blocks interaction) */}
              <StartupModal />

              <SidebarProvider>
                <AppSidebarClient />
                <SidebarInset>
                  <div className="flex flex-1 flex-col">{children}</div>
                </SidebarInset>
              </SidebarProvider>
            </CommandPaletteProvider>
          </RepoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
