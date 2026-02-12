"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { buildSidebar, type GitTreeEntry, type NavItem } from "@/lib/utils";

export interface Repo {
  id: string;
  owner: string;
  name: string;
  url: string;
  addedAt: number;
  isActive: boolean;
  sidebar?: NavItem[];
  stats?: {
    fileCount: number;
    folderCount: number;
    lastFetched: number;
  };
}

interface RepoContextType {
  repos: Repo[];
  activeRepo: Repo | null;
  addRepo: (owner: string, name: string, url: string) => Promise<void>;
  removeRepo: (id: string) => void;
  setActiveRepo: (id: string) => void;
  refreshRepo: (id: string) => Promise<void>;
  isLoading: boolean;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

const STORAGE_KEYS = {
  repos: "study-doc:repos",
  activeRepoId: "study-doc:active_repo_id",
};

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepo, setActiveRepoState] = useState<Repo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load repos from localStorage on mount
  useEffect(() => {
    try {
      const savedRepos = localStorage.getItem(STORAGE_KEYS.repos);
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.activeRepoId);
      
      if (savedRepos) {
        const parsedRepos = JSON.parse(savedRepos) as Repo[];
        setRepos(parsedRepos);
        
        if (savedActiveId) {
          const active = parsedRepos.find(r => r.id === savedActiveId);
          if (active) {
            setActiveRepoState(active);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load repos:", e);
    }
  }, []);

  // Persist repos to localStorage
  const persistRepos = useCallback((newRepos: Repo[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(newRepos));
    } catch (e) {
      console.warn("Failed to save repos:", e);
    }
  }, []);

  const addRepo = useCallback(async (owner: string, name: string, url: string) => {
    setIsLoading(true);
    try {
      // Import dynamically to avoid server-side issues
      const { fetchRepoTree } = await import("@/lib/utils");
      
      const tree = await fetchRepoTree(owner, name);
      const sidebar = buildSidebar(tree as GitTreeEntry[]);
      
      // Calculate stats
      const files = tree.filter((entry: GitTreeEntry) => entry.type === "blob" && entry.path.endsWith(".md"));
      const folders = tree.filter((entry: GitTreeEntry) => entry.type === "tree");
      
      const newRepo: Repo = {
        id: `${owner}/${name}`,
        owner,
        name,
        url,
        addedAt: Date.now(),
        isActive: true,
        sidebar,
        stats: {
          fileCount: files.length,
          folderCount: folders.length,
          lastFetched: Date.now(),
        },
      };

      setRepos(prev => {
        // Deactivate all other repos
        const updated = prev.map(r => ({ ...r, isActive: false }));
        // Remove if already exists, then add new
        const filtered = updated.filter(r => r.id !== newRepo.id);
        const newRepos = [...filtered, newRepo];
        persistRepos(newRepos);
        return newRepos;
      });
      
      setActiveRepoState(newRepo);
      localStorage.setItem(STORAGE_KEYS.activeRepoId, newRepo.id);
      
      // Also save sidebar for compatibility with existing code
      localStorage.setItem("study-doc:sidebar", JSON.stringify(sidebar));
      localStorage.setItem("study-doc:repo_owner", owner);
      localStorage.setItem("study-doc:repo_name", name);
      localStorage.setItem("study-doc:repo", url);
      
    } finally {
      setIsLoading(false);
    }
  }, [persistRepos]);

  const removeRepo = useCallback((id: string) => {
    setRepos(prev => {
      const newRepos = prev.filter(r => r.id !== id);
      persistRepos(newRepos);
      
      // If we removed the active repo, activate another one
      if (activeRepo?.id === id && newRepos.length > 0) {
        const newActive = newRepos[newRepos.length - 1];
        setActiveRepoState(newActive);
        localStorage.setItem(STORAGE_KEYS.activeRepoId, newActive.id);
      } else if (newRepos.length === 0) {
        setActiveRepoState(null);
        localStorage.removeItem(STORAGE_KEYS.activeRepoId);
      }
      
      return newRepos;
    });
  }, [activeRepo, persistRepos]);

  const setActiveRepo = useCallback((id: string) => {
    setRepos(prev => {
      const newRepos = prev.map(r => ({
        ...r,
        isActive: r.id === id,
      }));
      persistRepos(newRepos);
      
      const active = newRepos.find(r => r.id === id);
      if (active) {
        setActiveRepoState(active);
        localStorage.setItem(STORAGE_KEYS.activeRepoId, id);
        
        // Update legacy localStorage for compatibility
        localStorage.setItem("study-doc:sidebar", JSON.stringify(active.sidebar || []));
        localStorage.setItem("study-doc:repo_owner", active.owner);
        localStorage.setItem("study-doc:repo_name", active.name);
        localStorage.setItem("study-doc:repo", active.url);
        
        // Notify sidebar to refresh
        window.dispatchEvent(new CustomEvent("study-doc:nav-updated"));
      }
      
      return newRepos;
    });
  }, [persistRepos]);

  const refreshRepo = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const repo = repos.find(r => r.id === id);
      if (!repo) return;

      const { fetchRepoTree } = await import("@/lib/utils");
      const tree = await fetchRepoTree(repo.owner, repo.name);
      const sidebar = buildSidebar(tree as GitTreeEntry[]);
      
      const files = tree.filter((entry: GitTreeEntry) => entry.type === "blob" && entry.path.endsWith(".md"));
      const folders = tree.filter((entry: GitTreeEntry) => entry.type === "tree");

      setRepos(prev => {
        const newRepos = prev.map(r => 
          r.id === id 
            ? {
                ...r,
                sidebar,
                stats: {
                  fileCount: files.length,
                  folderCount: folders.length,
                  lastFetched: Date.now(),
                },
              }
            : r
        );
        persistRepos(newRepos);
        
        // Update active repo if needed
        if (activeRepo?.id === id) {
          const updated = newRepos.find(r => r.id === id);
          if (updated) {
            setActiveRepoState(updated);
            localStorage.setItem("study-doc:sidebar", JSON.stringify(sidebar));
          }
        }
        
        return newRepos;
      });
    } finally {
      setIsLoading(false);
    }
  }, [repos, activeRepo, persistRepos]);

  const value: RepoContextType = {
    repos,
    activeRepo,
    addRepo,
    removeRepo,
    setActiveRepo,
    refreshRepo,
    isLoading,
  };

  return (
    <RepoContext.Provider value={value}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepos() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useRepos must be used within a RepoProvider");
  }
  return context;
}
