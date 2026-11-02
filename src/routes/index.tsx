import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/site/Brand";
import { RequestForm } from "@/components/form/RequestForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Submit an event request · BAPS Houston" },
      {
        name: "description",
        content: "One form for every team: facilities, IT/network, kitchen, audio/video, photo/video and parking requests for your event at BAPS Houston.",
      },
      { property: "og:title", content: "Submit an event request · BAPS Houston" },
      { property: "og:description", content: "Tell every BAPS Houston team what your event needs in one form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function StaffButton() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  return signedIn ? (
    <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:border-primary">
      <LayoutDashboard className="h-4 w-4" /> Dashboard
    </Link>
  ) : (
    <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:border-primary">
      <LogIn className="h-4 w-4" /> Staff login
    </Link>
  );
}

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 h-[480px] w-[480px] rounded-full bg-selected/40 blur-3xl" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <StaffButton />
      </header>
      <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">Submit an event request</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Tell us about your event and what you need. Add a request for each team — they'll each get just their part.
          </p>
        </div>
        <RequestForm />
      </main>
    </div>
  );
}
