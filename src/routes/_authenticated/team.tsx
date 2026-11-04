import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, DEPT, type Department } from "@/lib/departments";
import { teamQuery, type TeamMember } from "@/lib/staff-data";
import { canManageTeam, newMemberSchema } from "@/lib/team";
import { createTeamMember, removeTeamMember, resetStaffPassword } from "@/lib/team.functions";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextInput, Label } from "@/components/form/fields";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team · BAPS Houston Events" },
      { name: "description", content: "Add and manage team member logins for your BAPS Houston department." },
      { property: "og:title", content: "Team · BAPS Houston Events" },
      { property: "og:description", content: "Add and manage your team's logins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(staffProfileQuery),
  component: TeamPage,
});

function TeamPage() {
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const isMaster = me?.role === "master";
  const [picked, setPicked] = useState<Department>("photo_video");
  const dept: Department | null = isMaster ? picked : (me?.department ?? null);

  if (!dept || !canManageTeam(me, dept)) {
    return (
      <StaffShell title="Team">
        <p className="text-muted-foreground">Only your team's main account can add or remove team members.</p>
        <Link to="/dashboard" className="mt-3 inline-block font-semibold text-account">
          Back to dashboard
        </Link>
      </StaffShell>
    );
  }

  return (
    <StaffShell title={isMaster ? "Teams" : `${DEPT[dept].label} team`}>
      {isMaster && (
        <div className="mb-5 flex flex-wrap gap-2">
          {DEPARTMENTS.map((d) => {
            const m = DEPT[d];
            return (
              <button
                key={d}
                onClick={() => setPicked(d)}
                aria-pressed={picked === d}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                  picked === d ? cn(m.border, m.softBg) : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <m.icon className={cn("h-4 w-4", m.text)} /> {m.label}
              </button>
            );
          })}
        </div>
      )}
      <TeamList key={dept} dept={dept} />
    </StaffShell>
  );
}

function TeamList({ dept }: { dept: Department }) {
  const { data: team = [], isLoading } = useQuery(teamQuery(dept));
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<TeamMember | null>(null);
  const removeFn = useServerFn(removeTeamMember);
  const m = DEPT[dept];
  const members = team.filter((t) => t.role === "member");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["team", dept] });
    qc.invalidateQueries({ queryKey: ["staff-accounts"] });
  };

  const remove = async (t: TeamMember) => {
    if (!confirm(`Remove ${t.display_name}'s login? Cards assigned to them become unassigned.`)) return;
    try {
      await removeFn({ data: { userId: t.user_id } });
      toast.success(`${t.display_name} removed`);
      refresh();
      qc.invalidateQueries({ queryKey: ["board"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove");
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted-foreground">
          Team members get their own login and see only {m.label} requests. They can update requests and be assigned cards, but can't add other people.
        </p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <UserPlus className="h-4 w-4" /> Add team member
        </button>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
          No team members yet. Add the first one to start assigning work.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((t) => (
            <div key={t.user_id} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4", m.border)}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", m.softBg, m.text)}>
                {t.display_name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">Username: {t.username ?? "—"}</p>
              </div>
              <button onClick={() => setResetFor(t)} aria-label={`Reset password for ${t.display_name}`} className="rounded-lg border border-border p-2 hover:border-account">
                <KeyRound className="h-4 w-4" />
              </button>
              <button onClick={() => remove(t)} aria-label={`Remove ${t.display_name}`} className="rounded-lg border border-border p-2 text-destructive hover:border-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddMemberDialog open={adding} onOpenChange={setAdding} dept={dept} onAdded={refresh} />
      <ResetDialog target={resetFor} onClose={() => setResetFor(null)} />
    </>
  );
}

function AddMemberDialog({ open, onOpenChange, dept, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; dept: Department; onAdded: () => void }) {
  const [form, setForm] = useState({ displayName: "", username: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(createTeamMember);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newMemberSchema.safeParse({ ...form, department: dept });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await createFn({ data: parsed.data });
      toast.success(`${parsed.data.displayName} can now sign in as "${parsed.data.username}"`);
      setForm({ displayName: "", username: "", password: "" });
      onAdded();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a {DEPT[dept].label} team member</DialogTitle>
          <DialogDescription>They sign in on the staff login page under "Team member" with this username and password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="tm-name" required>
              Full name
            </Label>
            <TextInput id="tm-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} invalid={!!errors.displayName} />
            {errors.displayName && <p className="mt-1 text-sm text-destructive">{errors.displayName}</p>}
          </div>
          <div>
            <Label htmlFor="tm-user" required>
              Username
            </Label>
            <TextInput
              id="tm-user"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, "") })}
              placeholder="e.g. priya.patel"
              autoCapitalize="none"
              invalid={!!errors.username}
            />
            {errors.username && <p className="mt-1 text-sm text-destructive">{errors.username}</p>}
          </div>
          <div>
            <Label htmlFor="tm-pw" required>
              Password
            </Label>
            <TextInput id="tm-pw" type="text" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 10 characters" invalid={!!errors.password} />
            {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
          </div>
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create login
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ target, onClose }: { target: TeamMember | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const resetFn = useServerFn(resetStaffPassword);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (pw.length < 10) return void toast.error("Use at least 10 characters");
    setBusy(true);
    try {
      await resetFn({ data: { userId: target.user_id, password: pw } });
      toast.success(`Password updated for ${target.display_name}`);
      setPw("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>For {target?.display_name}. Share it with them privately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <TextInput type="text" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 10 characters" />
          <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            Save password
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
