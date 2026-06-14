import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-trello-bg text-center">
      <p className="text-5xl font-bold text-trello-text">404</p>
      <h1 className="text-lg font-semibold text-trello-text">Page not found</h1>
      <p className="text-sm text-trello-textSubtle max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <div className="flex gap-3">
        <Link href="/boards" className="bg-trello-primary text-trello-textOnBold text-sm px-4 py-2 rounded-lg">
          Go to boards
        </Link>
        <Link href="/" className="bg-trello-cardHover text-trello-text text-sm px-4 py-2 rounded-lg">
          Home
        </Link>
      </div>
    </main>
  );
}
