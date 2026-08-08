import { notFound } from 'next/navigation'
import { getAllTrips, getTrip } from '@/lib/trips'
import Story from '@/components/story/Story'

export function generateStaticParams() {
  return getAllTrips().map(({ trip }) => ({ slug: trip.slug }))
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const trip = getTrip(slug)
  if (!trip) notFound()
  return <Story trip={trip} />
}
