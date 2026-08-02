/* global hexo */

'use strict';

hexo.extend.filter.register('after_render:html', function (html) {
  const pageViews = (hexo.theme.config && hexo.theme.config.page_views) || {};
  if (!pageViews.enable || html.includes('__COOLZENG_PAGE_VIEWS__')) return html;

  const config = {
    enable: true,
    apiBase: pageViews.api_base || '',
    apiBases: Array.isArray(pageViews.api_bases) ? pageViews.api_bases.filter(Boolean) : [],
    siteTotal: pageViews.site_total !== false,
    timeoutMs: Number(pageViews.request_timeout_ms || 2500)
  };
  const root = String(hexo.config.root || '/').replace(/\/?$/, '/');
  const sourceVersion = hexo.theme.config.source_version || Date.now();
  const serializedConfig = JSON.stringify(config).replace(/</g, '\\u003c');
  const injection = [
    `<script>window.__COOLZENG_PAGE_VIEWS__ = ${serializedConfig};</script>`,
    `<script src="${root}scripts/page-views.js?v=${sourceVersion}" defer></script>`
  ].join('\n');

  return html.replace(/<\/body>/i, `${injection}\n</body>`);
});
