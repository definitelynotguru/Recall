import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-state loading-page">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or may have moved.</p>
      <Link href="/notes" className="btn btn-primary">
        Back to notes
      </Link>
    </main>
  );
}
