import Link from 'next/link'
import { getAllTrips } from '@/lib/trips'

export default function StoryIndex() {
  const trips = getAllTrips()
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl tracking-tight mb-1">
        <Link href="/" className="no-underline">oku</Link>
      </h1>
      <p className="text-stone-500 mt-0">
        Spec renderer. Every document below validates against <code className="font-mono text-sm">schema/trip.ts</code>.
      </p>
      <ul className="list-none p-0 mt-10">
        {trips.map(({ trip, source }) => (
          <li key={trip.slug} className="py-4 border-t border-white/10">
            <Link href={`/stories/${trip.slug}`} className="text-xl no-underline border-b border-ember">
              {trip.title}
            </Link>
            {trip.subtitle && <span className="text-stone-500"> — {trip.subtitle}</span>}
            <span className="block mt-1.5 text-stone-500 font-mono text-xs">
              {trip.chapters.filter((c) => c.type === 'move').length} moves ·{' '}
              {trip.chapters.length} chapters · {source.includes('migrated') ? 'migrated' : 'forward'}
            </span>
          </li>
        ))}
      </ul>
      {!trips.length && <p>No fixtures found. Run <code>npm run migrate</code>.</p>}
    </main>
  )
}
