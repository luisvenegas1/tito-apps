import { forwardRef } from "react";
import { Input, InputProps } from "./Input";

export interface CurrencyInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
  value: number;
  onValueChange: (value: number) => void;
  /** Símbolo de moneda, ej. "₡", "$". NEUTRAL: no se asume ninguna moneda. */
  currencySymbol?: string;
}

/** Input numérico de moneda, con símbolo configurable por app. */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, currencySymbol, className, ...props }, ref) => (
    <div className="relative">
      {currencySymbol && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {currencySymbol}
        </span>
      )}
      <Input
        ref={ref}
        type="number"
        inputMode="numeric"
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className={currencySymbol ? `pl-7 ${className ?? ""}` : className}
        {...props}
      />
    </div>
  ),
);
CurrencyInput.displayName = "CurrencyInput";
