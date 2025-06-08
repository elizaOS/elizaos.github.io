import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";
import {
  GitCommitVertical,
  FileCode,
  ArrowUp,
  ArrowDown,
  Folder,
  Target,
} from "lucide-react";

interface RightSidebarProps {
  metrics: IntervalMetrics;
}

export function RightSidebar({ metrics }: RightSidebarProps) {
  const { codeChanges, focusAreas } = metrics;

  // Calculate percentage for the commit activity bar
  const totalChanges = codeChanges.additions + codeChanges.deletions;
  const additionPercentage =
    totalChanges > 0 ? (codeChanges.additions / totalChanges) * 100 : 50;

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCommitVertical className="h-5 w-5" />
            Code Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Commit Volume Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-medium">
                {codeChanges.commitCount} commits
              </span>
            </div>
            <div className="relative">
              <Progress
                value={additionPercentage}
                className="h-2 bg-red-500/20"
              />
              <div
                className="absolute inset-0 h-2 rounded-full bg-green-500"
                style={{ width: `${additionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>+{codeChanges.additions.toLocaleString()}</span>
              <span>-{codeChanges.deletions.toLocaleString()}</span>
            </div>
          </div>

          {/* Code Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <ArrowUp className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  +{codeChanges.additions.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Added</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <ArrowDown className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  -{codeChanges.deletions.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Deleted</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t pt-2">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {codeChanges.files} files changed
            </span>
          </div>

          {/* Top Files Changed - Scrollable */}
          {metrics.topFilesChanged && metrics.topFilesChanged.length > 0 && (
            <ScrollArea className="h-48">
              <div className="space-y-1.5 pr-2">
                {metrics.topFilesChanged.slice(0, 15).map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className="mr-2 flex-1 truncate font-mono"
                      title={file.path}
                    >
                      {file.path.split("/").pop() || file.path}
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <span className="min-w-0 text-green-600">
                        +{file.additions}
                      </span>
                      <span className="min-w-0 text-red-600">
                        -{file.deletions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Focus Areas */}
      {focusAreas && focusAreas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {focusAreas.slice(0, 8).map((focusArea, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Folder className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm" title={focusArea.area}>
                      {focusArea.area}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-2 flex-shrink-0 text-xs"
                  >
                    {focusArea.count}
                  </Badge>
                </div>
              ))}
              {focusAreas.length > 8 && (
                <div className="border-t pt-2 text-center text-xs text-muted-foreground">
                  +{focusAreas.length - 8} more areas
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
