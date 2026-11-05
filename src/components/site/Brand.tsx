import { Link } from "@tanstack/react-router";
import logo from "@/assets/cultural-center-logo.png.asset.json";

export function Brand({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex shrink-0 items-center" aria-label="BAPS Houston Cultural Center — home">
      <img
        src={logo.url}
        alt="BAPS Houston Cultural Center"
        width={1580}
        height={312}
        className="h-8 w-auto sm:h-10"
      />
    </Link>
  );
}
