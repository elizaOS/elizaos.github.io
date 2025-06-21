import React from "react";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  id: string;
  title: string;
  author: string;
  number: number;
  href: string;
  icon: React.ReactNode;
  metadata?: React.ReactNode;
  className?: string;
  allowTitleWrap?: boolean;
}

export function ActivityItem({
  id,
  title,
  author,
  number,
  href,
  icon,
  metadata,
  className,
  allowTitleWrap = false,
}: ActivityItemProps) {
  return (
    <a
      key={id}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-start gap-3 p-4 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4
            className={cn(
              "mr-2 font-medium",
              allowTitleWrap ? "break-words" : "line-clamp-1",
            )}
          >
            {title}
          </h4>
          <div className="flex-shrink-0">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Avatar className="h-4 w-4">
            <AvatarImage
              src={`https://github.com/${author}.png`}
              alt={author}
            />
            <AvatarFallback>{author[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {author} • #{number} {metadata && <> • {metadata}</>}
          </span>
        </div>
      </div>
    </a>
  );
}
