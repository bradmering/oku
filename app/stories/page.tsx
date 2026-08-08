import Link from 'next/link'
import { getAllTrips } from '@/lib/trips'

export default function StoryIndex() {
  const trips = getAllTrips()
  return (
    <main className="index">
      <h1><Link href="/">oku</Link></h1>
      <p className="lede">
        Spec renderer. Every document below validates against <code>schema/trip.ts</code>.
      </p>
      <ul>
        {trips.map(({ trip, source }) => (
          <li key={trip.slug}>
            <Link href={`/stories/${trip.slug}`}>{trip.title}</Link>
            {trip.subtitle && <span className="sub"> — {trip.subtitle}</span>}
            <span className="meta">
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
