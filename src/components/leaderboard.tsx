"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaderboardCard } from "./leaderboard-card";
import { useRouter, useSearchParams } from "next/navigation";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { groupBy } from "@/lib/arrayHelpers";
import { Button } from "@/components/ui/button";
import { LinkedWallet } from "@/lib/walletLinking/readmeUtils";

export function LeaderboardFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted"></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-muted"></div>
        ))}
      </div>
    </div>
  );
}

export type LeaderboardPeriod = "all" | "weekly" | "monthly";

export interface LeaderboardUser {
  username: string;
  points: number;
  totalXp: number;
  totalLevel: number;
  avatarUrl?: string | null;
  allTags: { tagName: string; category: string | null; score: number }[];
  linkedWallets: LinkedWallet[];
}

interface LeaderboardTab {
  id: LeaderboardPeriod;
  title: string;
  startDate?: string;
  endDate?: string;
  users: LeaderboardUser[];
}

export interface LeaderboardProps {
  tabs: LeaderboardTab[];
  tags: { name: string; category: string }[];
}

export function Leaderboard({ tabs, tags }: LeaderboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(
    searchParams.get("skill") || "all",
  );
  const [currentPeriod, setCurrentPeriod] = useState<LeaderboardPeriod>(
    (searchParams.get("period") as LeaderboardPeriod) || "all",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.id === currentPeriod) || tabs[0],
    [tabs, currentPeriod],
  );

  useEffect(() => {
    setSelectedSkill(searchParams.get("skill") || "all");
    setCurrentPage(1);
  }, [searchParams, setSelectedSkill]);

  useEffect(() => {
    setCurrentPeriod(
      (searchParams.get("period") as LeaderboardPeriod) || "all",
    );
    setCurrentPage(1);
  }, [searchParams, setCurrentPeriod]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    return groupBy(tags, (t) => t.category);
  }, [tags]);

  const handleSkillChange = useCallback(
    (value: string) => {
      setSelectedSkill(value);
      const params = new URLSearchParams(searchParams);
      if (value === "all") {
        params.delete("skill");
      } else {
        params.set("skill", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handlePeriodChange = useCallback(
    (value: string) => {
      setCurrentPeriod(value as LeaderboardPeriod);
      const params = new URLSearchParams(searchParams);
      if (value === "all") {
        params.delete("period");
      } else {
        params.set("period", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Helper function to find tag data by name (case insensitive)
  const getTagData = useCallback((user: LeaderboardUser, tagName: string) => {
    const lowerTagName = tagName.toLowerCase();

    return user.allTags.find(
      (tag) => tag.tagName.toLowerCase() === lowerTagName,
    );
  }, []);

  const filteredUsers = useMemo(() => {
    return currentTab.users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedSkill === "all" || getTagData(user, selectedSkill)),
      )
      .sort((a, b) => {
        if (selectedSkill !== "all") {
          // Sort by selected skill XP
          let skillA = getTagData(a, selectedSkill)?.score || 0;
          let skillB = getTagData(b, selectedSkill)?.score || 0;
          if (currentPeriod !== "all") {
            skillA += a.points / 2;
            skillB += b.points / 2;
          }
          return skillB - skillA;
        }

        if (currentPeriod !== "all") {
          return b.points - a.points;
        }

        return b.totalLevel - a.totalLevel;
      });
  }, [currentTab.users, searchTerm, selectedSkill, getTagData, currentPeriod]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  }, [filteredUsers.length]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold capitalize">
        {selectedSkill === "all" ? (
          currentPeriod === "all" ? (
            "Overall"
          ) : (
            `${currentPeriod}`
          )
        ) : (
          <>
            {currentPeriod !== "all" && <span>{currentPeriod} </span>}
            <span className="text-primary">{selectedSkill}</span>
          </>
        )}{" "}
        Leaderboard
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedSkill} onValueChange={handleSkillChange}>
          <SelectTrigger
            className={`w-[180px] ${
              selectedSkill !== "all" ? "border-primary" : ""
            }`}
          >
            <SelectValue placeholder="Filter by skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {Object.entries(skillsByCategory).map(([category, skills]) => (
              <SelectGroup key={category}>
                <SelectLabel className="text-primary">{category}</SelectLabel>
                {skills.map((skill) => (
                  <SelectItem
                    key={`${category}-${skill.name}`}
                    value={skill.name}
                  >
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <VirtualizedLeaderboardList
              users={paginatedUsers}
              onSkillClick={handleSkillChange}
              showScore={currentPeriod !== "all"}
              currentPage={currentPage}
              itemsPerPage={ITEMS_PER_PAGE}
            />
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const VirtualizedLeaderboardList = ({
  users,
  onSkillClick,
  showScore,
  currentPage,
  itemsPerPage,
}: {
  users: LeaderboardUser[];
  onSkillClick: (skill: string) => void;
  showScore: boolean;
  currentPage: number;
  itemsPerPage: number;
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: users.length,
    estimateSize: () => 72,
    overscan: 15,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <div ref={listRef} className="divide-y rounded-lg border">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${
                virtualRow.start - virtualizer.options.scrollMargin
              }px)`,
            }}
          >
            <LeaderboardCard
              user={users[virtualRow.index]}
              rank={(currentPage - 1) * itemsPerPage + virtualRow.index + 1}
              onSkillClick={onSkillClick}
              showScore={showScore}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="mt-6 flex items-center justify-center space-x-3">
      <Button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        variant="outline"
        size="sm"
      >
        Previous
      </Button>
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        variant="outline"
        size="sm"
      >
        Next
      </Button>
    </div>
  );
}
