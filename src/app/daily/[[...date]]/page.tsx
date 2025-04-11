import { DailySummaryContent } from "@/components/daily-summary-content";
import { DateNavigation, DailyMetricsDisplay } from "./components";
import { getDailySummaryData, fetchDateData } from "./utils";
import { getDailyMetrics } from "./queries";

interface PageProps {
  params: Promise<{
    date?: string[];
  }>;
}

export async function generateStaticParams() {
  const { allDates } = await fetchDateData();

  return [
    { date: [] }, // For /daily
    ...allDates.map((date) => ({
      date: [date], // For /daily/[date]
    })),
  ];
}

export default async function DailySummaryPage({ params }: PageProps) {
  const { date } = await params;
  const targetDate = date?.[0];
  const { summary, navigation } = await getDailySummaryData(targetDate);

  // Fetch daily metrics for the current date
  const dailyMetrics = await getDailyMetrics(navigation.currentDate);

  return (
    <div className="container mx-auto px-6 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <DateNavigation {...navigation} />

        {/* Display the daily metrics */}
        <div className="mb-8">
          <DailyMetricsDisplay metrics={dailyMetrics} />
        </div>

        {/* Display the daily summary */}
        <DailySummaryContent data={summary} />
      </div>
    </div>
  );
}
