import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyMetrics } from "./queries";

interface NavigationButtonProps {
  href: string;
  direction: "prev" | "next";
  isVisible: boolean;
}

function NavigationButton({
  href,
  direction,
  isVisible,
}: NavigationButtonProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous Day" : "Next Day";

  return (
    <>
      {/* Desktop */}
      <Button
        variant="outline"
        asChild
        className={cn("hidden items-center sm:flex", !isVisible && "invisible")}
      >
        <Link href={href}>
          {direction === "prev" && <Icon className="mr-2 h-4 w-4" />}
          <span>{label}</span>
          {direction === "next" && <Icon className="ml-2 h-4 w-4" />}
        </Link>
      </Button>

      {/* Mobile */}
      <Button
        variant="outline"
        size="icon"
        asChild
        className={cn("sm:hidden", !isVisible && "invisible")}
      >
        <Link href={href}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Link>
      </Button>
    </>
  );
}

interface DateNavigationProps {
  prevDate: string | null;
  nextDate: string | null;
  currentDate: string;
}

export function DateNavigation({
  prevDate,
  nextDate,
  currentDate,
}: DateNavigationProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <NavigationButton
        href={prevDate ? `/daily/${prevDate}` : "#"}
        direction="prev"
        isVisible={!!prevDate}
      />

      <time dateTime={currentDate} className="text-md font-bold">
        {currentDate}
      </time>

      <NavigationButton
        href={nextDate ? `/daily/${nextDate}` : "#"}
        direction="next"
        isVisible={!!nextDate}
      />
    </div>
  );
}

/**
 * Component to display the daily metrics in a structured layout
 */
export function DailyMetricsDisplay({ metrics }: { metrics: DailyMetrics }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Summary</CardTitle>
          <CardDescription>Statistics for {metrics.date}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Pull Requests */}
            <div className="rounded-lg border p-3">
              <h3 className="text-sm font-medium">Pull Requests</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.pullRequests.new}
                  </div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.pullRequests.merged}
                  </div>
                  <div className="text-xs text-muted-foreground">Merged</div>
                </div>
              </div>
            </div>

            {/* Issues */}
            <div className="rounded-lg border p-3">
              <h3 className="text-sm font-medium">Issues</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-2xl font-bold">{metrics.issues.new}</div>
                  <div className="text-xs text-muted-foreground">Opened</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.issues.closed}
                  </div>
                  <div className="text-xs text-muted-foreground">Closed</div>
                </div>
              </div>
            </div>

            {/* Contributors */}
            <div className="rounded-lg border p-3">
              <h3 className="text-sm font-medium">Contributors</h3>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {metrics.activeContributors}
                </div>
                <div className="text-xs text-muted-foreground">
                  Active contributors
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Code Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Code Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  +{metrics.codeChanges.additions}
                </div>
                <div className="text-xs text-muted-foreground">Additions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  -{metrics.codeChanges.deletions}
                </div>
                <div className="text-xs text-muted-foreground">Deletions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metrics.codeChanges.files}
                </div>
                <div className="text-xs text-muted-foreground">
                  Files changed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metrics.codeChanges.commits}
                </div>
                <div className="text-xs text-muted-foreground">Commits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Community Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {metrics.comments.prComments}
                </div>
                <div className="text-xs text-muted-foreground">PR Comments</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metrics.comments.issueComments}
                </div>
                <div className="text-xs text-muted-foreground">
                  Issue Comments
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metrics.comments.reviews}
                </div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="text-3xl font-bold">{metrics.totalActivity}</div>
              <div className="text-sm text-muted-foreground">
                Total Activity
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
