import Link from 'next/link'
import DrawnLine from '@/components/landing/DrawnLine'
import Landscape from '@/components/landing/Landscape'

export const metadata = {
  title: 'oku',
  description: 'Trip stories, where the trip is the unit and the data does the assembly.',
}

export default function Landing() {
  return (
    <main className="relative max-w-4xl mx-auto px-6">
      <DrawnLine />

      <section className="relative min-h-screen flex flex-col justify-center">
        <Landscape variant="mountains" side="right" />
        <p className="relative z-10 text-5xl mb-10 leading-none text-ember font-normal" lang="ja">奥</p>
        <blockquote className="relative z-10 m-0 text-[clamp(1.6rem,4.2vw,2.9rem)] leading-[1.32] tracking-tight text-balance max-w-[20ch]">
          The months and days are the travellers of eternity.
          <br />
          The years that come and go are also voyagers.
        </blockquote>
      </section>

      <section className="relative min-h-[90vh] flex flex-col justify-center items-start md:items-end md:text-right">
        <Landscape variant="coast" side="left" />
        <blockquote className="relative z-10 m-0 text-[clamp(1.6rem,4.2vw,2.9rem)] leading-[1.32] tracking-tight text-balance max-w-[26ch]">
          There came a day when the clouds drifting along with the wind aroused a wanderlust in me,
          and I set off on a journey to roam along the seashores.
        </blockquote>
        <p className="relative z-10 mt-7 text-stone-500 font-mono text-[0.74rem] tracking-wide leading-[1.8]">
          Matsuo Bashō, <cite>Oku no Hosomichi</cite>, 1689
          <span className="block opacity-70">translated by Donald Keene</span>
        </p>
      </section>

      <section className="relative z-10 min-h-[85vh] flex flex-col justify-center max-w-xl">
        <h1 className="text-base mb-6 font-normal font-mono uppercase tracking-[0.34em] text-ember">oku</h1>
        <p className="m-0 mb-5 text-xl leading-relaxed text-pretty">
          A place to tell the story of a trip — the days, the ground covered, the photographs, and
          the words — as one thing rather than four.
        </p>
        <p className="m-0 text-stone-500 text-lg">
          Strava tells people you did it. This is for telling them what it was like.
        </p>
      </section>

      <footer className="relative z-10 min-h-[60vh] flex flex-col justify-center border-t border-white/10">
        <p className="m-0 mb-10 text-lg leading-loose">
          Being built, slowly and in the open.
          <br />
          <Link href="/stories" className="text-ember no-underline hover:underline">A few stories are already here →</Link>
        </p>
        <p className="m-0 text-stone-500 font-mono text-[0.74rem] leading-[1.8] max-w-[36ch]">
          <span lang="ja" className="text-ember">奥</span> — the deep interior; the part of a place that takes effort to
          reach.
        </p>
      </footer>
    </main>
  )
}
