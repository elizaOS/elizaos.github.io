import { DateRange } from "../../types";
import { createStep, RepoPipelineContext } from "../types";
import { IntervalType, TimeInterval } from "../../../date-utils";

/**
 * Creates a pipeline step to generate time intervals for a repository with a specific interval type
 */
export const generateTimeIntervals = <TInput extends Record<string, any>>(
  intervalType: IntervalType
) =>
  createStep<
    TInput,
    Array<TInput & { interval: TimeInterval }>,
    RepoPipelineContext
  >(
    "generateTimeIntervals",
    async (input: TInput, { dateRange, logger }: RepoPipelineContext) => {
      if (!dateRange) {
        throw new Error("dateRange is required for interval generation");
      }
      logger?.info("Generating time intervals", {
        dateRange,
        intervalType,
      });
      const intervals: TimeInterval[] = [];
      const start = new Date(dateRange.startDate);
      const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

      let currentStart = new Date(start);

      // If start and end are the same date, create a single interval
      if (currentStart.getTime() === end.getTime()) {
        const interval: TimeInterval = {
          intervalStart: currentStart,
          intervalEnd: end,
          intervalType,
        };
        intervals.push(interval);
        logger?.info(`Generated single interval`, {
          intervalType,
          dateRange,
          interval,
        });
        return intervals.map((interval) => ({ ...input, interval }));
      }

      while (currentStart < end) {
        let intervalEnd = new Date(currentStart);

        switch (intervalType) {
          case "day":
            intervalEnd.setDate(intervalEnd.getDate() + 1);
            break;

          case "week":
            // Set end to next Sunday (or 7 days if shorter than a week)
            const daysToSunday = 7 - currentStart.getDay();
            intervalEnd.setDate(intervalEnd.getDate() + daysToSunday);
            break;

          case "month":
            // Set to first day of next month
            intervalEnd = new Date(
              currentStart.getFullYear(),
              currentStart.getMonth() + 1,
              1
            );
            break;
        }

        // Don't exceed the overall end date
        if (intervalEnd > end) {
          intervalEnd = new Date(end);
        }

        const interval: TimeInterval = {
          intervalStart: currentStart,
          intervalEnd: intervalEnd,
          intervalType,
        };
        logger?.debug("Generated interval", {
          interval,
        });
        intervals.push(interval);

        // Move to next interval start
        currentStart = new Date(intervalEnd);

        // Break if we've reached the end to prevent infinite loops
        if (currentStart.getTime() >= end.getTime()) {
          break;
        }
      }
      console.log(intervals);

      logger?.info(`Generated ${intervals.length} intervals`, {
        intervalType,
        dateRange,
      });

      const res = intervals.map((interval) => ({ ...input, interval }));

      return res;
    }
  );
