import UserProfile from "@/app/profile/[username]/components/UserProfile";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getUserProfile,
  getUserBadgesForProfile,
  getUserBadgeProgress,
} from "./queries";
import { db } from "@/lib/data/db";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateStaticParams() {
  const maxUsers = process.env.CI_MAX_USERS
    ? parseInt(process.env.CI_MAX_USERS, 10)
    : undefined;

  // Get all users directly from the database
  const allUsers = await db.query.users.findMany({
    columns: {
      username: true,
    },
    limit: maxUsers,
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
  const userData = await getUserProfile(username);

  if (!userData) {
    notFound();
  }

  // Fetch badges and progress for the user
  const userBadges = await getUserBadgesForProfile(username);
  const badgeProgress = await getUserBadgeProgress(username);

  return (
    <main className="container mx-auto p-4">
      <UserProfile
        {...userData}
        userBadges={userBadges}
        badgeProgress={badgeProgress}
      />
    </main>
  );
}
