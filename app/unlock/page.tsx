export const metadata = { title: 'oku' }

export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; bad?: string }>
}) {
  const { next = '/stories', bad } = await searchParams
  return (
    <main className="gate">
      <form method="POST" action="/api/unlock">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password">
          <span lang="ja">奥</span> Still being built
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={bad ? true : undefined}
        />
        <button type="submit">Enter</button>
        {bad && <p className="bad">Not that one.</p>}
      </form>
    </main>
  )
}
