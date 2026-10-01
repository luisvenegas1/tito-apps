import { cn } from "@titoapps/ui";
import { formatByCurrency, formatMoney, type ByCurrency } from "@/lib/money";
import type { Currency } from "@/lib/supabase/types";

/** Monto con moneda siempre visible (nunca solo color: doc 08 §8.1). */
export function Money({
  amount,
  currency,
  sign,
  tone,
  className,
}: {
  amount: number;
  currency: Currency;
  sign?: boolean;
  tone?: "auto" | "in" | "out";
  className?: string;
}) {
  const color =
    tone === "in" ? "text-emerald-700 dark:text-emerald-300" : tone === "out" ? "text-fg" : tone === "auto" && amount < 0 ? "text-deficit" : "";
  return <span className={cn("amount", color, className)}>{formatMoney(amount, currency, { sign })}</span>;
}

export function MoneyByCurrency({ value, className }: { value: ByCurrency; className?: string }) {
  return <span className={cn("amount", className)}>{formatByCurrency(value)}</span>;
}
