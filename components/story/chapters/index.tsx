import type { ResolvedTrip as Trip, ResolvedChapter as Chapter } from '@/schema/trip'
import Gallery from './Gallery'
import Panorama from './Panorama'
import Article from './Article'
import ParallaxVideo from './ParallaxVideo'
import Title from './Title'
import Logistics from './Logistics'
import Overview from './Overview'

/** Renders one content chapter. `move` never reaches here — the thread handles
 *  it as a scroll anchor. */
export default function ChapterView({ chapter: ch, trip }: { chapter: Chapter; trip: Trip }) {
  switch (ch.type) {
    case 'title':
      return (
        <Title
          heading={ch.heading}
          subheading={ch.subheading}
          text={ch.text}
          image={ch.image}
          layout={ch.layout}
          byline={trip.authors.map((a) => a.name).join(' · ')}
        />
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

    case 'overview': {
      const stage = trip.stage?.type === 'map' ? trip.stage : undefined
      return (
        <Overview
          heading={ch.heading}
          subheading={ch.subheading}
          text={ch.text}
          styleUrl={stage?.style}
          route={stage?.route as [number, number][] | undefined}
          pins={stage?.pins}
        />
      )
    }

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

    case 'panorama':
      return (
        <Panorama
          src={ch.src!}
          caption={ch.caption}
          heading={ch.heading}
          annotations={ch.annotations}
          rate={ch.rate}
        />
      )

    case 'parallax-video':
      return (
        <ParallaxVideo
          src={ch.src}
          poster={ch.poster}
          loop={ch.loop}
          caption={ch.caption}
          heading={ch.heading}
          subheading={ch.subheading}
          text={ch.text}
          align={ch.align}
          layout={ch.layout}
        />
      )

    case 'video':
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
        <Logistics
          heading={ch.heading}
          subheading={ch.subheading}
          text={ch.text}
          links={ch.links}
          quads={ch.quads}
          packing={ch.packing}
        />
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
