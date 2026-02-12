"use client";

import { useRepos } from "./repo-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";

interface RepoSwitcherProps {
  onAddRepo?: () => void;
}

export function RepoSwitcher({ onAddRepo }: RepoSwitcherProps) {
  const { repos, activeRepo, setActiveRepo, refreshRepo, isLoading } = useRepos();

  const handleRefresh = async (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    await refreshRepo(repoId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-auto py-2 px-3"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start text-left overflow-hidden">
              <span className="text-sm font-medium truncate w-full">
                {activeRepo ? activeRepo.name : "Select Repository"}
              </span>
              {activeRepo && (
                <span className="text-xs text-muted-foreground truncate w-full">
                  {activeRepo.owner}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 ml-2 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="start" side="bottom">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Repositories
        </DropdownMenuLabel>
        
        {repos.map((repo, index) => (
          <DropdownMenuItem
            key={repo.id}
            onClick={() => setActiveRepo(repo.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground w-4">
                {index + 1}
              </span>
              <span className="truncate flex-1">{repo.name}</span>
            </div>
            
            <div className="flex items-center gap-1">
              {repo.isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={(e) => handleRefresh(e, repo.id)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </DropdownMenuItem>
        ))}
        
        {repos.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No repositories added
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={onAddRepo}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
