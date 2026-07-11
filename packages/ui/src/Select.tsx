import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-token border bg-surface px-3 py-2.5 text-fg outline-none transition",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
