"use client";

import { useEffect, useState } from "react";
import { useTheme, ThemeToggle, ColorPicker, GrainControls } from "@/components/theme";
import { useRepos } from "@/components/repo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Clock, Sparkles, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types for recent notes
interface RecentNote {
  path: string;
  title: string;
  timestamp: number;
  preview?: string;
}

export default function DashboardPage() {
  const { accentColorRgba, resolvedTheme } = useTheme();
  const { activeRepo } = useRepos();
  const router = useRouter();
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const loadRecentNotes = () => {
      try {
        const savedNotes = localStorage.getItem("study-doc:recent_notes");
        if (savedNotes) {
          setRecentNotes(JSON.parse(savedNotes));
        }
      } catch (e) {
        console.warn("Failed to load recent notes:", e);
      }
    };
    
    // Load recent notes from localStorage
    loadRecentNotes();

    // Listen for updates from markdown-viewer
    const handleNotesUpdated = () => {
      loadRecentNotes();
    };
    window.addEventListener("study-doc:recent-notes-updated", handleNotesUpdated);
    
    return () => {
      window.removeEventListener("study-doc:recent-notes-updated", handleNotesUpdated);
    };
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Study Doc</h1>
            <p className="text-muted-foreground">
              Your personal knowledge hub
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: accentColorRgba }} />
              Welcome Back
            </CardTitle>
            <CardDescription>
              {activeRepo ? (
                <>Currently viewing: <span className="font-medium">{activeRepo.owner}/{activeRepo.name}</span></>
              ) : (
                "No repository configured. Use the startup modal to add one."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("study-doc:open-search"))}>
                <Search className="w-4 h-4 mr-2" />
                Search Notes
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const lastNote = recentNotes[0];
                if (lastNote) {
                  router.push(`/notes/${lastNote.path}`);
                }
              }} disabled={recentNotes.length === 0}>
                <Clock className="w-4 h-4 mr-2" />
                Continue Reading
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Notes
            </CardTitle>
            <CardDescription>Your last 5 viewed notes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotes.length > 0 ? (
              <ul className="space-y-2">
                {recentNotes.slice(0, 5).map((note, index) => {
                  // Display title with spaces instead of URL-encoded characters
                  const displayTitle = decodeURIComponent(note.title).replace(/%20/g, ' ');
                  return (
                    <li key={index}>
                      <Link
                        href={`/notes/${note.path}`}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                        <span className="text-sm truncate flex-1">{displayTitle}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.timestamp).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent notes</p>
                <p className="text-xs mt-1">Start reading to see them here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ColorPicker />
            <GrainControls />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Repository overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {activeRepo?.stats?.fileCount ?? "-"}
                </div>
                <div className="text-xs text-muted-foreground">Notes</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <Folder className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {activeRepo?.stats?.folderCount ?? "-"}
                </div>
                <div className="text-xs text-muted-foreground">Folders</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Keyboard shortcuts and more</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <span className="text-xs text-muted-foreground mr-2">?</span>
                Show Keyboard Shortcuts
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <span className="text-xs text-muted-foreground mr-2">R</span>
                Random Note
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <span className="text-xs text-muted-foreground mr-2">/</span>
                Open Command Palette
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
