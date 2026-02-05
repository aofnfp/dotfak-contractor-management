import type { OpenNextConfig } from '@opennextjs/cloudflare'

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      incrementalCache: 'dummy', // Can be upgraded to KV/R2 later
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
}

export default config
