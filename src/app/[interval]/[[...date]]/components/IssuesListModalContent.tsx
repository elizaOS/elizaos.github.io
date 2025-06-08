import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "@/components/activity-item";
import { CheckCircle, CircleDot } from "lucide-react";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";

interface IssuesListModalContentProps {
  issues: IntervalMetrics["topIssues"];
}

export default function IssuesListModalContent({
  issues,
}: IssuesListModalContentProps) {
  return (
    <ScrollArea className="max-h-[80svh]">
      <div className="divide-y px-0">
        {issues.map((issue) => (
          <ActivityItem
            key={issue.id}
            id={issue.id}
            title={issue.title}
            className="px-4"
            author={issue.author}
            number={issue.number}
            href={`https://github.com/${issue.repository}/issues/${issue.number}`}
            allowTitleWrap={true}
            icon={
              issue.state === "closed" || issue.closedAt ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <CircleDot className="h-4 w-4 text-amber-500" />
              )
            }
            metadata={`${issue.commentCount} comments`}
          />
        ))}
        {issues.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No issues to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
