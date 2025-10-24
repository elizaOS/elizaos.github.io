"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Check, X as XIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTH_WORKER_URL = "https://github-auth-worker.sendo-auth.workers.dev";

function XCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing X authentication...");
  const [linkingProof, setLinkingProof] = useState<string | null>(null);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`X authentication error: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing OAuth parameters");
      return;
    }

    handleCallback(code, state);
  }, [searchParams]);

  const handleCallback = async (code: string, state: string) => {
    try {
      const response = await fetch(
        `${AUTH_WORKER_URL}/api/x/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete X linking");
      }

      const data = await response.json();

      setStatus("success");
      setLinkingProof(data.linkingProof);
      setXUsername(data.xUsername);
      setGithubUsername(data.githubUsername);
      setMessage("X account linked successfully!");
    } catch (err) {
      console.error("Error in X callback:", err);
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Failed to complete X linking",
      );
    }
  };

  const copyToClipboard = () => {
    if (linkingProof) {
      navigator.clipboard.writeText(linkingProof);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getReadmeInstructions = () => {
    if (!githubUsername || !linkingProof) return "";

    return `<!-- SENDO_X_LINK_START -->
${linkingProof}
<!-- SENDO_X_LINK_END -->`;
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          {status === "success" && (
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-12 w-12 text-green-600" />
            </div>
          )}
          {status === "error" && (
            <div className="rounded-full bg-red-100 p-3">
              <XIcon className="h-12 w-12 text-red-600" />
            </div>
          )}
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">
            {status === "loading" && "Processing..."}
            {status === "success" && "X Account Linked!"}
            {status === "error" && "Linking Failed"}
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {status === "success" && linkingProof && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm font-medium">
                Your X account @{xUsername} has been linked to GitHub account{" "}
                {githubUsername}
              </p>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Final Step:</p>
                <p className="text-sm text-muted-foreground">
                  Copy the JWT token below and add it to your GitHub profile
                  README:
                </p>

                <div className="relative">
                  <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-xs">
                    {getReadmeInstructions()}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  1. Go to{" "}
                  <a
                    href={`https://github.com/${githubUsername}/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    your profile README
                  </a>
                </p>
                <p>2. Paste the JWT token anywhere in your README.md</p>
                <p>3. Commit the changes</p>
                <p>
                  4. The daily pipeline will verify and activate your X account
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/profile/edit")}>
                Return to Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/leaderboard")}
              >
                View Leaderboard
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex justify-center">
            <Button onClick={() => router.push("/profile/edit")}>
              Return to Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function XCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <XCallbackContent />
    </Suspense>
  );
}
