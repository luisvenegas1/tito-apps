import { PAYMENT_LABELS, statusColor } from "@/lib/utils/format";

export function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${statusColor(status)}`} />;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
      <StatusDot status={status} />
      {PAYMENT_LABELS[status] ?? status}
    </span>
  );
}
