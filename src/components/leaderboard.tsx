"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaderboardCard } from "./leaderboard-card";
import { LeaderboardPeriod, UserFocusAreaData } from "@/types/user-profile";
import { useRouter, useSearchParams } from "next/navigation";

export interface LeaderboardProps {
  users: UserFocusAreaData[];
  period: LeaderboardPeriod;
}

export function Leaderboard({ users, period }: LeaderboardProps) {
  return (
    <Suspense fallback={<div>Loading leaderboard...</div>}>
      <LeaderboardContent users={users} period={period} />
    </Suspense>
  );
}

function LeaderboardContent({ users, period }: LeaderboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(
    searchParams.get("skill") || "all"
  );
  const [currentPeriod, setCurrentPeriod] = useState<LeaderboardPeriod>(period);

  useEffect(() => {
    setSelectedSkill(searchParams.get("skill") || "all");
  }, [searchParams]);

  const allSkills = useMemo(() => {
    return Array.from(
      new Set(users.flatMap((user) => Object.keys(user.tag_levels)))
    );
  }, [users]);

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
    [searchParams, router]
  );

  const filteredUsers = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedSkill === "all" ||
            selectedSkill.toLowerCase() in user.tag_levels)
      )
      .sort((a, b) => {
        if (selectedSkill === "all") {
          const totalA = Object.values(a.tag_levels).reduce(
            (sum, tag) => sum + tag.level,
            0
          );
          const totalB = Object.values(b.tag_levels).reduce(
            (sum, tag) => sum + tag.level,
            0
          );
          return totalB - totalA;
        } else {
          const skillA = a.tag_levels[selectedSkill]?.level || 0;
          const skillB = b.tag_levels[selectedSkill]?.level || 0;
          return skillB - skillA;
        }
      });
  }, [users, searchTerm, selectedSkill]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold capitalize">
        {selectedSkill === "all" ? (
          "Overall"
        ) : (
          <span className="text-primary">{selectedSkill}</span>
        )}{" "}
        Leaderboard
      </h2>

      <div className="flex justify-between">
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
            {allSkills.map((skill) => (
              <SelectItem key={skill} value={skill.toLowerCase()}>
                {skill}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={currentPeriod}
        onValueChange={(value) => setCurrentPeriod(value as LeaderboardPeriod)}
      >
        <TabsList>
          <TabsTrigger value="all">All Time</TabsTrigger>
          {/* <TabsTrigger value="monthly">Monthly</TabsTrigger> */}
          {/* <TabsTrigger value="weekly">Weekly</TabsTrigger> */}
        </TabsList>
        <TabsContent value="all">
          <LeaderboardContentWrapper
            users={filteredUsers}
            onSkillClick={handleSkillChange}
          />
        </TabsContent>
        {/* <TabsContent value="monthly">
          <LeaderboardContentWrapper users={filteredUsers} />
        </TabsContent>
        <TabsContent value="weekly">
          <LeaderboardContentWrapper users={filteredUsers} />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}

const LeaderboardContentWrapper = ({
  users,
  onSkillClick,
}: {
  users: UserFocusAreaData[];
  onSkillClick: (skill: string) => void;
}) => {
  return (
    <div className="border rounded-lg divide-y">
      {users.map((user, index) => (
        <LeaderboardCard
          key={user.username}
          user={user}
          rank={index + 1}
          onSkillClick={onSkillClick}
        />
      ))}
    </div>
  );
};