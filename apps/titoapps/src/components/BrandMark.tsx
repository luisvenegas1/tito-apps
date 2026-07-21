export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <img src={compact ? "/icon.svg" : "/logo.svg"} alt="Tito Apps" className={compact ? "h-10 w-10" : "h-9 w-auto"} />;
}
