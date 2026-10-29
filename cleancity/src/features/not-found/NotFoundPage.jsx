import { Link } from "react-router-dom";
import { buttonClasses } from "../../components/common/Button";
import Logo from "../../components/layout/Logo";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-10 text-4xl font-semibold">This page isn't on the map</h1>
      <p className="mt-3 max-w-md text-muted">The link may be outdated, or the report may have been removed.</p>
      <Link to="/" className={buttonClasses("primary", "lg", "mt-8")}>Back to the feed</Link>
    </main>
  );
}
