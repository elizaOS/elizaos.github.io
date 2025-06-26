"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";
import { GitCommitVertical, FileCode, Target } from "lucide-react";

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

          <Dialog>
            <DialogTrigger asChild>
              <div className="-m-2 cursor-pointer rounded-lg border-t p-2 pt-2 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {codeChanges.files} files changed
                  </span>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Files Changed ({metrics.topFilesChanged?.length || 0} of{" "}
                  {codeChanges.files})
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Sorted by most changes (additions + deletions)
                </p>
              </DialogHeader>
              {metrics.topFilesChanged && metrics.topFilesChanged.length > 0 ? (
                <ScrollArea className="h-[50vh] rounded-md border">
                  <div className="space-y-2 p-2">
                    {metrics.topFilesChanged.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm hover:bg-muted/50"
                      >
                        <span
                          className="mr-2 flex-1 font-mono text-xs"
                          title={file.path}
                        >
                          {file.path}
                        </span>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span className="min-w-0 font-medium text-green-600">
                            +{file.additions}
                          </span>
                          <span className="min-w-0 font-medium text-red-600">
                            -{file.deletions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No file changes to display.
                </p>
              )}
            </DialogContent>
          </Dialog>
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
            <div className="flex flex-wrap gap-2">
              {focusAreas.slice(0, 10).map((focusArea, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="rounded-full text-xs"
                  title={focusArea.area}
                >
                  {focusArea.area}
                </Badge>
              ))}
              {focusAreas.length > 10 && (
                <Badge
                  variant="outline"
                  className="rounded-full text-xs text-muted-foreground"
                >
                  +{focusAreas.length - 10} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
