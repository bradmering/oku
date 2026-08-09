import type { Trip, Chapter } from '@/schema/trip'
import Gallery from './Gallery'
import Article from './Article'

/** Renders one content chapter. `move` never reaches here — the thread handles
 *  it as a scroll anchor. */
export default function ChapterView({ chapter: ch, trip }: { chapter: Chapter; trip: Trip }) {
  switch (ch.type) {
    case 'title':
      return (
        <header className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center px-6 py-24">
          {ch.image && <img src={ch.image} alt="" className="w-full max-w-4xl rounded-sm mb-10" />}
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            {ch.heading}
          </h1>
          {ch.subheading && (
            <p className="mt-4 text-lg text-stone-400 max-w-2xl">{ch.subheading}</p>
          )}
          {ch.text && (
            <div className="mt-6 max-w-2xl text-stone-300 leading-8">
              {ch.text.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-4 last:mb-0">{p}</p>)}
            </div>
          )}
          <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-mono">
            {trip.authors.map((a) => a.name).join(' · ')}
          </p>
        </header>
      )

    case 'splash':
      return (
        <section className="relative z-10 h-screen">
          <img src={ch.image} alt="" className="w-full h-full object-cover" />
          {ch.heading && (
            <h2 className="absolute inset-0 flex items-center justify-center text-4xl sm:text-6xl font-bold text-white drop-shadow-lg px-6 text-center">
              {ch.heading}
            </h2>
          )}
        </section>
      )

    case 'article':
      return (
        <Article
          heading={ch.heading}
          subheading={ch.subheading}
          text={ch.text}
          align={ch.align}
          heroImage={ch.heroImage}
          media={ch.media}
          stats={ch.stats ? <Stats trip={trip} legId={ch.stats.legId} /> : null}
        />
      )

    case 'overview':
      return (
        <section className="relative z-10 bg-white pointer-events-auto py-20 px-6 sm:px-12">
          <div className="max-w-2xl mx-auto">
            {ch.heading && (
              <h2 className="text-2xl font-bold text-stone-900 mb-4 leading-snug tracking-tight">{ch.heading}</h2>
            )}
            {ch.text?.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mb-4 text-stone-700 leading-8 text-[1.02rem] last:mb-0">{p}</p>
            ))}
          </div>
        </section>
      )

    case 'image':
      return (
        <figure className="relative z-10 m-0">
          <img src={ch.image} alt={ch.caption ?? ''} loading="lazy" className="w-full" />
          {ch.caption && (
            <figcaption className="text-stone-400 text-sm italic px-6 py-3 text-center">{ch.caption}</figcaption>
          )}
        </figure>
      )

    case 'gallery':
      return <Gallery layout={ch.layout} images={ch.images} />

    case 'video':
    case 'parallax-video':
      return (
        <section className="relative z-10 bg-black">
          <video src={ch.src} poster={ch.poster} muted loop playsInline controls preload="none"
                 className="w-full max-h-[90vh] object-contain mx-auto" />
          {ch.caption && (
            <p className="text-white/70 text-sm italic text-center py-3">{ch.caption}</p>
          )}
        </section>
      )

    case 'logistics':
      return (
        <section className="relative z-10 bg-stone-100 pointer-events-auto py-20 px-6 sm:px-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 mb-4">{ch.heading ?? 'Logistics'}</h2>
            {ch.text?.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mb-4 text-stone-700 leading-8 last:mb-0">{p}</p>
            ))}
            {ch.links?.length ? (
              <ul className="mt-6 space-y-2">
                {ch.links.map((l, i) => (
                  <li key={i} className="text-stone-700">
                    <a href={l.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300 hover:decoration-stone-600">
                      {l.label}
                    </a>
                    {l.note && <span className="text-stone-500"> — {l.note}</span>}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      )

    default:
      return (
        <section className="relative z-10 max-w-2xl mx-auto my-8 px-6 py-4 border border-dashed border-stone-600 rounded text-stone-400 font-mono text-sm">
          <code>{(ch as { type: string }).type}</code> — not rendered yet
        </section>
      )
  }
}

/** Stats bind explicitly to a leg — no inferring from position. */
function Stats({ trip, legId }: { trip: Trip; legId: string }) {
  const leg = trip.sources?.legs?.find((l) => l.id === legId)
  if (!leg?.stats) return null
  const s = leg.stats
  const items: [string, string][] = []
  if (s.distanceM != null) items.push(['distance', `${(s.distanceM / 1000).toFixed(1)} km`])
  if (s.ascentM != null) items.push(['ascent', `${Math.round(s.ascentM)} m`])
  if (s.highPointM != null) items.push(['high point', `${Math.round(s.highPointM)} m`])
  if (s.movingTimeS != null) items.push(['moving', `${(s.movingTimeS / 3600).toFixed(1)} h`])
  if (!items.length) return null
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 my-4 py-3 border-y border-stone-200">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-400 font-mono">{k}</dt>
          <dd className="m-0 text-stone-800 tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
