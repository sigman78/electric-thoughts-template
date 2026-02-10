import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://electric-thoughts.pages.dev',
  output: 'static',
  build: {
    format: 'file',
  },
  trailingSlash: 'never',
  prefetch: {
    defaultStrategy: 'hover',
  },
  adapter: cloudflare({
    imageService: 'passthrough'
  }),
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
