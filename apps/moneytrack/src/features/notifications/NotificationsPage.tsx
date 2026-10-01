import { useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@titoapps/ui";
import { formatDay } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { Empty, Loading } from "@/components/Empty";
import { useMarkNotificationsRead, useNotifications } from "@/features/data/planning";

export function NotificationsPage() {
  const q = useNotifications();
  const markRead = useMarkNotificationsRead();
  const hasUnread = (q.data ?? []).some((n) => !n.read_at);

  // Al salir de la pantalla, todo queda leído.
  useEffect(() => {
    return () => {
      if (hasUnread) markRead.mutate();
    };
  }, [hasUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title="Avisos" back />
      {q.isLoading ? (
        <Loading />
      ) : (q.data ?? []).length === 0 ? (
        <Empty title="Sin avisos">Aquí verás los pagos que están por vencer o atrasados.</Empty>
      ) : (
        <ul className="card mx-4 mt-4 divide-y divide-border p-0">
          {q.data!.map((n) => (
            <li key={n.id}>
              <Link to={n.url ?? "/"} className="row hover:bg-surface-subtle">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-emerald-500")} aria-label={n.read_at ? undefined : "Sin leer"} />
                <span className="flex-1">
                  <span className="block font-semibold">{n.title}</span>
                  {n.body && <span className="text-sm text-muted">{n.body}</span>}
                </span>
                <span className="text-xs text-muted">{formatDay(n.created_at.slice(0, 10))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
