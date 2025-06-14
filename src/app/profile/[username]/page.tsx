import UserProfile from "@/app/profile/[username]/components/UserProfile";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserProfile, getUserPullRequests } from "./queries"; // Import getUserPullRequests
import { db } from "@/lib/data/db";

const DEFAULT_PR_PAGE_SIZE = 10; // Define page size constant

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateStaticParams() {
  // Get all users directly from the database
  const allUsers = await db.query.users.findMany({
    columns: {
      username: true,
    },
  });

  return allUsers.map((user) => ({
    username: user.username,
  }));
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const userData = await getUserProfile(username);

  // Get the latest weekly summary for meta description if available
  const description =
    userData?.weeklySummaries && userData.weeklySummaries.length > 0
      ? userData.weeklySummaries[0].summary || "Eliza OS contributor profile"
      : "Eliza OS contributor profile";

  return {
    title: userData ? `${userData.username}` : "Profile Not Found",
    description,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const userData = await getUserProfile(username, true);

  if (!userData) {
    notFound();
  }

  // Fetch initial pull requests for the "ALL" filter, page 1
  // We need total count for "ALL" for the tab display, and the first page of "ALL"
  const initialPrData = await getUserPullRequests(
    username,
    undefined, // All statuses
    1,
    DEFAULT_PR_PAGE_SIZE,
  );

  return (
    <main className="container mx-auto p-4">
      <UserProfile
        {...userData}
        initialPullRequests={initialPrData.pullRequests}
        totalInitialPullRequests={initialPrData.totalCount} // This is total for the current filter (ALL)
        prPageSize={DEFAULT_PR_PAGE_SIZE}
      />
    </main>
  );
}
