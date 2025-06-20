import {
  getMetricsForInterval,
  getLatestAvailableDate,
  getIntervalSummaryContent,
  parseIntervalDate,
  getTimelineActivityData, // New import
} from "./queries";
import { notFound } from "next/navigation";
import pipelineConfig from "@/../config/pipeline.config";
import {
  findAdjacentIntervals,
  formatIntervalForPath,
  generateTimeIntervalsForDateRange,
  IntervalType,
  toDateString,
} from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";
import { addDays } from "date-fns";
import { DateNavigation } from "./components/DateNavigation";
import { SummaryContent } from "./components/SummaryContent";
import { StatCardsDisplay } from "./components/StatCardsDisplay";
import { CodeChangesDisplay } from "./components/CodeChangesDisplay";
import { ContributorActivityTimeline } from "./components/ContributorActivityTimeline"; // New import
import { LlmCopyButton } from "@/components/ui/llm-copy-button";
import { IntervalSelector } from "./components/IntervalSelector";

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

  // Add empty date params for each interval (latest)
  intervals.forEach((intervalType) => {
    params.push({ interval: intervalType, date: [] });
  });

  // Generate intervals from contribution start date to latest
  intervals.forEach((intervalType) => {
    const timeIntervals = generateTimeIntervalsForDateRange(intervalType, {
      startDate: pipelineConfig.contributionStartDate,
      endDate: latestDate,
    });

    // Add params for each interval date
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

export default async function IntervalSummaryPage({ params }: PageProps) {
  const { interval: intervalParam, date } = await params;
  const intervalType = ["day", "week", "month"].includes(
    intervalParam as string,
  )
    ? (intervalParam as IntervalType)
    : "day";

  const latestDate = await getLatestAvailableDate();

  try {
    // If no date provided, use the latest date with proper formatting for the interval type
    let targetDate: string;
    if (!date || date.length === 0) {
      // Format the latest date based on interval type
      const latestDateObj = new UTCDate(latestDate);
      if (intervalType === "month") {
        targetDate = `${latestDateObj.getFullYear()}-${String(latestDateObj.getMonth() + 1).padStart(2, "0")}`;
      } else if (intervalType === "week") {
        // Align with generateTimeIntervalsForDateRange: use start of the week (Sunday)
        const startOfWeek = addDays(latestDateObj, -latestDateObj.getUTCDay());
        targetDate = toDateString(startOfWeek);
      } else {
        // 'day'
        // For day, use the latest date directly
        targetDate = latestDate;
      }
    } else {
      targetDate = date[0];
    }

    const parsedInterval = parseIntervalDate(targetDate, intervalType);
    if (!parsedInterval) {
      throw new Error(
        `Invalid date format for ${intervalType} interval. Expected ${intervalType === "month" ? "YYYY-MM" : "YYYY-MM-DD"}`,
      );
    }
    // Find adjacent intervals for navigation
    const { prevDate, nextDate } = findAdjacentIntervals(
      parsedInterval,
      latestDate,
    );

    // Create navigation props
    const navigation = {
      prevDate,
      nextDate,
      currentDate: targetDate,
      intervalType,
    };

    const metrics = await getMetricsForInterval(targetDate, intervalType);

    const summaryContent = await getIntervalSummaryContent(
      targetDate,
      intervalType,
    );
    const timelineData = await getTimelineActivityData(targetDate, intervalType); // New data fetching

    return (
      <div className="container mx-auto px-6 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex flex-col justify-between sm:flex-row">
            <IntervalSelector
              currentInterval={intervalType}
              currentDate={targetDate}
            />

            <LlmCopyButton
              metrics={metrics}
              summaryContent={summaryContent}
              className="self-end sm:self-start"
            />
          </div>
          <DateNavigation {...navigation} />

          <div className="mb-8 space-y-6">
            <StatCardsDisplay metrics={metrics} />
            <ContributorActivityTimeline activityData={timelineData} /> {/* New component instance */}
            <CodeChangesDisplay metrics={metrics} />
          </div>
          <SummaryContent summaryContent={summaryContent} />
        </div>
      </div>
    );
  } catch (e) {
    console.error(`Error fetching ${intervalType} metrics:`, e);
    notFound();
  }
}
