"use client";

import dynamic from "next/dynamic";
import ProfileEditorSkeleton from "./components/ProfileEditorSkeleton";

const ProfileEditor = dynamic(() => import("./components/ProfileEditor"), {
  loading: () => <ProfileEditorSkeleton />,
  ssr: false,
});

export default function ProfileEditPage() {
  return <ProfileEditor />;
}
