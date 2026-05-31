import type { RequestStatus } from "@prisma/client";
import { STATUS_META } from "@/lib/geo";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: RequestStatus | string;
  className?: string;
}) {
  const meta = STATUS_META[status as RequestStatus] ?? {
    label: status,
    badgeClass: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
