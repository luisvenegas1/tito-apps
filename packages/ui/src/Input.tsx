import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-token border bg-surface px-3 py-2.5 text-fg outline-none transition",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
