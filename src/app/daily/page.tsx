import { redirect } from "next/navigation";
import { getDailySummary } from "@/lib/get-daily-summary";
import { getAllDailySummaryDates } from "@/lib/get-daily-summaries";

export default async function DailyPage() {
  const [summary, dates] = await Promise.all([
    getDailySummary(),
    getAllDailySummaryDates(),
  ]);

  // Get the current date from the summary title
  const dateMatch = summary.title.match(/\(([^)]+)\)/);
  const currentDate = dateMatch ? dateMatch[1] : dates[0];

  // Redirect to the current date's page
  redirect(`/daily/${currentDate}`);
}