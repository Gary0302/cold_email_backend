export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-zinc-100">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Cold Email Tinder
      </h1>
      <p className="max-w-md text-zinc-400">
        AI drafts the emails. You swipe to send. Frontend lands here once
        v0 ships the Tinder deck — backend ({" "}
        <code className="font-mono text-sm text-emerald-400">
          /api/agent
        </code>
        ,{" "}
        <code className="font-mono text-sm text-emerald-400">
          /api/drafts
        </code>
        ) is live now.
      </p>
      <a
        href="/api/auth/signin"
        className="rounded-full bg-emerald-400 px-6 py-3 font-medium text-black transition hover:bg-emerald-300"
      >
        Sign in with Google
      </a>
    </main>
  );
}
