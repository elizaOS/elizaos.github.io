"use client";

import * as React from "react";
import { PullRequestData } from "@/lib/data/types";
import { fetchUserPullRequestsAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLinkIcon } from "lucide-react"; // Using lucide-react for consistency

interface PullRequestListProps {
  initialPullRequests: PullRequestData[];
  totalInitialPullRequests: number; // Total PRs for the initial "ALL" filter
  username: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function PullRequestList({
  initialPullRequests,
  totalInitialPullRequests,
  username,
  pageSize = DEFAULT_PAGE_SIZE,
}: PullRequestListProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [activeStatusTab, setActiveStatusTab] = React.useState<
    "ALL" | "OPEN" | "MERGED" | "CLOSED"
  >("ALL");
  const [pullRequests, setPullRequests] =
    React.useState<PullRequestData[]>(initialPullRequests);
  const [totalCount, setTotalCount] = React.useState(totalInitialPullRequests);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchPullRequests = async (
    page: number,
    status?: "OPEN" | "MERGED" | "CLOSED",
  ) => {
    setIsLoading(true);
    try {
      const result = await fetchUserPullRequestsAction(
        username,
        status,
        page,
        pageSize,
      );
      setPullRequests(result.pullRequests);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Failed to fetch pull requests:", error);
      // Handle error display in UI if necessary
      setPullRequests([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // Don't refetch for "ALL" on page 1 if initialPullRequests are already there
    if (activeStatusTab === "ALL" && currentPage === 1 && initialPullRequests.length > 0) {
        setPullRequests(initialPullRequests);
        setTotalCount(totalInitialPullRequests);
        return;
    }

    fetchPullRequests(
      currentPage,
      activeStatusTab === "ALL" ? undefined : activeStatusTab,
    );
  }, [currentPage, activeStatusTab, username, pageSize]);

  const handleTabChange = (value: string) => {
    setActiveStatusTab(value as "ALL" | "OPEN" | "MERGED" | "CLOSED");
    setCurrentPage(1); // Reset to page 1 when tab changes
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pull Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeStatusTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ALL">All ({totalInitialPullRequests})</TabsTrigger> {/* Show initial total for ALL */}
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="MERGED">Merged</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed</TabsTrigger>
          </TabsList>
          <TabsContent value={activeStatusTab} className="mt-4">
            {isLoading && <p>Loading...</p>}
            {!isLoading && pullRequests.length === 0 && (
              <p>No pull requests found for this filter.</p>
            )}
            {!isLoading && pullRequests.length > 0 && (
              <div className="space-y-4">
                {pullRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {pr.title} (#{pr.number})
                        <ExternalLinkIcon className="ml-1 inline-block h-4 w-4" />
                      </a>
                      <p className="text-sm text-muted-foreground">
                        By {pr.author} on{" "}
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        pr.status === "MERGED"
                          ? "success" // Assuming you have a 'success' variant
                          : pr.status === "CLOSED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {pr.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
