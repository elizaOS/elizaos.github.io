import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationButtonProps {
  href: string;
  direction: "prev" | "next";
  isVisible: boolean;
}

export function NavigationButton({
  href,
  direction,
  isVisible,
}: NavigationButtonProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous" : "Next";

  return (
    <>
      {/* Desktop */}
      <Button
        variant="outline"
        asChild
        className={cn("hidden items-center sm:flex", !isVisible && "invisible")}
      >
        <Link href={href}>
          {direction === "prev" && <Icon className="mr-2 h-4 w-4" />}
          <span>{label}</span>
          {direction === "next" && <Icon className="ml-2 h-4 w-4" />}
        </Link>
      </Button>

      {/* Mobile */}
      <Button
        variant="outline"
        size="icon"
        asChild
        className={cn("sm:hidden", !isVisible && "invisible")}
      >
        <Link href={href}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Link>
      </Button>
    </>
  );
}
