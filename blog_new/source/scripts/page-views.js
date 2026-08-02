(function () {
  var config = window.__COOLZENG_PAGE_VIEWS__ || {};
  if (!config.enable) return;

  var apiBases = []
    .concat(config.apiBases || config.apiBase || [])
    .map(function (item) { return String(item || '').replace(/\/+$/, ''); })
    .filter(Boolean);
  if (apiBases.length === 0) return;
  var requestTimeoutMs = Math.max(500, Number(config.timeoutMs || 2500));

  var pageUrl = normalizePath(window.location.pathname);
  var title = document.title.replace(/\s*·\s*.*$/, '');
  var isPostPage = document.body && document.body.classList.contains('post-body');

  function normalizePath(pathname) {
    var path = String(pathname || '/');
    if (!path.startsWith('/')) path = '/' + path;
    return path.replace(/\/index\.html$/, '/');
  }

  function formatCount(value) {
    var number = Number(value || 0);
    if (!Number.isFinite(number)) return '0';
    return String(number);
  }

  function requestJson(url, options) {
    var requestOptions = Object.assign({}, options || {});
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    if (controller) {
      requestOptions.signal = controller.signal;
      timer = setTimeout(function () { controller.abort(); }, requestTimeoutMs);
    }
    return fetch(url, requestOptions).then(function (response) {
      if (!response.ok) throw new Error('page views request failed: ' + response.status);
      return response.json();
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function requestFirst(path, options) {
    var index = 0;
    function next() {
      var base = apiBases[index++];
      if (!base) return Promise.reject(new Error('all page view endpoints failed'));
      return requestJson(base + path, options).catch(next);
    }
    return next();
  }

  function ensurePageViewElement() {
    var value = document.getElementById('busuanzi_value_page_pv');
    if (value) return value;

    var meta = document.querySelector('.post-intro-meta');
    var time = document.querySelector('.post-intro-time');
    if (!meta || !time) return null;

    var wrapper = document.createElement('span');
    wrapper.className = 'page-views-pv busuanzi-pv';
    wrapper.innerHTML = '<span class="iconfont-archer post-intro-busuanzi">&#xe602;</span><span class="page-views-value">--</span>';
    meta.insertBefore(wrapper, time.nextSibling);
    return wrapper.querySelector('.page-views-value');
  }

  function ensureSiteTotalElement() {
    var value = document.getElementById('busuanzi_value_site_pv');
    if (value) return value;

    var footer = document.querySelector('.footer');
    if (!footer) return null;

    var container = document.createElement('div');
    container.className = 'busuanzi-container page-views-site-container';
    container.innerHTML = '<span id="page_views_container_site_pv">PV: <span class="page-views-site-value">--</span> :)</span>';
    footer.appendChild(container);
    return container.querySelector('.page-views-site-value');
  }

  function updatePageView() {
    var value = ensurePageViewElement();
    if (!value) return;

    requestFirst('/api/views/increment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: pageUrl, title: title })
    }).then(function (data) {
      value.textContent = formatCount(data.views);
    }).catch(function () {
      value.textContent = '--';
    });
  }

  function updateSiteTotal() {
    if (config.siteTotal === false) return;
    var value = ensureSiteTotalElement();
    if (!value) return;

    requestFirst('/api/views/site').then(function (data) {
      value.textContent = formatCount(data.views);
    }).catch(function () {
      value.textContent = '--';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (isPostPage) updatePageView();
      updateSiteTotal();
    });
  } else {
    if (isPostPage) updatePageView();
    updateSiteTotal();
  }
})();
