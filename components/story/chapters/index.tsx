import type { Trip, Chapter } from '@/schema/trip'

/** Renders one content chapter. `move` never reaches here — it's handled in the
 *  thread as a scroll anchor. */
export default function ChapterView({ chapter: ch, trip }: { chapter: Chapter; trip: Trip }) {
  switch (ch.type) {
    case 'title':
      return (
        <header className="ch ch--title">
          {ch.image && <img src={ch.image} alt="" className="ch-hero" />}
          <h1>{ch.heading}</h1>
          {ch.subheading && <p className="sub">{ch.subheading}</p>}
          {ch.text && <Prose text={ch.text} />}
          <Byline trip={trip} />
        </header>
      )

    case 'splash':
      return (
        <section className="ch ch--splash">
          <img src={ch.image} alt="" />
          {ch.heading && <h2>{ch.heading}</h2>}
        </section>
      )

    case 'article':
      return (
        <section className={`ch ch--article ch--${ch.align ?? 'left'}`}>
          <div className="card">
            {ch.heading && <h2>{ch.heading}</h2>}
            {ch.subheading && <p className="sub">{ch.subheading}</p>}
            {ch.stats && <Stats trip={trip} legId={ch.stats.legId} />}
            {ch.text && <Prose text={ch.text} />}
          </div>
        </section>
      )

    case 'overview':
      return (
        <section className="ch ch--overview">
          {ch.heading && <h2>{ch.heading}</h2>}
          {ch.text && <Prose text={ch.text} />}
        </section>
      )

    case 'image':
      return (
        <figure className="ch ch--image">
          <img src={ch.image} alt={ch.caption ?? ''} />
          {ch.caption && <figcaption>{ch.caption}</figcaption>}
        </figure>
      )

    case 'gallery':
      return (
        <section className={`ch ch--gallery layout--${ch.layout}`}>
          {ch.images.map((im, i) => (
            <figure key={i}>
              <img src={im.src} alt={im.caption ?? ''} />
              {im.caption && <figcaption>{im.caption}</figcaption>}
            </figure>
          ))}
        </section>
      )

    case 'video':
    case 'parallax-video':
      return (
        <section className="ch ch--video">
          <video src={ch.src} poster={ch.poster} muted loop playsInline controls />
          {'heading' in ch && ch.heading && <h2>{ch.heading}</h2>}
          {'text' in ch && ch.text && <Prose text={ch.text} />}
          {ch.caption && <p className="cap">{ch.caption}</p>}
        </section>
      )

    case 'logistics':
      return (
        <section className="ch ch--logistics">
          <div className="card">
            <h2>{ch.heading ?? 'Logistics'}</h2>
            {ch.text && <Prose text={ch.text} />}
            {ch.links?.length ? (
              <ul>
                {ch.links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                    {l.note && <span className="note"> — {l.note}</span>}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      )

    default:
      return (
        <section className="ch ch--todo">
          <code>{(ch as { type: string }).type}</code> — not rendered yet
        </section>
      )
  }
}

/** Deliberately minimal. Markdown flavour is an open question in the spec, so
 *  this splits paragraphs and nothing more rather than guessing. */
function Prose({ text }: { text: string }) {
  return (
    <div className="prose">
      {text.trim().split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

function Byline({ trip }: { trip: Trip }) {
  return <p className="byline">{trip.authors.map((a) => a.name).join(' · ')}</p>
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
    <dl className="stats">
      {items.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  )
}
