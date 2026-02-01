# Electric Thoughts

A minimalistic tech blog built with Astro v5, optimized for Cloudflare hosting.

## Features

- **Dark minimalistic theme** - Techy aesthetic with electric blue accents
- **Chronological post listing** - Latest posts first with pagination
- **Markdown support** - Blog posts written in Markdown with YAML front matter
- **Syntax highlighting** - Code blocks powered by Shiki
- **Fully responsive** - Works beautifully on desktop and mobile
- **Static generation** - Optimized for Cloudflare Pages/Workers

## Adding Blog Posts

Create a new `.md` file in `src/content/posts/`:

````
---
title: "Your Post Title"
date: 2026-01-31
excerpt: "Brief description of the post"
tags: ["tag1", "tag2"]
draft: false
---

Your markdown content here...

```javascript
// Code blocks work with syntax highlighting
console.log("Hello, World!");
```
````

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Cloudflare Pages

1. Push code to GitHub/GitLab
2. Connect repository in Cloudflare Pages dashboard
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output:** `dist`
4. Deploy!

### Cloudflare Workers

The project is configured with `@astrojs/cloudflare` adapter for serverless deployment.

## Configuration

Change site URL in `astro.config.mjs`: `site: 'https://electric-thoughts.pages.dev'`

### Code Highlighting Theme

Edit `astro.config.mjs`:
```javascript
markdown: {
  shikiConfig: {
    theme: 'github-dark',  // Change theme
    wrap: true
  }
}
```

Available themes: https://shiki.style/themes

### Colors

Edit CSS variables in `src/layouts/Layout.astro`:

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --accent: #00d4ff;
  --accent-dim: #0066aa;
  /* ... */
}
```

## License

MIT
