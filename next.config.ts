import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Fixture media lives in the blog repo today; stories reference /media/... and
  // /images/... paths that may 404 locally. That's expected until media moves.
  images: { unoptimized: true },
}

export default nextConfig
