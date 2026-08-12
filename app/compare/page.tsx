import { notFound } from 'next/navigation'
import { TopoCoast, TopoMountains, TOPO_STATS } from '@/components/landing/topo'
import { InkCoast, InkMountains } from '@/components/landing/Landscape'

/** DEV-ONLY: the two drawing idioms side by side, so the choice is made by looking. */
export default function Compare() {
  if (process.env.NODE_ENV === 'production') notFound()

  const cell = 'rounded border border-white/10 p-6 text-stone-300'
  const label = 'mb-4 font-mono text-[11px] uppercase tracking-wider text-stone-500'

  return (
    <main className="min-h-screen bg-[#14181a] p-10">
      <h1 className="m-0 mb-8 font-mono text-[11px] uppercase tracking-wider text-stone-500">
        Landing drawings — ink (hand-authored) vs topo (computed contours)
      </h1>
      <div className="grid grid-cols-2 gap-8 max-w-5xl">
        <div className={cell}>
          <p className={label}>Ink · mountains</p>
          <InkMountains />
        </div>
        <div className={cell}>
          <p className={label}>Topo · mountains — {TOPO_STATS.mountains} contours</p>
          <TopoMountains />
        </div>
        <div className={cell}>
          <p className={label}>Ink · coast</p>
          <InkCoast />
        </div>
        <div className={cell}>
          <p className={label}>Topo · coast — {TOPO_STATS.coast} contours</p>
          <TopoCoast />
        </div>
      </div>
    </main>
  )
}
