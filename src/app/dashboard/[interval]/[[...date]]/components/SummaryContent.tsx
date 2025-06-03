import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit, SKIP } from "unist-util-visit";
import { Node, Parent } from "unist";
import { Heading } from "mdast";
import { type HTMLProps } from "react";
import { cn } from "@/lib/utils";

// Custom remark plugin to remove the first H1
const remarkRemoveFirstH1 = () => {
  let firstH1Removed = false;
  return (tree: Node) => {
    visit(
      tree,
      "heading",
      (node: Heading, index: number | null, parent: Parent | undefined) => {
        if (!firstH1Removed && node.depth === 1) {
          if (parent && parent.children && typeof index === "number") {
            parent.children.splice(index, 1);
            firstH1Removed = true;
            return [SKIP, index];
          }
        }
      },
    );
    firstH1Removed = false; // Reset for next run if used multiple times (though unlikely here)
  };
};

// Custom H2 component to apply primary color
const CustomH2 = (props: HTMLProps<HTMLHeadingElement>) => {
  return <h2 className="lowercase" {...props} />;
};

interface SummaryContentProps {
  summaryContent: string | null;
  className?: string;
}

export function SummaryContent({
  summaryContent,
  className,
}: SummaryContentProps) {
  if (!summaryContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-lg mt-8 max-w-none dark:prose-invert",
        "[&_ol]:max-w-none [&_p]:max-w-none [&_ul]:max-w-none",
        "[&_blockquote]:max-w-none [&_h2]:max-w-none [&_h3]:max-w-none",
        "[&_pre]:max-w-none [&_pre]:overflow-x-auto",
        "[&_table]:block [&_table]:w-full [&_table]:overflow-x-auto",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkRemoveFirstH1]}
        components={{
          h2: CustomH2,
        }}
      >
        {summaryContent}
      </ReactMarkdown>
    </div>
  );
}
