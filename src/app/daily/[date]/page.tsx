import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllDailySummaryDates,
  getDailySummary,
} from "@/lib/get-daily-summaries";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DailySummaryContent } from "@/components/daily-summary-content";

// Define the expected structure of params
interface PageProps {
  params: {
    date: string;
  };
}

// Generate static paths for all dates
export async function generateStaticParams() {
  const dates = await getAllDailySummaryDates();
  return dates.map((date) => ({
    date,
  }));
}

// Main page component
export default async function DailySummaryPage({ params }: PageProps) {
  const [summary, dates] = await Promise.all([
    getDailySummary(params.date),
    getAllDailySummaryDates(),
  ]);

  if (!summary) {
    notFound();
  }

  // Find current date index and adjacent dates
  const currentIndex = dates.indexOf(params.date);
  const prevDate =
    currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? dates[currentIndex - 1] : null;

  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const dateMatch = summary.title.match(/\(([^)]+)\)/);
  const date = dateMatch ? dateMatch[1] : "";

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            asChild
            className={!prevDate ? "invisible" : ""}
          >
            <Link
              href={prevDate ? `/daily/${prevDate}` : "#"}
              className="hidden sm:flex items-center"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous Day</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            asChild
            className={`${!prevDate ? "invisible" : ""} sm:hidden`}
          >
            <Link href={prevDate ? `/daily/${prevDate}` : "#"}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Day</span>
            </Link>
          </Button>

          <time dateTime={date} className="text-md font-bold">
            {date}
          </time>

          <Button
            variant="outline"
            asChild
            className={!nextDate ? "invisible" : ""}
          >
            <Link
              href={nextDate ? `/daily/${nextDate}` : "#"}
              className="hidden sm:flex items-center"
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            asChild
            className={`${!nextDate ? "invisible" : ""} sm:hidden`}
          >
            <Link href={nextDate ? `/daily/${nextDate}` : "#"}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Day</span>
            </Link>
          </Button>
        </div>

        <DailySummaryContent data={summary} />
      </div>
    </div>
  );
}