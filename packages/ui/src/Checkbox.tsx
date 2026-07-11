import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils/cn";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => (
    <label className="inline-flex items-center gap-2 text-fg">
      <input
        ref={ref}
        type="checkbox"
        className={cn("h-4 w-4 rounded border-border accent-[var(--tt-primary)]", className)}
        {...props}
      />
      {label && <span className="text-sm">{label}</span>}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
