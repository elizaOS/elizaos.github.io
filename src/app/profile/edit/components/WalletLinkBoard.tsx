"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  ExternalLink,
  Github,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface WalletLinkBoardProps {
  userLogin: string;
  walletSection: string;
  readmeContent: string | null;
  defaultBranch: string;
}

export function WalletLinkBoard({
  userLogin,
  walletSection,
  readmeContent,
  defaultBranch,
}: WalletLinkBoardProps) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const handleCopy = useCallback(async () => {
    await copyToClipboard(walletSection);
  }, [copyToClipboard, walletSection]);

  const handleCopyAndOpenGitHub = useCallback(async () => {
    // Always open GitHub regardless of copy success
    const githubUrl =
      readmeContent === null
        ? `https://github.com/${userLogin}/${userLogin}/new/${defaultBranch}?filename=README.md`
        : `https://github.com/${userLogin}/${userLogin}/edit/${defaultBranch}/README.md`;

    // Attempt to copy, but don't block GitHub opening
    await copyToClipboard(walletSection);

    window.open(githubUrl, "_blank");
  }, [
    copyToClipboard,
    walletSection,
    userLogin,
    readmeContent,
    defaultBranch,
  ]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="rounded-md border bg-muted p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Generated Wallet Comment. Copy and paste this into your README.md
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">
            <code>{walletSection}</code>
          </pre>
        </div>
      </div>

      <Button onClick={handleCopyAndOpenGitHub} className="w-full">
        <ExternalLink className="mr-2 h-4 w-4" />
        Copy and Open GitHub Editor
      </Button>

      <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
        <div className="flex items-start space-x-2">
          <Github className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1 text-xs">
            <p className="text-foreground">
              <span className="font-medium">Next step:</span> Use the button
              above to copy the wallet comment and open GitHub editor.
            </p>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>
                Copy the wallet comment to clipboard and open GitHub editor
              </span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>
                Paste the copied content into your {userLogin}/{userLogin}{" "}
                README.md
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
