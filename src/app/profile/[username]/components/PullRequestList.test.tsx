import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PullRequestList } from "./PullRequestList";
import { fetchUserPullRequestsAction } from "../actions";
import { PullRequestData } from "@/lib/data/types";

// Mock the server action
jest.mock("../actions", () => ({
  fetchUserPullRequestsAction: jest.fn(),
}));

const mockFetchUserPullRequestsAction =
  fetchUserPullRequestsAction as jest.Mock;

const createMockPrData = (id: number, title: string, status: "OPEN" | "MERGED" | "CLOSED", number: number = id ): PullRequestData => ({
  id,
  title,
  status,
  url: `https://github.com/pull/${number}`,
  createdAt: new Date().toISOString(),
  author: "testuser",
  number,
});

const initialPrs: PullRequestData[] = [
  createMockPrData(1, "Initial PR 1", "OPEN", 101),
  createMockPrData(2, "Initial PR 2", "MERGED", 102),
];

describe("PullRequestList", () => {
  const username = "testuser";
  const defaultPageSize = 5;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchUserPullRequestsAction.mockResolvedValue({
      pullRequests: [],
      totalCount: 0,
    });
  });

  const renderComponent = (
    initialPullRequests: PullRequestData[] = initialPrs,
    totalInitialPullRequests: number = initialPrs.length,
    pageSize: number = defaultPageSize,
  ) => {
    return render(
      <PullRequestList
        initialPullRequests={initialPullRequests}
        totalInitialPullRequests={totalInitialPullRequests}
        username={username}
        pageSize={pageSize}
      />,
    );
  };

  it("renders with initial pull requests", () => {
    renderComponent();
    expect(screen.getByText("Initial PR 1 (#101)")).toBeInTheDocument();
    expect(screen.getByText("Initial PR 2 (#102)")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /All \(\d+\)/i, selected: true }),
    ).toHaveTextContent(`All (${initialPrs.length})`);
  });

  it("switches tabs and calls server action with correct status", async () => {
    renderComponent();
    const openTab = screen.getByRole("tab", { name: "Open" });
    fireEvent.click(openTab);

    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
        username,
        "OPEN",
        1,
        defaultPageSize,
      );
    });
    expect(screen.getByRole('tab', {selected: true})).toHaveTextContent("Open");
  });

  it("calls server action with MERGED status", async () => {
    renderComponent();
    const mergedTab = screen.getByRole("tab", { name: "Merged" });
    fireEvent.click(mergedTab);

    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
        username,
        "MERGED",
        1,
        defaultPageSize,
      );
    });
     expect(screen.getByRole('tab', {selected: true})).toHaveTextContent("Merged");
  });

  it("calls server action with CLOSED status", async () => {
    renderComponent();
    const closedTab = screen.getByRole("tab", { name: "Closed" });
    fireEvent.click(closedTab);

    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
        username,
        "CLOSED",
        1,
        defaultPageSize,
      );
    });
    expect(screen.getByRole('tab', {selected: true})).toHaveTextContent("Closed");
  });

  it("calls server action with ALL (undefined) status and resets page", async () => {
    renderComponent();
    // First, switch to another tab and page
    const openTab = screen.getByRole("tab", { name: "Open" });
    fireEvent.click(openTab);
    await waitFor(() => expect(mockFetchUserPullRequestsAction).toHaveBeenCalledTimes(1));

    // Mock response for Open tab to enable pagination
    mockFetchUserPullRequestsAction.mockResolvedValueOnce({
        pullRequests: [createMockPrData(3, "Open PR Page 1", "OPEN", 301)],
        totalCount: defaultPageSize + 1, // More than one page
    });
    fireEvent.click(openTab); // Re-click to trigger fetch with new mock
    await waitFor(() => {
        expect(screen.getByText("Open PR Page 1 (#301)")).toBeInTheDocument();
    });
    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(username, "OPEN", 2, defaultPageSize);
    });

    // Now switch back to ALL tab
    const allTab = screen.getByRole("tab", { name: /All/i });
    fireEvent.click(allTab);

    // Should use initial PRs for ALL, page 1 if available and no other fetch should be made
    // unless initialPullRequests is empty
    if (initialPrs.length > 0) {
         expect(mockFetchUserPullRequestsAction).toHaveBeenCalledTimes(3); // Open, Open Page 2
         expect(screen.getByText("Initial PR 1 (#101)")).toBeInTheDocument();
    } else {
        await waitFor(() => {
            expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
                username,
                undefined, // ALL
                1, // Reset to page 1
                defaultPageSize,
            );
        });
    }
     expect(screen.getByRole('tab', {selected: true})).toHaveTextContent(/All/);
  });


  it("handles pagination: Next and Previous buttons", async () => {
    mockFetchUserPullRequestsAction.mockResolvedValue({
      pullRequests: initialPrs, // Assume these are for page 1
      totalCount: defaultPageSize * 2, // Enough for two pages
    });
    renderComponent(initialPrs, defaultPageSize * 2);

    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
        username,
        undefined, // Current tab is ALL
        2, // Next page
        defaultPageSize,
      );
    });

    const prevButton = screen.getByRole("button", { name: "Previous" });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(mockFetchUserPullRequestsAction).toHaveBeenCalledWith(
        username,
        undefined, // Current tab is ALL
        1, // Previous page
        defaultPageSize,
      );
    });
  });

  it("renders pull request items correctly", () => {
    renderComponent([createMockPrData(10, "Test PR Item", "OPEN", 110)], 1);
    const prLink = screen.getByText("Test PR Item (#110)");
    expect(prLink).toBeInTheDocument();
    expect(prLink.closest("a")).toHaveAttribute("href", "https://github.com/pull/110");
    expect(screen.getByText("OPEN")).toBeInTheDocument(); // Badge
    // Check for date and author (might need more specific query)
    expect(screen.getByText(/By testuser on/)).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    mockFetchUserPullRequestsAction.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ pullRequests: [], totalCount: 0 }), 100))
    );
    renderComponent([], 0); // No initial PRs to show loading immediately for "ALL"

    // Click any tab to trigger fetch
    const openTab = screen.getByRole("tab", { name: "Open" });
    fireEvent.click(openTab);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no pull requests are found", async () => {
    mockFetchUserPullRequestsAction.mockResolvedValue({
      pullRequests: [],
      totalCount: 0,
    });
    renderComponent([], 0); // Start with no initial PRs

    // Click any tab to trigger fetch
    const openTab = screen.getByRole("tab", { name: "Open" });
    fireEvent.click(openTab);

    await waitFor(() => {
      expect(
        screen.getByText("No pull requests found for this filter."),
      ).toBeInTheDocument();
    });
  });

  it("disables Previous button on page 1 and Next button on last page", async () => {
    mockFetchUserPullRequestsAction.mockResolvedValue({
      pullRequests: initialPrs,
      totalCount: initialPrs.length, // Only one page
    });
    renderComponent(initialPrs, initialPrs.length, defaultPageSize);

    await waitFor(() => { // Ensure initial PRs are processed
        expect(screen.getByText("Initial PR 1 (#101)")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    // Test with multiple pages
    mockFetchUserPullRequestsAction.mockResolvedValue({
        pullRequests: initialPrs,
        totalCount: defaultPageSize * 2,
    });
    // Re-render or switch tab to re-evaluate pagination based on new totalCount
    const openTab = screen.getByRole("tab", { name: "Open" });
    fireEvent.click(openTab);

    await waitFor(() => {
        expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    });

    // Go to next page
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    mockFetchUserPullRequestsAction.mockResolvedValueOnce({ // For page 2
        pullRequests: [createMockPrData(3, "Page 2 PR", "OPEN")],
        totalCount: defaultPageSize * 2,
    });

    await waitFor(() => {
        expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
        expect(screen.getByRole("button", { name: "Next" })).toBeDisabled(); // Now on last page
    });

  });
});
