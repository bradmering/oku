export const metadata = { title: 'oku' }

export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; bad?: string }>
}) {
  const { next = '/stories', bad } = await searchParams
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form method="POST" action="/api/unlock" className="w-full max-w-sm">
        <label htmlFor="password" className="block mb-6 text-stone-400 font-mono text-xs tracking-[0.14em] uppercase">
          <span lang="ja" className="text-ember mr-2 tracking-normal">奥</span>
          Still being built
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={bad ? true : undefined}
          className="w-full px-3.5 py-3 mb-3 bg-transparent text-paper border border-white/20 rounded focus:outline-none focus:border-ember aria-[invalid]:border-red-700 placeholder:text-stone-600"
        />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="w-full py-3 rounded bg-ember text-[#1a0d08] cursor-pointer hover:brightness-110 transition">
          Enter
        </button>
        {bad && <p className="mt-3.5 text-stone-500 font-mono text-xs">Not that one.</p>}
      </form>
    </main>
  )
}
