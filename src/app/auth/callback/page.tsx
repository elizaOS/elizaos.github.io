"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CallbackContent() {
  const searchParams = useSearchParams();
  const { handleAuthCallback, isLoading, error } = useAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const processAuth = async () => {
      console.log({ processed });
      if (processed) return;

      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (code && state) {
        try {
          setProcessed(true);
          await handleAuthCallback(code, state);
        } catch (error) {
          console.error("Failed to handle auth callback:", error);
        }
      }
    };

    processAuth();
  }, [searchParams, handleAuthCallback, processed]);

  if (error || searchParams.get("error")) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-500">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || searchParams.get("error")}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => (window.location.href = "/")}>
            Return Home
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Authentication in Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <p>Successfully authenticated! You will be redirected shortly...</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <div className="container flex min-h-[calc(100vh-16rem)] items-center justify-center py-8">
      <Suspense
        fallback={
          <Card className="mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
