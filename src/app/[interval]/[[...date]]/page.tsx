import {
  getMetricsForInterval,
  getLatestAvailableDate,
  getIntervalSummaryContent,
  parseIntervalDate,
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
import { LlmCopyButton } from "@/components/ui/llm-copy-button";
import { IntervalSelector } from "./components/IntervalSelector";
import { LeftSidebar } from "./components/LeftSidebar";
import { MainContent } from "./components/MainContent";
import { RightSidebar } from "./components/RightSidebar";

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

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="w-full max-w-none">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:gap-4 md:gap-0">
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

            <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-[300px_1fr] md:gap-8 lg:grid-cols-[280px_1fr_300px] xl:grid-cols-[320px_1fr_360px] 2xl:grid-cols-[360px_1fr_400px]">
              {/* LEFT SIDEBAR */}
              <div className="space-y-4 md:space-y-6">
                <LeftSidebar metrics={metrics} />
              </div>

              {/* MAIN CONTENT */}
              <div className="min-w-0 md:order-last lg:order-none">
                <MainContent
                  metrics={metrics}
                  summaryContent={summaryContent}
                />
              </div>

              {/* RIGHT SIDEBAR - Hidden on md, shown on lg+ */}
              <div className="hidden space-y-4 lg:block lg:space-y-6">
                <RightSidebar metrics={metrics} />
              </div>
            </div>

            {/* RIGHT SIDEBAR CONTENT FOR TABLET (md) - Shown below main content */}
            <div className="mt-8 block lg:hidden">
              <div className="space-y-6">
                <RightSidebar metrics={metrics} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.error(`Error fetching ${intervalType} metrics:`, e);
    notFound();
  }
}
