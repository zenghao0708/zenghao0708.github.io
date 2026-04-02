#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const WIDTH = 1080;
const HEIGHT = 1440;
const OUT_DIR = path.resolve(
  process.cwd(),
  'blog_new/source/_posts/我为什么不用oh-my-zsh了-命令行效率工具迁移复盘'
);

function wrapHtml(body, extraCss = '') {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #10233b;
      background:
        radial-gradient(circle at top right, rgba(45, 212, 191, 0.30), transparent 24%),
        radial-gradient(circle at bottom left, rgba(14, 116, 144, 0.18), transparent 22%),
        linear-gradient(160deg, #f3fbfb 0%, #dff6f4 100%);
      overflow: hidden;
    }
    .card {
      width: 100%;
      height: 100%;
      padding: 72px;
      position: relative;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.10);
      color: #0f766e;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    h1 {
      margin: 28px 0 18px;
      font-size: 86px;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: #0f172a;
    }
    .subtitle {
      margin: 0;
      font-size: 36px;
      line-height: 1.65;
      color: #365069;
    }
    .panel {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 20px 70px rgba(15, 23, 42, 0.10);
      border-radius: 34px;
      backdrop-filter: blur(14px);
    }
    .grid {
      display: grid;
      gap: 18px;
    }
    .label {
      font-size: 24px;
      color: #4b6b88;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .token {
      padding: 16px 20px;
      border-radius: 18px;
      background: #f7ffff;
      border: 1px solid rgba(15, 118, 110, 0.10);
      color: #134e4a;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
    }
    .muted-token {
      padding: 16px 20px;
      border-radius: 18px;
      background: #fff8f3;
      border: 1px solid rgba(180, 83, 9, 0.12);
      color: #9a3412;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
    }
    .step {
      display: grid;
      grid-template-columns: 78px 1fr;
      gap: 18px;
      align-items: start;
    }
    .num {
      width: 78px;
      height: 78px;
      border-radius: 24px;
      background: linear-gradient(160deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      display: grid;
      place-items: center;
      font-size: 34px;
      font-weight: 800;
      box-shadow: 0 16px 36px rgba(20, 184, 166, 0.25);
    }
    .step h3 {
      margin: 2px 0 10px;
      font-size: 34px;
      line-height: 1.25;
      color: #0f172a;
    }
    .step p {
      margin: 0;
      font-size: 28px;
      line-height: 1.7;
      color: #47627e;
    }
    .footer-note {
      position: absolute;
      left: 72px;
      right: 72px;
      bottom: 56px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 24px;
      color: #54718c;
    }
    .bar {
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, #14b8a6 0%, #38bdf8 100%);
    }
    ${extraCss}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function cardWhy() {
  return wrapHtml(`
  <div class="card">
    <div class="eyebrow">WHY MIGRATE</div>
    <h1>为什么我不再继续用<br />oh-my-zsh</h1>
    <p class="subtitle">不是它突然不好用了，而是我的主力开发机已经不适合继续靠一个“大一统入口”兜底所有职责。</p>
    <div class="panel" style="margin-top: 46px; padding: 34px;">
      <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 22px;">
        <div style="padding: 12px 8px;">
          <div class="label">旧环境信号</div>
          <div class="grid" style="margin-top: 16px;">
            <div class="muted-token">启动越来越慢</div>
            <div class="muted-token">重复初始化</div>
            <div class="muted-token">PATH 越叠越乱</div>
            <div class="muted-token">出问题很难定位</div>
          </div>
        </div>
        <div style="padding: 12px 8px;">
          <div class="label">真正的问题</div>
          <div class="grid" style="margin-top: 16px;">
            <div class="token">插件 / prompt / 历史 / 跳转 / 运行时</div>
            <div class="token">全部揉进同一个 shell 入口</div>
            <div class="token">每一项都合理</div>
            <div class="token">叠很多年后就失控</div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-note">
      <span>主力开发机环境迁移复盘</span>
      <span>01 / 03</span>
    </div>
  </div>`);
}

function cardStack() {
  return wrapHtml(`
  <div class="card">
    <div class="eyebrow">OLD VS NEW</div>
    <h1>从 old stack 到<br />clean stack</h1>
    <p class="subtitle">这次迁移的核心不是“换工具”，而是把职责拆清楚，让每一层都知道自己在管什么。</p>
    <div class="grid" style="grid-template-columns: 1fr 92px 1fr; margin-top: 50px; align-items: center;">
      <div class="panel" style="padding: 30px;">
        <div class="label">之前</div>
        <div class="grid" style="margin-top: 18px;">
          <div class="muted-token">oh-my-zsh</div>
          <div class="muted-token">p10k / alias / completion</div>
          <div class="muted-token">nvm / rbenv / Homebrew</div>
          <div class="muted-token">各种脚本混在 .zshrc</div>
        </div>
      </div>
      <div style="display:grid;place-items:center;">
        <div class="bar" style="width: 92px;"></div>
      </div>
      <div class="panel" style="padding: 30px;">
        <div class="label">之后</div>
        <div class="grid" style="margin-top: 18px;">
          <div class="token">sheldon 管插件</div>
          <div class="token">starship 管 prompt</div>
          <div class="token">atuin / zoxide 管交互</div>
          <div class="token">mise 管 Ruby / Node</div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top: 34px; padding: 28px 30px;">
      <div class="label">真正收益</div>
      <p class="subtitle" style="margin-top: 10px;">以后再出问题，我知道该去查哪一层，而不是一头扎进越来越长的 <code>.zshrc</code> 里靠猜。</p>
    </div>
    <div class="footer-note">
      <span>边界比速度更重要</span>
      <span>02 / 03</span>
    </div>
  </div>`, `
    code { font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size: 0.92em; background: rgba(15, 23, 42, 0.05); padding: 0.08em 0.28em; border-radius: 8px; }
  `);
}

function cardChecklist() {
  return wrapHtml(`
  <div class="card">
    <div class="eyebrow">MIGRATION CHECKLIST</div>
    <h1>我最认可的迁移原则</h1>
    <p class="subtitle">这次迁移真正帮我避免翻车的，不是某个具体工具，而是这套“先拆结构、并行接管、最后切流”的方法。</p>
    <div class="panel" style="margin-top: 42px; padding: 34px 30px;">
      <div class="grid" style="gap: 26px;">
        <div class="step">
          <div class="num">1</div>
          <div>
            <h3>先量化问题，再动配置</h3>
            <p>先看 shell 启动耗时、PATH 和 which，而不是凭体感判断“好像变快了”。</p>
          </div>
        </div>
        <div class="step">
          <div class="num">2</div>
          <div>
            <h3>不要只验版本号，要验所有权</h3>
            <p><code>which node</code> / <code>mise which node</code> 比单看 <code>node -v</code> 更关键。</p>
          </div>
        </div>
        <div class="step">
          <div class="num">3</div>
          <div>
            <h3>旧链路要真正退出</h3>
            <p>迁移完成后继续清掉 <code>.nvm</code>、<code>.rbenv</code> 残留和重复加载，不然问题会在后面回潮。</p>
          </div>
        </div>
        <div class="step">
          <div class="num">4</div>
          <div>
            <h3>先准备回滚，再谈切换</h3>
            <p>主力开发机迁移最怕的不是改错，而是改错以后没法快速退回稳定状态。</p>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-note">
      <span>结构化迁移 > 一把梭重装</span>
      <span>03 / 03</span>
    </div>
  </div>`, `
    code { font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size: 0.90em; background: rgba(15, 23, 42, 0.05); padding: 0.08em 0.28em; border-radius: 8px; }
  `);
}

async function screenshot(browser, name, html) {
  const htmlPath = path.join(OUT_DIR, `${name}.html`);
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: pngPath, type: 'png', fullPage: false });
  await page.close();
  return { htmlPath, pngPath };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const outputs = [];
    outputs.push(await screenshot(browser, 'ohmyzsh-why-migrate', cardWhy()));
    outputs.push(await screenshot(browser, 'ohmyzsh-stack-compare', cardStack()));
    outputs.push(await screenshot(browser, 'ohmyzsh-migration-checklist', cardChecklist()));
    console.log(JSON.stringify(outputs, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
