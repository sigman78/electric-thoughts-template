import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
const parser = new MarkdownIt();

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  
  const sortedPosts = posts.sort((a, b) => 
    b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Electric Thoughts',
    description: 'Chronicles from the terminal. Short thoughts on code, systems, and engineering.',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt || '',
      link: `/post/${post.slug}.html`,
      content: sanitizeHtml(parser.render(post.body)),
    })),
    customData: `<language>en</language>`,
  });
}
