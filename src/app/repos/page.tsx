import { Suspense } from "react";
import {
  RepositoryList,
  RepositoryListFallback,
} from "./components/RepositoryList";
import { UntrackedRepositoryList } from "./components/UntrackedRepositoryList";
import { RepoStatsButton } from "./components/RepoStatsButton";
import { getUntrackedRepositories, getRepositoryCounts } from "./queries";

async function UntrackedRepositoriesSection() {
  const untrackedRepos = await getUntrackedRepositories();
  return (
    <div id="untracked-repos">
      <UntrackedRepositoryList repositories={untrackedRepos} />
    </div>
  );
}

async function RepoStats() {
  const counts = await getRepositoryCounts();
  if (counts.untracked === 0) {
    return null;
  }
  return (
    <RepoStatsButton tracked={counts.tracked} untracked={counts.untracked} />
  );
}

export default async function ReposPage() {
  return (
    <main className="container mx-auto space-y-8 p-4 py-8 md:p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="mt-1 text-muted-foreground">
            An overview of repositories being tracked.
          </p>
        </div>
        <Suspense fallback={null}>
          <RepoStats />
        </Suspense>
      </div>
      <Suspense fallback={<RepositoryListFallback />}>
        <RepositoryList />
      </Suspense>
      <Suspense fallback={null}>
        <UntrackedRepositoriesSection />
      </Suspense>
    </main>
  );
}
