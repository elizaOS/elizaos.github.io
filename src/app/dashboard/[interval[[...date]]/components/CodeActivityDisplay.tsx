import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, LineChart, FileText, FileDiff } from "lucide-react";

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
  return (
    <Card className="flex h-full max-h-[85vh] flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <LineChart className="mr-2 h-5 w-5" /> Code Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col space-y-4 overflow-hidden pt-0">
        {/* Code Volume Section */}
        <div>
          <h3 className="text-md mb-2 flex items-center font-semibold">
            <GitCommit className="mr-2 h-4 w-4 text-muted-foreground" /> Volume
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <p>
              Commits:{" "}
              <span className="font-medium">{codeChanges.commitCount}</span>
            </p>
            <p>
              Files Changed:{" "}
              <span className="font-medium\">{codeChanges.files}</span>
            </p>
            <p>
              Additions:{" "}
              <span className="text-green-500\\ font-medium">
                +{codeChanges.additions}
              </span>
            </p>
            <p>
              Deletions:{" "}
              <span className="text-red-500\\ font-medium">
                -{codeChanges.deletions}
              </span>
            </p>
          </div>
        </div>

        {/* Focus Areas Section - fixed height ScrollArea */}
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
                    className="flex items-center justify-between"
                  >
                    <span
                      className="mr-2 block min-w-0 flex-grow overflow-hidden truncate"
                      title={area.area}
                    >
                      {area.area}
                    </span>
                    <span className="text-muted-foreground\\ flex-shrink-0">
                      ({area.count})
                    </span>
                  </li>
                ))}
                <div style={{ flexGrow: 1 }}></div> {/* Spacer div */}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No specific focus areas identified.
            </p>
          )}
        </div>

        {/* Files Changed Section - This section's wrapper div will grow */}
        <div className="mt-4 flex min-h-0 flex-grow flex-col border-t pt-4">
          <h3 className="text-md mb-3 flex items-center font-semibold">
            <FileDiff className="mr-2 h-4 w-4 text-muted-foreground" /> Files
            Changed
          </h3>
          {sortedChangedFiles.length > 0 ? (
            <ScrollArea className="min-h-0 flex-grow">
              <ul className="flex h-full flex-col space-y-1 pr-4 text-sm">
                {sortedChangedFiles.map((file) => (
                  <li
                    key={file.path}
                    className="flex items-center justify-between"
                  >
                    <span
                      className="mr-2 block min-w-0 flex-grow overflow-hidden truncate"
                      title={file.path}
                    >
                      {file.path}
                    </span>
                    <span className="ml-2\\ flex-shrink-0 text-muted-foreground">
                      ({file.totalChanges} changes)
                    </span>
                  </li>
                ))}
                <div style={{ flexGrow: 1 }}></div> {/* Spacer div */}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No files changed in merged PRs for this period.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
