import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DEPT, STAFF_ACCOUNTS, accountEmail } from "@/lib/departments";
import { Brand } from "@/components/site/Brand";
import { TextInput, Label } from "@/components/form/fields";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff login · BAPS Houston" },
      { name: "description", content: "Department leads and management sign in to plan and manage events at BAPS Houston." },
      { property: "og:title", content: "Staff login · BAPS Houston" },
      { property: "og:description", content: "Sign in to the BAPS Houston event dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string>("master");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.email ?? null));
  }, []);

  const account = STAFF_ACCOUNTS.find((a) => a.slug === slug)!;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) return setError("Enter the password");
    setBusy(true);
    if (current) await supabase.auth.signOut();
    const { error: err } = await supabase.auth.signInWithPassword({ email: accountEmail(slug), password });
    setBusy(false);
    if (err) {
      setError(err.message === "Invalid login credentials" ? "That password isn't right for this account" : err.message);
      return;
    }
    toast.success(`Signed in as ${account.label}`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:pt-10">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Staff login</h1>
          <p className="mt-2 text-muted-foreground">Choose your account, then enter its password.</p>
          {current && (
            <p className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              You're signed in as <span className="font-semibold text-foreground">{STAFF_ACCOUNTS.find((a) => accountEmail(a.slug) === current)?.label ?? current}</span>. Signing in below switches accounts.
            </p>
          )}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STAFF_ACCOUNTS.map((a) => {
              const m = a.department ? DEPT[a.department] : null;
              const Icon = m?.icon ?? Crown;
              const on = slug === a.slug;
              return (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => setSlug(a.slug)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    on ? (m ? cn(m.border, m.softBg) : "border-primary bg-primary/15") : "border-border bg-card hover:border-muted-foreground/50",
                    !m && "sm:col-span-2",
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", m ? m.softBg : "bg-primary/15")}>
                    <Icon className={cn("h-5 w-5", m ? m.text : "text-primary")} />
                  </span>
                  <span>
                    <span className="block font-semibold">{a.label}</span>
                    <span className="block text-xs text-muted-foreground">{a.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} className="h-fit rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:sticky lg:top-8">
          <p className="text-sm text-muted-foreground">Signing in as</p>
          <p className="font-display text-2xl font-semibold">{account.label}</p>
          <div className="mt-6">
            <Label htmlFor="pw" required>
              Password
            </Label>
            <TextInput id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} />
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
          </div>
          <button type="submit" disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-70">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
          <p className="mt-4 text-xs text-muted-foreground">Forgot a password? The master account can reset it from the Accounts page.</p>
        </form>
      </main>
    </div>
  );
}
