import Link from 'next/link'
import DrawnLine from '@/components/landing/DrawnLine'

export const metadata = {
  title: 'oku',
  description: 'Trip stories, where the trip is the unit and the data does the assembly.',
}

export default function Landing() {
  return (
    <main className="landing">
      <DrawnLine />

      <section className="lp lp--open">
        <p className="mark" lang="ja">奥</p>
        <blockquote className="passage passage--lead">
          The months and days are the travellers of eternity.
          <br />
          The years that come and go are also voyagers.
        </blockquote>
      </section>

      <section className="lp lp--mid">
        <blockquote className="passage">
          There came a day when the clouds drifting along with the wind aroused a wanderlust in me,
          and I set off on a journey to roam along the seashores.
        </blockquote>
        <p className="cite">
          Matsuo Bashō, <cite>Oku no Hosomichi</cite>, 1689
          <span className="trans">translated by Donald Keene</span>
        </p>
      </section>

      <section className="lp lp--what">
        <h1>oku</h1>
        <p className="lede">
          A place to tell the story of a trip — the days, the ground covered, the photographs, and
          the words — as one thing rather than four.
        </p>
        <p className="note">
          Strava tells people you did it. This is for telling them what it was like.
        </p>
      </section>

      <footer className="lp lp--foot">
        <p className="building">
          Being built, slowly and in the open.
          <br />
          <Link href="/stories">A few stories are already here →</Link>
        </p>
        <p className="colophon">
          <span lang="ja">奥</span> — the deep interior; the part of a place that takes effort to
          reach.
        </p>
      </footer>
    </main>
  )
}
