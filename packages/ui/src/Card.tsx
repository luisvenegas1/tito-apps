import { HTMLAttributes } from "react";
import { cn } from "./utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-token bg-surface p-4 shadow-sm ring-1 ring-border", className)}
      {...props}
    />
  );
}
