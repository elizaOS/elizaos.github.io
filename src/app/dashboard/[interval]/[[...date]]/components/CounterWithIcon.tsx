import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CounterWithIconProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconClassName?: string;
  className?: string;
}

export function CounterWithIcon({
  icon: Icon,
  label,
  value,
  iconClassName,
  className,
}: CounterWithIconProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4", iconClassName)} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
