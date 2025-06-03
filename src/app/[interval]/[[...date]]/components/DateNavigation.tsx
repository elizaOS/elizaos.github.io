import {
  IntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";
import { NavigationButton } from "./NavigationButton";

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
          href={prevDate ? `/${intervalType}/${prevDate}` : "#"}
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
          href={nextDate ? `/${intervalType}/${nextDate}` : "#"}
          direction="next"
          isVisible={!!nextDate}
        />
      </div>
    </div>
  );
}
