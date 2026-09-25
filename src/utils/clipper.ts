import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
// @ts-expect-error - turndown-plugin-gfm doesn't provide full TS definitions
import { gfm } from 'turndown-plugin-gfm';

export interface ClippedArticle {
  title: string;
  byline: string | null;
  siteName: string | null;
  markdown: string;
  originalUrl: string;
}

export function parseAndConvertHtmlToMarkdown(html: string, originalUrl: string): ClippedArticle {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove script, style, and annoying ad elements before readability
  doc.querySelectorAll('script, style, noscript, iframe, .advertisement, .ad-banner, .cookie-banner').forEach(el => el.remove());

  const reader = new Readability(doc, {
    charThreshold: 20,
    keepClasses: false,
  });

  const article = reader.parse();

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Apply GitHub Flavored Markdown (tables, task lists, strikethrough)
  try {
    turndownService.use(gfm);
  } catch (err) {
    console.warn('GFM plugin registration error:', err);
  }

  // Custom rule for images to ensure clean formatting
  turndownService.addRule('cleanImages', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.getAttribute('alt') || '';
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:image/svg')) return '';
      return `![${alt}](${src})`;
    }
  });

  const contentToConvert = article?.content || doc.body.innerHTML;
  let markdown = turndownService.turndown(contentToConvert);

  // Clean extra blank lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  const title = (article?.title || doc.title || 'Игровой Гайд').trim();

  const fullMarkdown = `# 📖 ${title}

> 🌐 **Источник:** [${originalUrl}](${originalUrl})  
> 🕒 **Сохранено:** ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}  

---

${markdown}
`;

  return {
    title,
    byline: article?.byline || null,
    siteName: article?.siteName || null,
    markdown: fullMarkdown,
    originalUrl,
  };
}
