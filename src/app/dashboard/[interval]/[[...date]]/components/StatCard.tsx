import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  icon: LucideIcon;
  bgColor?: string;
  children: React.ReactNode; // Summary content (e.g., counts, avatars)
  listContent?: React.ReactNode; // Detailed list content
  className?: string;
}

export function StatCard({
  title,
  icon: Icon,
  bgColor = "bg-primary/10 group-hover:bg-primary/20",
  children,
  listContent,
  className,
}: StatCardProps) {
  const HeaderContent = (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {title}
      </div>
      {/* ChevronRight removed as content is no longer in a modal */}
    </div>
  );

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader className={cn(bgColor, "w-full py-4 transition-colors")}>
        <CardTitle className="text-sm font-medium">{HeaderContent}</CardTitle>
      </CardHeader>
      <CardContent className="w-full flex-grow p-4">
        {children}
        {listContent && (
          <div className="mt-4 max-h-[300px] overflow-y-auto border-t pt-4">
            {listContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
