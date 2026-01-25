import { Suspense } from "react";
import {
  RepositoryList,
  RepositoryListFallback,
} from "./components/RepositoryList";

export default async function ReposPage() {
  return (
    <main className="container mx-auto space-y-8 p-4 py-8 md:p-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="mt-1 text-muted-foreground">
          An overview of all repositories across tracked organizations.
        </p>
      </div>
      <Suspense fallback={<RepositoryListFallback />}>
        <RepositoryList />
      </Suspense>
    </main>
  );
}
