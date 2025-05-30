import { getUserPullRequests } from "./queries";
import { db } from "@/lib/data/db";
import { PullRequestData } from "@/lib/data/types";

// Mock the db module
jest.mock("@/lib/data/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn(), // For totalCount query
    // Mock for the main data query, potentially different from .get() if chain ends differently
    // For simplicity, let's assume the main query also ends with .get() or similar
    // If it's a different method like .all() or .execute(), mock that instead.
    // Based on queries.ts, it seems the main query is executed by awaiting the dbQuery object
    // which implies it might be thenable or has a specific execution method.
    // For now, we'll assume `await dbQuery` resolves to the results.
    // This might need adjustment based on actual drizzle-orm behavior in tests.
  },
}));

const mockDbExecution = (data: any[], totalCount: number) => {
  const getMock = jest.fn();
  // Mock for the count query
  (db.select as jest.Mock).mockImplementationOnce(() => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: getMock.mockResolvedValueOnce({ count: totalCount }),
  }));

  // Mock for the data query
  (db.select as jest.Mock).mockImplementationOnce(() => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    // Simulating the await dbQuery behavior
    then: (resolve: any) => resolve(data),
  }));
};


describe("getUserPullRequests", () => {
  const username = "testuser";
  const defaultPageSize = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockPr = (id: number, title: string, state: string, merged: boolean, author: string = username, number: number = id, createdAt: string = new Date().toISOString(), html_url: string = `http://github.com/pull/${id}`): any => ({
    id,
    title,
    state,
    merged,
    author,
    number,
    created_at: createdAt,
    html_url,
  });

  it("should fetch pull requests without status filter", async () => {
    const mockPrs = [
      createMockPr(1, "PR 1", "OPEN", false),
      createMockPr(2, "PR 2", "MERGED", true),
    ];
    mockDbExecution(mockPrs, mockPrs.length);

    const result = await getUserPullRequests(username, undefined, 1, defaultPageSize);

    expect(db.select).toHaveBeenCalledTimes(2); // Once for count, once for data
    expect(result.pullRequests.length).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.pullRequests[0].title).toBe("PR 1");
    expect(result.pullRequests[0].status).toBe("OPEN");
    expect(result.pullRequests[1].status).toBe("MERGED");
  });

  it("should filter by 'OPEN' status", async () => {
    const mockPrs = [createMockPr(1, "Open PR", "OPEN", false)];
    mockDbExecution(mockPrs, mockPrs.length);

    const result = await getUserPullRequests(username, "OPEN", 1, defaultPageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.pullRequests[0].status).toBe("OPEN");
    // TODO: Add expect(db.where) to have been called with the correct status filter
  });

  it("should filter by 'MERGED' status", async () => {
    const mockPrs = [createMockPr(1, "Merged PR", "MERGED", true)]; // State might be CLOSED or OPEN in raw data but merged is true
     mockDbExecution([{...mockPrs[0], state: "CLOSED", merged: true}], mockPrs.length);


    const result = await getUserPullRequests(username, "MERGED", 1, defaultPageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.pullRequests[0].status).toBe("MERGED");
  });

  it("should filter by 'CLOSED' status (and not merged)", async () => {
    const mockPrs = [createMockPr(1, "Closed PR", "CLOSED", false)];
    mockDbExecution(mockPrs, mockPrs.length);

    const result = await getUserPullRequests(username, "CLOSED", 1, defaultPageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.pullRequests[0].status).toBe("CLOSED");
  });

  it("should handle pagination correctly", async () => {
    const pageSize = 1;
    const mockPrsPage1 = [createMockPr(1, "PR 1", "OPEN", false)];
    const mockPrsPage2 = [createMockPr(2, "PR 2", "OPEN", false)];

    // Mock for page 1
    mockDbExecution(mockPrsPage1, 2);
    let result = await getUserPullRequests(username, undefined, 1, pageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.pullRequests[0].id).toBe(1);
    expect(result.totalCount).toBe(2);
    expect((db.offset as jest.Mock).mock.calls[0][0]).toBe(0); // (1-1)*pageSize

    // Mock for page 2
    mockDbExecution(mockPrsPage2, 2);
    result = await getUserPullRequests(username, undefined, 2, pageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.pullRequests[0].id).toBe(2);
    expect(result.totalCount).toBe(2);
    expect((db.offset as jest.Mock).mock.calls[0][0]).toBe(pageSize); // (2-1)*pageSize
  });

  it("should return empty array and zero count for user with no pull requests", async () => {
    mockDbExecution([], 0);

    const result = await getUserPullRequests(username, undefined, 1, defaultPageSize);
    expect(result.pullRequests.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("should correctly map raw data to PullRequestData", async () => {
    const rawPr = createMockPr(101, "Complex PR", "OPEN", false, "another-user", 101, "2023-01-01T10:00:00Z", "http://example.com/pr/101");
    mockDbExecution([rawPr], 1);

    const result = await getUserPullRequests("another-user", "OPEN", 1, defaultPageSize);
    expect(result.pullRequests.length).toBe(1);
    expect(result.totalCount).toBe(1);
    const prData = result.pullRequests[0];

    expect(prData.id).toBe(rawPr.id);
    expect(prData.title).toBe(rawPr.title);
    expect(prData.status).toBe("OPEN"); // Derived
    expect(prData.url).toBe(rawPr.html_url);
    expect(prData.createdAt).toBe(rawPr.created_at);
    expect(prData.author).toBe(rawPr.author);
    expect(prData.number).toBe(rawPr.number);
  });

  it("should derive MERGED status correctly even if raw state is OPEN/CLOSED", async () => {
    const rawPrMergedOpen = createMockPr(201, "Merged but state OPEN", "OPEN", true);
    const rawPrMergedClosed = createMockPr(202, "Merged and state CLOSED", "CLOSED", true);

    mockDbExecution([rawPrMergedOpen], 1);
    let result = await getUserPullRequests(username, "MERGED", 1, defaultPageSize);
    expect(result.pullRequests[0].status).toBe("MERGED");

    mockDbExecution([rawPrMergedClosed], 1);
    result = await getUserPullRequests(username, "MERGED", 1, defaultPageSize);
    expect(result.pullRequests[0].status).toBe("MERGED");
  });
});
