import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Crown, KeyRound, KanbanSquare, LayoutDashboard, LogOut, Repeat, Users, UserPlus, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DEPT } from "@/lib/departments";
import { useStaffProfile } from "@/hooks/use-staff";
import { canManageTeam, hasRequestBoard } from "@/lib/team";
import { Brand } from "@/components/site/Brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TextInput, Label } from "@/components/form/fields";

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 10) return void toast.error("Use at least 10 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as never);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    setCurrent("");
    setNext("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Use at least 10 characters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Current password</Label>
            <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <Label>New password</Label>
            <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            Save password
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StaffShell({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const { data: me } = useStaffProfile();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const isMaster = me?.role === "master";
  const accountKey = isMaster ? "master" : (me?.department ?? undefined);
  const meta = me?.department ? DEPT[me.department] : null;
  const Icon = meta?.icon ?? Crown;

  const tabs = [
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/calendar" as const, label: "Calendar", icon: CalendarDays },
    ...(hasRequestBoard(me) ? [{ to: "/board" as const, label: "Request Management", icon: KanbanSquare }] : []),
    ...(isMaster || canManageTeam(me, me?.department) ? [{ to: "/team" as const, label: "Team", icon: UserPlus }] : []),
    ...(isMaster ? [{ to: "/accounts" as const, label: "Accounts", icon: Users }] : []),
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div data-account={accountKey} className="min-h-screen">
      <div className="h-1 w-full bg-account" />
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand to="/dashboard" />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground lg:flex">
              <FileText className="h-4 w-4" /> Request form
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-account/60 bg-account/10 py-1 pl-1 pr-3 text-sm font-semibold outline-none">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-account text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="max-w-[9rem] truncate">{me?.displayName ?? "…"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block">{me?.displayName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{isMaster ? "Master · sees everything" : me?.role === "member" ? `Team member · ${meta?.label ?? ""}` : "Team account"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/auth" })}>
                  <Repeat className="mr-2 h-4 w-4" /> Switch account
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPwOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-[0.16em] text-account")}>
              {isMaster ? "Master view" : meta ? `${meta.label} team` : ""}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          </div>
          {actions}
        </div>
        {me && !me.role ? (
          <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
            This login isn't linked to a department yet. Ask the master account to set it up.
          </div>
        ) : (
          children
        )}
      </main>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}
