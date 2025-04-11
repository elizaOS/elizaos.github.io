import { getUsers } from "@/lib/get-users";
import {
  getAllDailySummaryDates,
  getDailySummary,
} from "@/lib/get-daily-summaries";
import UserProfile from "@/components/user-profile";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserProfile } from "./queries";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateStaticParams() {
  // Get users from both sources
  const [users, allDates] = await Promise.all([
    getUsers(),
    getAllDailySummaryDates(),
  ]);

  // Get all daily summaries
  const dailySummaries = await Promise.all(
    allDates.map((date) => getDailySummary(date)),
  );

  // Extract usernames from daily summaries
  const dailyUsers = new Set(
    dailySummaries
      .flatMap((summary) => summary?.top_contributors ?? [])
      .map((contributor) => contributor.name),
  );

  // Combine with existing users
  const allUsernames = new Set([
    ...users.map((user) => user.username),
    ...dailyUsers,
  ]);

  return Array.from(allUsernames).map((username) => ({
    username,
  }));
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const userData = await getUserProfile(username);

  return {
    title: userData
      ? `${userData.username}'s Eliza Contributer Profile`
      : "Profile Not Found",
    description: userData?.summary || "Eliza contributor profile",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const userData = await getUserProfile(username);

  if (!userData) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <UserProfile {...userData} />
    </main>
  );
}
