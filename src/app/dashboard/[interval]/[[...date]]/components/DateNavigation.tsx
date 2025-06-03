import {
  IntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";
// IntervalSelector is not used directly in DateNavigation in the original file,
// but NavigationButton is. Let's copy NavigationButton first or ensure its path is correct.
// For now, I'll assume NavigationButton will be copied into the same directory.
import { NavigationButton } from "./NavigationButton"; // Adjusted path

interface DateNavigationProps {
  prevDate: string | null;
  nextDate: string | null;
  currentDate: string;
  intervalType: IntervalType;
}

export function DateNavigation({
  prevDate,
  nextDate,
  currentDate,
  intervalType,
}: DateNavigationProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <NavigationButton
          href={prevDate ? `/dashboard/${intervalType}/${prevDate}` : "#"} // Corrected path for dashboard
          direction="prev"
          isVisible={!!prevDate}
        />

        <div className="flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">
            {getIntervalTypeTitle(intervalType)} Summary
          </div>
          <time dateTime={currentDate} className="text-md font-bold">
            {formatTimeframeTitle(currentDate, intervalType)}
          </time>
        </div>

        <NavigationButton
          href={nextDate ? `/dashboard/${intervalType}/${nextDate}` : "#"} // Corrected path for dashboard
          direction="next"
          isVisible={!!nextDate}
        />
      </div>
    </div>
  );
}
