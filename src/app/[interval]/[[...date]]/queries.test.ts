import { getTimelineActivityData } from "./queries";
import { db } from "@/lib/data/db"; // To be mocked
import { IntervalType, TimelineActivityData, ContributorActivityHour } from "@/lib/data/types";
import { UTCDate } from "@date-fns/utc";

// Mock the db module
jest.mock("@/lib/data/db", () => ({
  db: {
    execute: jest.fn(),
  },
}));

// Create a typed mock variable for db.execute
const mockDbExecute = db.execute as jest.Mock;

// Helper to create ISO strings for specific hours on a given date
const createISOTimestamp = (date: string, hour: number, minute: number = 0, second: number = 0): string => {
  const d = new UTCDate(date);
  d.setUTCHours(hour, minute, second, 0);
  return d.toISOString();
};

describe("getTimelineActivityData", () => {
  const targetDate = "2023-10-26";
  const intervalType: IntervalType = "day";

  beforeEach(() => {
    // Clear any previous mock usage and implementations
    mockDbExecute.mockClear();
  });

  test("should return an empty array if there is no activity", async () => {
    mockDbExecute.mockResolvedValueOnce([]); // Simulate empty result from DB
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toEqual([]);
    expect(mockDbExecute).toHaveBeenCalledTimes(1);
  });

  test("should return single activity for single contributor, single hour", async () => {
    const mockActivity = [
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 10) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivity);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ login: "userA", avatarUrl: "urlA", hour: 10 });
  });

  test("should aggregate multiple activities for a single contributor in the same hour", async () => {
    const mockActivities = [
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 10, 5) },
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 10, 30) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivities);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ login: "userA", avatarUrl: "urlA", hour: 10 });
  });

  test("should return multiple activities for a single contributor in different hours", async () => {
    const mockActivities = [
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 10) },
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 12) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivities);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ login: "userA", avatarUrl: "urlA", hour: 10 });
    expect(result).toContainEqual({ login: "userA", avatarUrl: "urlA", hour: 12 });
  });

  test("should return activities for multiple contributors in the same hour", async () => {
    const mockActivities = [
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 14) },
      { login: "userB", avatarUrl: "urlB", activityTime: createISOTimestamp(targetDate, 14) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivities);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ login: "userA", avatarUrl: "urlA", hour: 14 });
    expect(result).toContainEqual({ login: "userB", avatarUrl: "urlB", hour: 14 });
  });

  test("should handle multiple contributors and multiple hours correctly", async () => {
    const mockActivities = [
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 9) },
      { login: "userB", avatarUrl: "urlB", activityTime: createISOTimestamp(targetDate, 9) },
      { login: "userA", avatarUrl: "urlA", activityTime: createISOTimestamp(targetDate, 15) },
      { login: "userC", avatarUrl: "urlC", activityTime: createISOTimestamp(targetDate, 20) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivities);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(4); // userA (9), userB (9), userA (15), userC (20)
    expect(result).toContainEqual({ login: "userA", avatarUrl: "urlA", hour: 9 });
    expect(result).toContainEqual({ login: "userB", avatarUrl: "urlB", hour: 9 });
    expect(result).toContainEqual({ login: "userA", avatarUrl: "urlA", hour: 15 });
    expect(result).toContainEqual({ login: "userC", avatarUrl: "urlC", hour: 20 });
  });

  test("should handle missing avatarUrl (null from DB)", async () => {
    const mockActivity = [
      { login: "userD", avatarUrl: null, activityTime: createISOTimestamp(targetDate, 10) },
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivity);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ login: "userD", avatarUrl: undefined, hour: 10 });
  });
  
  test("should correctly determine date range for query", async () => {
    mockDbExecute.mockResolvedValueOnce([]);
    await getTimelineActivityData(targetDate, intervalType);

    expect(mockDbExecute).toHaveBeenCalledTimes(1);
    const executedSql = mockDbExecute.mock.calls[0][0];
    
    // Check that the date parameters are correctly formatted ISO strings
    // For targetDate = "2023-10-26"
    // startDate should be "2023-10-26T00:00:00.000Z"
    // endDate should be "2023-10-27T00:00:00.000Z"
    
    // Drizzle's sql object structure is complex. We access parameters through `executedSql.getSQL()` and `executedSql.params`
    // However, `db.execute` receives the prepared statement object directly.
    // The actual SQL string and parameters are embedded in the `sql` tagged template literal object.
    // Accessing these for assertion is tricky without knowing Drizzle's internal structure for `sql.execute`.
    // The mock receives an object that has properties like `sql` (the string) and `params`.
    // For `sql` tagged template from `drizzle-orm`, the parameters are part of the `values` array on the sql object.
    
    const sqlQueryObject = mockDbExecute.mock.calls[0][0];
    expect(sqlQueryObject.values).toBeInstanceOf(Array);
    expect(sqlQueryObject.values).toContain("2023-10-26T00:00:00.000Z"); // Start of targetDate
    expect(sqlQueryObject.values).toContain("2023-10-27T00:00:00.000Z"); // Start of next day
  });

  test("should handle various activity types (simulated by diverse data)", async () => {
    // This test relies on the fact that the UNION ALL query in the implementation
    // normalizes data. We just provide mixed data that could come from any table.
    const mockActivities = [
      { login: "userCommit", avatarUrl: "urlC", activityTime: createISOTimestamp(targetDate, 8, 10) }, // Simulates a commit
      { login: "userPR", avatarUrl: "urlPR", activityTime: createISOTimestamp(targetDate, 11, 20) },    // Simulates a PR
      { login: "userIssue", avatarUrl: "urlI", activityTime: createISOTimestamp(targetDate, 11, 25) }, // Simulates an Issue (same hour as PR)
      { login: "userReview", avatarUrl: "urlRV", activityTime: createISOTimestamp(targetDate, 16, 0) },// Simulates a Review
      { login: "userComment", avatarUrl: "urlCM", activityTime: createISOTimestamp(targetDate, 17, 5) },// Simulates a Comment
    ];
    mockDbExecute.mockResolvedValueOnce(mockActivities);
    const result = await getTimelineActivityData(targetDate, intervalType);
    expect(result).toHaveLength(5);
    expect(result).toContainEqual({ login: "userCommit", avatarUrl: "urlC", hour: 8 });
    expect(result).toContainEqual({ login: "userPR", avatarUrl: "urlPR", hour: 11 });
    expect(result).toContainEqual({ login: "userIssue", avatarUrl: "urlI", hour: 11 });
    expect(result).toContainEqual({ login: "userReview", avatarUrl: "urlRV", hour: 16 });
    expect(result).toContainEqual({ login: "userComment", avatarUrl: "urlCM", hour: 17 });
  });

  test("should log a warning if intervalType is not 'day' but still proceed", async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDbExecute.mockResolvedValueOnce([]);
    await getTimelineActivityData(targetDate, "week");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "getTimelineActivityData called with intervalType 'week', but currently only supports 'day'. Proceeding as 'day'."
    );
    expect(mockDbExecute).toHaveBeenCalledTimes(1); // Should still execute
    consoleWarnSpy.mockRestore();
  });

});
