import { getRepositories, getUntrackedRepositories } from "../queries";
import { RepositoryCard } from "./RepositoryCard";
import type { Repository, UntrackedRepository } from "@/lib/data/types";

type RepoItem =
  | { type: "tracked"; repo: Repository }
  | { type: "untracked"; repo: UntrackedRepository };

export async function RepositoryList() {
  const [trackedRepos, untrackedRepos] = await Promise.all([
    getRepositories(),
    getUntrackedRepositories(),
  ]);

  // Combine both types of repos
  const allRepos: RepoItem[] = [
    ...trackedRepos.map((repo) => ({ type: "tracked" as const, repo })),
    ...untrackedRepos.map((repo) => ({ type: "untracked" as const, repo })),
  ];

  // Group by organization
  const byOrg = allRepos.reduce(
    (acc, item) => {
      const owner = item.repo.owner;
      if (!acc[owner]) {
        acc[owner] = [];
      }
      acc[owner].push(item);
      return acc;
    },
    {} as Record<string, RepoItem[]>,
  );

  // Sort repos within each org by recency
  Object.keys(byOrg).forEach((org) => {
    byOrg[org].sort((a, b) => {
      const dateA =
        a.type === "tracked"
          ? new Date(a.repo.lastUpdated).getTime()
          : a.repo.lastPushedAt
            ? new Date(a.repo.lastPushedAt).getTime()
            : 0;
      const dateB =
        b.type === "tracked"
          ? new Date(b.repo.lastUpdated).getTime()
          : b.repo.lastPushedAt
            ? new Date(b.repo.lastPushedAt).getTime()
            : 0;
      return dateB - dateA; // Most recent first
    });
  });

  const trackedCount = trackedRepos.length;
  const untrackedCount = untrackedRepos.length;

  return (
    <div className="space-y-0">
      {/* Tracked repos section */}
      {trackedCount > 0 && (
        <div className="-mx-4 rounded-lg bg-green-500/[0.02] px-4 py-6 md:-mx-10 md:px-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Tracked Repositories
              <span className="ml-2 rounded-full bg-green-500/10 px-2.5 py-0.5 text-sm font-normal text-green-700 dark:text-green-400">
                {trackedCount}
              </span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Repositories with full contributor analytics, PR/issue tracking,
              and commit history.
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(byOrg).map(([org, orgRepos]) => {
              const trackedInOrg = orgRepos.filter((r) => r.type === "tracked");
              if (trackedInOrg.length === 0) return null;

              return (
                <div key={`tracked-${org}`} className="space-y-3">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {org}{" "}
                    <span className="text-sm font-normal">
                      ({trackedInOrg.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {trackedInOrg.map((item) => (
                      <RepositoryCard
                        key={item.repo.id}
                        repository={item.repo as Repository}
                        type="tracked"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {trackedCount > 0 && untrackedCount > 0 && (
        <div className="relative py-8">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-dashed border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              Not Tracked
            </span>
          </div>
        </div>
      )}

      {/* Untracked repos section */}
      {untrackedCount > 0 && (
        <div className="py-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Other Public Repositories
              <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-sm font-normal text-muted-foreground">
                {untrackedCount}
              </span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Repositories in {Object.keys(byOrg).length} organization
              {Object.keys(byOrg).length > 1 ? "s" : ""} that are not currently
              being tracked for contributor analytics. Repos with high recent
              activity may be candidates for full tracking.{" "}
              <span className="text-xs">(Private repos not included)</span>
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(byOrg).map(([org, orgRepos]) => {
              const untrackedInOrg = orgRepos.filter(
                (r) => r.type === "untracked",
              );
              if (untrackedInOrg.length === 0) return null;

              return (
                <div key={`untracked-${org}`} className="space-y-3">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {org}{" "}
                    <span className="text-sm font-normal">
                      ({untrackedInOrg.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {untrackedInOrg.map((item) => (
                      <RepositoryCard
                        key={item.repo.id}
                        repository={item.repo as UntrackedRepository}
                        type="untracked"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function RepositoryListFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-lg border bg-muted"
        />
      ))}
    </div>
  );
}
