import type { Trip } from '@/schema/trip'

type Link = { label: string; url: string; note?: string }
type Quad = { name: string; url: string; year?: number; scale?: string; note?: string }
type Group = { group: string; items: string[] }

/** A local file or a .gpx is a download; anything else opens away. */
const isDownload = (url: string) => url.startsWith('/') || url.endsWith('.gpx')

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
  </svg>
)
const ExternalIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-8.5M15 3h6m0 0v6m0-6L10 14" />
  </svg>
)

/** The end matter: resources, topo quads, packing. Dark, dense, and deliberately
 *  a different register from the narrative — this is the part a future party
 *  reads rather than the part anyone enjoys. */
export default function Logistics({
  heading, subheading, text, links, quads, packing,
}: {
  heading?: string
  subheading?: string
  text?: string
  links?: Link[]
  quads?: Quad[]
  packing?: Group[]
}) {
  return (
    <div className="relative z-10 bg-stone-900 text-stone-200 pointer-events-auto">
      <div className="max-w-4xl mx-auto px-6 sm:px-12 py-20 sm:py-28">
        {subheading && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500 mb-2">{subheading}</p>
        )}
        <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">{heading ?? 'Logistics'}</h2>
        {text && (
          <div className="mb-12 max-w-2xl">
            {text.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="text-stone-400 leading-8 mb-4 last:mb-0">{p}</p>
            ))}
          </div>
        )}

        {links?.length ? (
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-5">Maps &amp; resources</h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {links.map((link, i) => {
                const dl = isDownload(link.url)
                return (
                  <li key={i}>
                    <a
                      href={link.url}
                      target={dl ? undefined : '_blank'}
                      rel={dl ? undefined : 'noopener noreferrer'}
                      download={dl || undefined}
                      className="group flex items-start gap-3 rounded-lg border border-stone-700 hover:border-ember bg-stone-800/40 hover:bg-stone-800 p-4 transition-colors"
                    >
                      <span className="mt-0.5 text-ember shrink-0">{dl ? <DownloadIcon /> : <ExternalIcon />}</span>
                      <span>
                        <span className="block text-sm font-medium text-white group-hover:text-ember transition-colors">
                          {link.label}
                        </span>
                        {link.note && <span className="block text-xs text-stone-500 mt-0.5">{link.note}</span>}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {quads?.length ? (
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-5">USGS topo quads</h3>
            <p className="text-xs text-stone-500 mb-4">In route order, headwaters to coast.</p>
            <ul className="divide-y divide-stone-800 border-t border-b border-stone-800">
              {quads.map((q, i) => (
                <li key={i} className="flex items-center gap-4 py-3">
                  <a href={q.url} download className="group flex items-center gap-3 shrink-0 w-64 sm:w-72">
                    <span className="text-ember shrink-0"><DownloadIcon /></span>
                    <span>
                      <span className="block text-sm font-medium text-white group-hover:text-ember transition-colors">{q.name}</span>
                      {(q.scale || q.year) && (
                        <span className="block text-xs text-stone-500 mt-0.5">
                          {[q.scale, q.year].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </a>
                  <span className="text-sm text-stone-400 italic flex-1">
                    {q.note || <span className="text-stone-600">—</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {packing?.length ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-5">Packing list</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
              {packing.map((g, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-white mb-2.5">{g.group}</h4>
                  <ul className="space-y-1.5">
                    {g.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-stone-400">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-stone-600 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
