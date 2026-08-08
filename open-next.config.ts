import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Caching is configured here when we need it. Every route is static today, so
// the defaults are correct: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig()
