import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "@/components/activity-item";
import { GitMerge, CircleDot } from "lucide-react";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";

interface PullRequestsListModalContentProps {
  pullRequests: IntervalMetrics["topPullRequests"];
}

export default function PullRequestsListModalContent({
  pullRequests,
}: PullRequestsListModalContentProps) {
  return (
    <ScrollArea className="max-h-[80svh]">
      <div className="divide-y">
        {pullRequests.map((pr) => (
          <ActivityItem
            key={pr.id}
            id={pr.id}
            title={pr.title}
            author={pr.author}
            className="px-4"
            number={pr.number}
            href={`https://github.com/${pr.repository}/pull/${pr.number}`}
            allowTitleWrap={true}
            icon={
              pr.mergedAt ? (
                <GitMerge className="h-4 w-4 text-purple-500" />
              ) : (
                <CircleDot className="h-4 w-4 text-green-500" />
              )
            }
          />
        ))}
        {pullRequests.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No pull requests to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
