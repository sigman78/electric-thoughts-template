import { defineConfig } from 'astro/config';

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
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
