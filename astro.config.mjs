import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

const SERVIDOR = process.env.PDV_SITE_SERVIDOR || 'http://localhost:3000'

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    resolve: {
      alias: {
        '@pdv/core': fileURLToPath(new URL('./src/lib/core-compat.ts', import.meta.url)),
        '@pdv/server/api': fileURLToPath(new URL('./src/lib/server-types.ts', import.meta.url)),
      },
    },
    server: {
      strictPort: true,
      proxy: { '/trpc': SERVIDOR },
    },
    preview: {
      strictPort: true,
      proxy: { '/trpc': SERVIDOR },
    },
  },
})
