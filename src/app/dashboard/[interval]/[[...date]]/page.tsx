import {
  getMetricsForInterval,
  getLatestAvailableDate,
  getIntervalSummaryContent,
  parseIntervalDate,
  IntervalMetrics, // Import IntervalMetrics type
} from "./queries"; 
import { notFound } from "next/navigation";
import pipelineConfig from "@/../config/pipeline.config";
import {
  findAdjacentIntervals,
  formatIntervalForPath,
  generateTimeIntervalsForDateRange,
  IntervalType,
  toDateString,
  formatTimeframeTitle, // Added import
} from "@/lib/date-utils"; 
import { UTCDate } from "@date-fns/utc";
import { addDays } from "date-fns";

// Import newly copied components:
import { StatCard } from "./components/StatCard";
import { SummaryContent } from "./components/SummaryContent";
import { IntervalSelector } from "./components/IntervalSelector";
import { DateNavigation } from "./components/DateNavigation";
import ContributorsListModalContent from "./components/ContributorsListModalContent";
import PullRequestsListModalContent from "./components/PullRequestsListModalContent";
import IssuesListModalContent from "./components/IssuesListModalContent";
import { CounterWithIcon } from "./components/CounterWithIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LlmCopyButton } from "@/components/ui/llm-copy-button";
import { Users, GitPullRequest, MessageCircleWarning, CircleDot, GitMerge, CheckCircle } from "lucide-react";

interface PageProps {
  params: Promise<{
    interval: string;
    date?: string[];
  }>;
}

interface StaticParam {
  interval: string;
  date?: string[];
}

export async function generateStaticParams(): Promise<StaticParam[]> {
  const latestDate = await getLatestAvailableDate();
  const intervals: IntervalType[] = ["day", "week", "month"];
  const params: StaticParam[] = [];

  intervals.forEach((intervalType) => {
    params.push({ interval: intervalType, date: [] });
  });

  intervals.forEach((intervalType) => {
    const timeIntervals = generateTimeIntervalsForDateRange(intervalType, {
      startDate: pipelineConfig.contributionStartDate,
      endDate: latestDate,
    });
    timeIntervals.forEach((interval) => {
      const dateParam = formatIntervalForPath(interval);
      params.push({
        interval: intervalType,
        date: dateParam,
      });
    });
  });
  return params;
}

export default async function DashboardPage({ params }: PageProps) {
  const { interval: intervalParam, date } = await params;
  const intervalType = ["day", "week", "month"].includes(
    intervalParam as string,
  )
    ? (intervalParam as IntervalType)
    : "day";

  const latestDate = await getLatestAvailableDate();

  try {
    let targetDate: string;
    if (!date || date.length === 0) {
      const latestDateObj = new UTCDate(latestDate);
      if (intervalType === "month") {
        targetDate = `${latestDateObj.getFullYear()}-${String(latestDateObj.getMonth() + 1).padStart(2, "0")}`;
      } else if (intervalType === "week") {
        const startOfWeek = addDays(latestDateObj, -latestDateObj.getUTCDay()); // Ensure Sunday is day 0 for getUTCDay
        targetDate = toDateString(startOfWeek);
      } else {
        targetDate = latestDate;
      }
    } else {
      targetDate = date[0];
      if (intervalType === "month" && date.length > 1) { // Handle YYYY/MM for month
        targetDate = `${date[0]}-${date[1]}`;
      } else if (intervalType === "week" && date.length > 2) { // Handle YYYY/MM/DD for week
         targetDate = `${date[0]}-${date[1]}-${date[2]}`;
      }
    }
    
    const parsedInterval = parseIntervalDate(targetDate, intervalType);
    if (!parsedInterval) {
      // Try to construct from array if it's a multi-part date like for week/month from URL
      if (date && date.length > 0) {
        let reconstructedDate = date[0];
        if (intervalType === "month" && date.length > 1) reconstructedDate = `${date[0]}-${date[1]}`;
        else if (intervalType === "week" && date.length === 3) reconstructedDate = `${date[0]}-${date[1]}-${date[2]}`;
        
        const reparsed = parseIntervalDate(reconstructedDate, intervalType);
        if (!reparsed) {
           throw new Error(
            `Invalid date format for ${intervalType} interval. Expected ${intervalType === "month" ? "YYYY-MM" : "YYYY-MM-DD"} after attempting reconstruction. Received: ${date.join('/')}`
          );
        }
        // If reparsed is successful, we can proceed with 'reconstructedDate' and 'reparsed'
        targetDate = reconstructedDate; // Update targetDate
      } else {
        throw new Error(
          `Invalid date format for ${intervalType} interval. Expected ${intervalType === "month" ? "YYYY-MM" : "YYYY-MM-DD"}. Received: ${targetDate}`
        );
      }
    }
    
    // Re-parse after potential reconstruction to ensure parsedInterval is always set if no error.
    const finalParsedInterval = parseIntervalDate(targetDate, intervalType)!;

    const { prevDate, nextDate } = findAdjacentIntervals(
      finalParsedInterval,
      latestDate,
    );

    const navigation = {
      prevDate: prevDate ? formatIntervalForPath(prevDate) : null,
      nextDate: nextDate ? formatIntervalForPath(nextDate) : null,
      currentDate: targetDate, // targetDate should be in the correct string format for the path
      intervalType,
    };
    
    const metrics: IntervalMetrics = await getMetricsForInterval(targetDate, intervalType);
    const summaryMarkdown = await getIntervalSummaryContent(
      targetDate,
      intervalType,
    );
    const timeframeTitle = formatTimeframeTitle(metrics.interval.intervalStart, metrics.interval.intervalType);

    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <IntervalSelector
            currentInterval={intervalType}
            currentDate={targetDate} // Pass the string date
          />
          <LlmCopyButton
            metrics={metrics}
            summaryContent={summaryMarkdown} // Pass the markdown string
            className="self-end sm:self-start"
          />
        </div>

        <DateNavigation {...navigation} />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Column 1: Stats Cards */}
          <div className="space-y-6 lg:col-span-1">
            <StatCard
              title="Contributors"
              icon={Users}
              modalTitle="Active Contributors"
              modalDescription={timeframeTitle}
              modalContent={
                <ContributorsListModalContent
                  contributors={metrics.topContributors}
                />
              }
            >
              <div className="flex w-full items-center justify-between">
                <div className="text-3xl font-bold">{metrics.activeContributors}</div>
                <div className="flex -space-x-2">
                  {metrics.topContributors
                    .slice(0, 3)
                    .map((contributor) => (
                      <Avatar
                        key={contributor.username}
                        className="h-8 w-8 border-2 border-background"
                      >
                        <AvatarImage
                          src={`https://github.com/${contributor.username}.png`}
                          alt={contributor.username}
                        />
                        <AvatarFallback>
                          {contributor.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  {metrics.topContributors.length > 3 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                      +{metrics.topContributors.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </StatCard>

            <StatCard
              title="Pull Requests"
              icon={GitPullRequest}
              bgColor="bg-blue-500/10 group-hover:bg-blue-500/20"
              modalTitle="Top Pull Requests"
              modalDescription={timeframeTitle}
              modalContent={
                <PullRequestsListModalContent
                  pullRequests={metrics.topPullRequests}
                />
              }
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{metrics.pullRequests.total}</div>
                <div className="flex flex-col space-y-1">
                  <CounterWithIcon
                    icon={CircleDot}
                    label="New"
                    value={metrics.pullRequests.new}
                    iconClassName="text-green-500"
                  />
                  <CounterWithIcon
                    icon={GitMerge}
                    label="Merged"
                    value={metrics.pullRequests.merged}
                    iconClassName="text-purple-500"
                  />
                </div>
              </div>
            </StatCard>

            <StatCard
              title="Issues"
              icon={MessageCircleWarning}
              bgColor="bg-amber-500/10 group-hover:bg-amber-500/20"
              modalTitle="Top Issues"
              modalDescription={timeframeTitle}
              modalContent={<IssuesListModalContent issues={metrics.topIssues} />}
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{metrics.issues.total}</div>
                <div className="flex flex-col space-y-1">
                  <CounterWithIcon
                    icon={CircleDot}
                    label="New"
                    value={metrics.issues.new}
                    iconClassName="text-amber-500"
                  />
                  <CounterWithIcon
                    icon={CheckCircle}
                    label="Closed"
                    value={metrics.issues.closed}
                    iconClassName="text-green-500"
                  />
                </div>
              </div>
            </StatCard>
          </div>

          {/* Column 2: Summary Content */}
          <div className="lg:col-span-2">
            <SummaryContent summaryContent={summaryMarkdown} />
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.error(`Error fetching ${intervalType} metrics for dashboard:`, e);
    notFound();
  }
}
