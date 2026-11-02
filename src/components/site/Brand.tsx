import { Link } from "@tanstack/react-router";

export function Brand({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
        B
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold">BAPS Houston</span>
        <span className="block text-xs text-muted-foreground">Event requests</span>
      </span>
    </Link>
  );
}
