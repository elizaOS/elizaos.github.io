"use client";

// Imports moved from page.tsx that are specific to this client component
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { ProfileRepoNotice } from "./ProfileRepoNotice"; // Path relative to this new location
import { WalletLinkForm } from "./WalletLinkForm";
import { WalletLinkBoard } from "./WalletLinkBoard";
import { useProfileWallets } from "../hooks/useProfileWallets";

// This is the ProfileEditPageContent function, renamed and exported
export default function ProfileEditor() {
  const {
    user,
    profileRepoExists,
    walletData,
    pageLoading,
    isProcessingWallets,
    error,
    successMessage,
    walletSection,
    readmeContent,
    handleCreateProfileRepo,
    processWallets,
    handleGenerateWalletSection,
    defaultBranch,
  } = useProfileWallets();

  if (pageLoading && !user) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.login && !pageLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center">
        <p>Loading authentication details or redirecting...</p>
        <Loader2 className="mt-2 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userLogin = user?.login;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Link Your Wallet Addresses</CardTitle>
          <CardDescription>
            Link wallet addresses by embedding them as a hidden comment within
            your Github Profile README.md file. Follow the instructions to get
            started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert
              variant="default"
              className="mb-4 border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300"
            >
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {pageLoading && userLogin && (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!pageLoading && userLogin && (
            <>
              {profileRepoExists === false && (
                <ProfileRepoNotice
                  userLogin={userLogin}
                  pageLoading={pageLoading}
                  onCreateRepo={handleCreateProfileRepo}
                />
              )}

              {profileRepoExists && walletSection === null && (
                <>
                  <WalletLinkForm
                    wallets={walletData?.wallets || []}
                    processWallets={processWallets}
                    onSubmit={handleGenerateWalletSection}
                    isProcessing={isProcessingWallets}
                  />
                </>
              )}

              {profileRepoExists && walletSection && (
                <WalletLinkBoard
                  userLogin={userLogin}
                  walletSection={walletSection}
                  readmeContent={readmeContent}
                  defaultBranch={defaultBranch}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
