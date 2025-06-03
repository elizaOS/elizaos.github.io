import { ScrollArea } from "@/components/ui/scroll-area";
import { ContributorItem } from "@/components/contributor-item"; // This path needs to be checked/adjusted after copying all components

interface Contributor {
  username: string;
  totalScore: number;
  summary?: string | null;
}

interface ContributorsListModalContentProps {
  contributors: Contributor[];
}

export default function ContributorsListModalContent({
  contributors,
}: ContributorsListModalContentProps) {
  return (
    <ScrollArea className="max-h-[80svh]">
      <div className="divide-y px-0">
        {contributors.map((contributor) => (
          <div key={contributor.username}>
            <ContributorItem
              className="border-none px-4"
              username={contributor.username}
              score={contributor.totalScore}
              href={`/profile/${contributor.username}`} // This path might need to be updated if profiles are not at the root
              stats={
                <p className="whitespace-pre-wrap break-words">
                  {contributor.summary?.replace(
                    `${contributor.username}: `,
                    "",
                  )}
                </p>
              }
            ></ContributorItem>
          </div>
        ))}
        {contributors.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No contributors to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
