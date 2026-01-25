"use client";

import { Button } from "@/components/ui/button";
import { Eye, FolderGit2 } from "lucide-react";

interface Props {
  tracked: number;
  untracked: number;
}

export function RepoStatsButton({ tracked, untracked }: Props) {
  const handleClick = () => {
    const section = document.getElementById("untracked-repos");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const trigger = section.querySelector("button[data-state]");
        if (
          trigger instanceof HTMLElement &&
          trigger.getAttribute("data-state") === "closed"
        ) {
          trigger.click();
        }
      }, 500);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className="flex items-center gap-3 text-sm"
    >
      <div className="flex items-center gap-1.5">
        <FolderGit2 className="h-4 w-4 text-green-600" />
        <span className="font-medium">{tracked}</span>
        <span className="text-muted-foreground">tracked</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{untracked}</span>
        <span className="text-muted-foreground">other</span>
      </div>
    </Button>
  );
}
