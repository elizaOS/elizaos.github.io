"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Info, Shield, ArrowRight, Twitter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_WORKER_URL = "https://github-auth-worker.sendo-auth.workers.dev";

interface XLinkFormProps {
  xUsername?: string | null;
  isLinked: boolean;
}

export function XLinkForm({ xUsername, isLinked }: XLinkFormProps) {
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkX = async () => {
    if (!token) {
      setError("You must be logged in to link your X account");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Call auth-worker to initiate X linking
      const response = await fetch(`${AUTH_WORKER_URL}/api/x/initiate-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate X linking");
      }

      const data = await response.json();

      // Step 2: Redirect to X OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("Error linking X account:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initiate X linking",
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Twitter className="h-5 w-5" />X Account
          </h3>
          {isLinked && xUsername && (
            <p className="text-sm text-muted-foreground">
              Linked to{" "}
              <a
                href={`https://x.com/${xUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @{xUsername}
              </a>
            </p>
          )}
        </div>

        <Button
          onClick={handleLinkX}
          disabled={isProcessing || isLinked}
          variant={isLinked ? "outline" : "default"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Linking...
            </>
          ) : isLinked ? (
            "✓ Linked"
          ) : (
            "Link X Account"
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-start space-x-2">
          <Info className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1 text-xs">
            <p className="text-foreground">
              <span className="font-medium">Link your X account</span> to earn
              points for posts mentioning @SendoMarket
            </p>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Secure OAuth 2.0 authentication</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>
                After linking, add the JWT token to your GitHub profile README
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
