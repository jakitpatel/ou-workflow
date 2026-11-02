import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>The page you requested could not be found.</p>
      <Link to="/" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Back to dashboard
      </Link>
    </main>
  )
}
