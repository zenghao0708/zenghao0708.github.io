'use strict';

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, '');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeHeading(text) {
  return decodeEntities(stripTags(text))
    .replace(/[“”‘’"'`]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

hexo.extend.filter.register('after_render:html', (html, data) => {
  if (!data || !data.path || !String(data.path).startsWith('posts/')) {
    return html;
  }

  const introTitleMatch = html.match(/<h1 class="intro-title">\s*([\s\S]*?)\s*<\/h1>/i);
  const articleMatch = html.match(/(<article class="article-entry">)\s*(<h1\b[^>]*>[\s\S]*?<\/h1>)([\s\S]*?<\/article>)/i);

  if (!introTitleMatch || !articleMatch) {
    return html;
  }

  const introTitle = normalizeHeading(introTitleMatch[1]);
  const articleH1 = normalizeHeading(articleMatch[2]);

  if (!introTitle || introTitle !== articleH1) {
    return html;
  }

  return html.replace(articleMatch[0], `${articleMatch[1]}${articleMatch[3]}`);
});
