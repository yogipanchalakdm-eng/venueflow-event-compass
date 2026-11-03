import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Crown, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEPT, type Department } from "@/lib/departments";
import { staffAccountsQuery } from "@/lib/staff-data";
import { resetStaffPassword } from "@/lib/requests.functions";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextInput, Label } from "@/components/form/fields";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts · BAPS Houston Events" },
      { name: "description", content: "Manage staff logins for BAPS Houston event planning." },
      { property: "og:title", content: "Accounts · BAPS Houston Events" },
      { property: "og:description", content: "Manage staff logins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(staffProfileQuery), context.queryClient.ensureQueryData(staffAccountsQuery)]),
  component: AccountsPage,
});

function AccountsPage() {
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const { data: accounts } = useSuspenseQuery(staffAccountsQuery);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const resetFn = useServerFn(resetStaffPassword);

  if (me?.role !== "master") {
    return (
      <StaffShell title="Accounts">
        <p className="text-muted-foreground">Only the master account can manage logins.</p>
        <Link to="/dashboard" className="mt-3 inline-block font-semibold text-account">
          Back to dashboard
        </Link>
      </StaffShell>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (pw.length < 10) return toast.error("Use at least 10 characters");
    setBusy(true);
    try {
      await resetFn({ data: { userId: target.id, password: pw } });
      toast.success(`Password updated for ${target.name}`);
      setTarget(null);
      setPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffShell title="Accounts">
      <p className="mb-5 max-w-2xl text-muted-foreground">
        Each team has one shared login. Department leads only see their own team's requests; the master account sees and manages everything.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => {
          const m = a.department ? DEPT[a.department as Department] : null;
          const Icon = m?.icon ?? Crown;
          return (
            <div key={a.user_id} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4", m ? m.border : "border-primary")}>
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", m ? m.softBg : "bg-primary/15")}>
                <Icon className={cn("h-5 w-5", m ? m.text : "text-primary")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.display_name}</p>
                <p className="text-xs text-muted-foreground">{a.role === "master" ? "Master · full access" : "Department lead"}</p>
              </div>
              <button
                onClick={() => setTarget({ id: a.user_id, name: a.display_name })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-account"
              >
                <KeyRound className="h-4 w-4" /> Reset
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a new password</DialogTitle>
            <DialogDescription>For {target?.name}. Share it with the department lead privately.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>New password</Label>
              <TextInput type="text" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 10 characters" />
            </div>
            <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
              Save password
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </StaffShell>
  );
}
