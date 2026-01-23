"use client";

import { UntrackedRepository } from "../queries";
import { UntrackedRepositoryCard } from "./UntrackedRepositoryCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye } from "lucide-react";

interface Props {
  repositories: UntrackedRepository[];
}

export function UntrackedRepositoryList({ repositories }: Props) {
  if (repositories.length === 0) {
    return null;
  }

  // Group by organization and sort within each org by recency
  const byOrg = repositories.reduce(
    (acc, repo) => {
      if (!acc[repo.owner]) {
        acc[repo.owner] = [];
      }
      acc[repo.owner].push(repo);
      return acc;
    },
    {} as Record<string, UntrackedRepository[]>,
  );

  // Sort repos within each org by most recently pushed first
  Object.keys(byOrg).forEach((org) => {
    byOrg[org].sort((a, b) => {
      const dateA = a.lastPushedAt ? new Date(a.lastPushedAt).getTime() : 0;
      const dateB = b.lastPushedAt ? new Date(b.lastPushedAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  });

  const orgCount = Object.keys(byOrg).length;

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="">
      <AccordionItem value="untracked" className="border-none">
        <AccordionTrigger className="py-0 hover:no-underline">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">
              Other Public Repositories in Organization
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
              {repositories.length}
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pt-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Repositories discovered in {orgCount} organization
              {orgCount > 1 ? "s" : ""} that are not currently being tracked for
              contributor analytics. Repos with high recent activity may be
              candidates for full tracking.{" "}
              <span className="text-xs">(Private repos not included)</span>
            </p>

            {Object.entries(byOrg).map(([org, orgRepos]) => (
              <div key={org} className="space-y-3">
                <h3 className="text-lg font-medium text-muted-foreground">
                  {org}{" "}
                  <span className="text-sm font-normal">
                    ({orgRepos.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {orgRepos.map((repo) => (
                    <UntrackedRepositoryCard key={repo.id} repository={repo} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
