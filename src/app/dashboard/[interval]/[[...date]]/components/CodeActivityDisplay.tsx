"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitCommit,
  LineChart,
  FileText,
  FileDiff,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeChanges {
  additions: number;
  deletions: number;
  files: number;
  commitCount: number;
}

interface FocusArea {
  area: string;
  count: number;
}

interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  totalChanges: number;
}

interface CodeActivityDisplayProps {
  codeChanges: CodeChanges;
  focusAreas: FocusArea[];
  sortedChangedFiles: ChangedFile[];
}

export function CodeActivityDisplay({
  codeChanges,
  focusAreas,
  sortedChangedFiles,
}: CodeActivityDisplayProps) {
  const [showFilesList, setShowFilesList] = useState(false);

  const additions = codeChanges.additions || 0;
  const deletions = codeChanges.deletions || 0;
  const totalChangesForBar = additions + deletions;

  let additionsPercentage = 0;
  let deletionsPercentage = 0;

  if (totalChangesForBar > 0) {
    additionsPercentage = (additions / totalChangesForBar) * 100;
    deletionsPercentage = (deletions / totalChangesForBar) * 100;
  }

  return (
    <Card className="flex h-full max-h-[85vh] flex-col bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center text-sm font-medium">
          <LineChart className="mr-2 h-4 w-4" /> Code Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 overflow-hidden pt-0">
        {/* Code Volume Section */}
        <div>
          <h3 className="text-md mb-2 flex items-center font-semibold">
            <GitCommit className="mr-2 h-4 w-4 text-muted-foreground" /> Volume
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <p>
              Commits:{" "}
              <span className="font-medium">{codeChanges.commitCount}</span>
            </p>
            <p>
              Files Changed:{" "}
              <span className="font-medium">{codeChanges.files}</span>
            </p>
            <p>
              Additions:{" "}
              <span className="font-medium text-green-500">+{additions}</span>
            </p>
            <p>
              Deletions:{" "}
              <span className="font-medium text-red-500">-{deletions}</span>
            </p>
          </div>
          {totalChangesForBar > 0 && (
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                className="bg-green-500"
                style={{ width: `${additionsPercentage}%` }}
              ></div>
              <div
                className="bg-red-500"
                style={{ width: `${deletionsPercentage}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Focus Areas Section */}
        <div className="mt-4 border-t pt-4">
          <h3 className="text-md mb-3 flex items-center font-semibold">
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Focus
            Areas
          </h3>
          {focusAreas.length > 0 ? (
            <ScrollArea className="h-[180px]">
              <ul className="flex h-full flex-col space-y-1 pr-4 text-sm">
                {focusAreas.map((area) => (
                  <li
                    key={area.area}
                    className="flex items-center justify-between rounded-md px-2 py-0.5 hover:bg-muted/50"
                  >
                    <span
                      className="mr-2 block min-w-0 flex-grow overflow-hidden truncate"
                      title={area.area}
                    >
                      {area.area}
                    </span>
                    <span className="flex-shrink-0 text-muted-foreground">
                      ({area.count})
                    </span>
                  </li>
                ))}
                <div style={{ flexGrow: 1 }}></div> {/* Spacer div */}
              </ul>
            </ScrollArea>
          ) : (
            <p className="w-full py-4 text-center text-sm text-muted-foreground">
              No specific focus areas identified.
            </p>
          )}
        </div>

        {/* Files Changed Section - Now collapsible */}
        <div className="mt-4 border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-md flex items-center font-semibold">
              <FileDiff className="mr-2 h-4 w-4 text-muted-foreground" />
              Files Changed ({sortedChangedFiles.length})
            </h3>
            {sortedChangedFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilesList(!showFilesList)}
                className="text-xs"
              >
                {showFilesList ? (
                  <EyeOff className="mr-1 h-3 w-3" />
                ) : (
                  <Eye className="mr-1 h-3 w-3" />
                )}
                {showFilesList ? "Hide" : "View All"}
              </Button>
            )}
          </div>
          {showFilesList && sortedChangedFiles.length > 0 && (
            <ScrollArea className="h-[200px]">
              <ul className="flex h-full flex-col space-y-1 pr-4 text-sm">
                {sortedChangedFiles.map((file) => (
                  <li
                    key={file.path}
                    className="flex items-center justify-between rounded-md px-2 py-0.5 hover:bg-muted/50"
                  >
                    <span
                      className="mr-2 block min-w-0 flex-grow overflow-hidden truncate"
                      title={file.path}
                    >
                      {file.path}
                    </span>
                    <span className="ml-2 flex-shrink-0 text-muted-foreground">
                      ({file.totalChanges} changes)
                    </span>
                  </li>
                ))}
                <div style={{ flexGrow: 1 }}></div>
              </ul>
            </ScrollArea>
          )}
          {!showFilesList && sortedChangedFiles.length > 0 && (
            <p className="pl-6 text-xs text-muted-foreground">
              Expand to see the full list of files changed.
            </p>
          )}
          {sortedChangedFiles.length === 0 && (
            <p className="w-full py-4 text-center text-sm text-muted-foreground">
              No files changed in merged PRs for this period.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
