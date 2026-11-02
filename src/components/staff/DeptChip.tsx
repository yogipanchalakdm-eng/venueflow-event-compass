import { cn } from "@/lib/utils";
import { DEPT, type Department } from "@/lib/departments";

export function DeptChip({ dept, highlight, size = "sm" }: { dept: Department; highlight?: boolean; size?: "sm" | "md" }) {
  const m = DEPT[dept];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        m.border,
        highlight ? cn(m.bg, "text-primary-foreground") : cn(m.softBg, "text-foreground"),
      )}
    >
      {!highlight && <span className={cn("h-1.5 w-1.5 rounded-full", m.bg)} />}
      {m.label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    new: "bg-primary/15 text-primary border-primary/40",
    in_progress: "bg-dept-it-network/15 text-dept-it-network border-dept-it-network/40",
    confirmed: "bg-success/15 text-success border-success/40",
    completed: "bg-muted text-muted-foreground border-border",
    declined: "bg-destructive/15 text-destructive border-destructive/40",
  };
  const label: Record<string, string> = {
    new: "New",
    in_progress: "In progress",
    confirmed: "Confirmed",
    completed: "Completed",
    declined: "Declined",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", tone[status] ?? tone.new)}>{label[status] ?? status}</span>;
}
