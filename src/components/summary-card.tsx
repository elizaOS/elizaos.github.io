"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatTimeframeTitle,
  getIntervalTypeTitle,
  IntervalType,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export type Summary = {
  date: string;
  summary: string | null;
};

type SummaryCardProps = {
  summaries: Summary[];
  intervalType: IntervalType | "lifetime";
  className?: string;
  prominent?: boolean;
};

export function SummaryCard({
  summaries,
  intervalType,
  className,
  prominent = false,
}: SummaryCardProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!summaries || summaries.length === 0) {
    return null;
  }

  const isLifetime = intervalType === "lifetime";
  const showCarousel = !isLifetime && summaries.length > 1;

  const currentSummary = summaries[currentIndex];
  const hasPrevious = currentIndex < summaries.length - 1;
  const hasNext = currentIndex > 0;

  // Truncate long summaries
  const summaryText = currentSummary.summary || "No summary available";
  const shouldTruncate = isLifetime && summaryText.length > 300;
  const displayText =
    shouldTruncate && !isExpanded
      ? summaryText.slice(0, summaryText.lastIndexOf(" ", 300)) + "..."
      : summaryText;

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const cardTitle = isLifetime
    ? "Lifetime Contribution Summary"
    : `${getIntervalTypeTitle(intervalType)} Summary`;

  const timeframeTitle = isLifetime
    ? "All Time"
    : formatTimeframeTitle(currentSummary.date, intervalType, {
        compact: true,
      });

  return (
    <Card
      className={cn(
        className,
        prominent &&
          "border-yellow-500/30 bg-gradient-to-br from-background to-yellow-500/5",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-lg font-medium">{cardTitle}</CardTitle>
        {showCarousel ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous {intervalType}</span>
            </Button>
            <span className="text-sm">{timeframeTitle}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!hasNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next {intervalType}</span>
            </Button>
          </div>
        ) : (
          <span className="text-sm">{timeframeTitle}</span>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert prose-headings:mb-2 prose-headings:mt-3 prose-headings:font-medium prose-headings:text-foreground prose-p:my-1 prose-strong:text-foreground prose-ul:my-1 prose-li:my-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayText}
          </ReactMarkdown>
        </div>
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 h-auto p-0 text-xs text-primary hover:bg-transparent"
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
