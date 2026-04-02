#!/usr/bin/env node
'use strict';

/**
 * 小红书自动发布工具
 * 使用 Chrome CDP 自动化发布图文内容到小红书
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const XHS_WEB_URL = 'https://creator.xiaohongshu.com';
const PROFILE_DIR = path.join(process.env.HOME, '.local/share/xhs-browser-profile');
const KEEP_OPEN = process.env.XHS_KEEP_OPEN === 'true';
const AUDIT_DIR = path.join(__dirname, '..', 'publish', 'output', 'xhs', 'audit');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function captureAudit(page, prefix) {
  ensureDir(AUDIT_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(AUDIT_DIR, `${prefix}-${stamp}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true });
  fs.writeFileSync(`${base}.html`, await page.content(), 'utf8');
  return base;
}

async function clickImagePostCard(page) {
  const clicked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.publish-card')];
    const imageCard = cards.find((el) => (el.innerText || '').includes('发布图文笔记'));
    if (imageCard) {
      imageCard.click();
      return true;
    }

    const fallback = [...document.querySelectorAll('div,button,a')]
      .find((el) => (el.innerText || '').trim() === '发布图文笔记');
    if (fallback) {
      const clickable = fallback.closest('.publish-card,button,a,div');
      if (clickable) {
        clickable.click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) {
    throw new Error('未找到“发布图文笔记”入口');
  }
}

/**
 * 启动浏览器
 */
async function launchBrowser() {
  console.log('[cdp] Launching Chrome (profile: ' + PROFILE_DIR + ')');

  const browser = await puppeteer.launch({
    headless: false, // 小红书需要可见浏览器
    userDataDir: PROFILE_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  return browser;
}

/**
 * 检查登录状态
 */
async function checkLogin(page) {
  console.log('[xhs] Checking login status...');

  await page.goto(XHS_WEB_URL, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 检查是否需要登录
  const needLogin = await page.evaluate(() => {
    return document.querySelector('.login-btn') !== null ||
           document.querySelector('.login-container') !== null ||
           window.location.href.includes('login');
  });

  if (needLogin) {
    console.log('[xhs] Not logged in. Please scan QR code...');

    // 等待用户扫码登录
    await page.waitForFunction(() => {
      return !window.location.href.includes('login') &&
             document.querySelector('.creator-header') !== null;
    }, { timeout: 120000 }); // 2 分钟超时

    console.log('[xhs] Logged in.');
  } else {
    console.log('[xhs] Already logged in.');
  }
}

/**
 * 发布图文内容
 */
async function publishPost(page, payload) {
  console.log('[xhs] Starting to publish post...');
  const content = payload.content || payload.caption || '';
  const tags = Array.isArray(payload.tags) ? payload.tags : [];

  // 1. 点击新版首页里的“发布图文笔记”卡片
  if (!String(page.url()).includes('target=image')) {
    console.log('[xhs] Opening image post editor...');
    await clickImagePostCard(page);
    await page.waitForFunction(() => window.location.href.includes('target=image'), { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // 2. 上传图片
  if (payload.images && payload.images.length > 0) {
    console.log(`[xhs] Uploading ${payload.images.length} images...`);

    const uploadInput = await page.waitForSelector('input.upload-input, input[type="file"]', { timeout: 15000 });

    const validImages = [];
    for (const imagePath of payload.images) {
      if (fs.existsSync(imagePath)) {
        validImages.push(imagePath);
        console.log(`[xhs] Queued: ${path.basename(imagePath)}`);
      } else {
        console.warn(`[xhs] Image not found: ${imagePath}`);
      }
    }
    if (validImages.length === 0) {
      throw new Error('没有可上传的图片');
    }
    await uploadInput.uploadFile(...validImages);

    // 等待所有图片上传完成
    await page.waitForSelector('input[placeholder*="填写标题"]', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    throw new Error('图文笔记至少需要 1 张图片');
  }

  // 3. 填写标题
  console.log('[xhs] Filling title...');
  const titleInput = await page.waitForSelector('input[placeholder*="填写标题"], input[placeholder*="标题"], .title-input', { timeout: 15000 });
  await titleInput.click();
  await titleInput.evaluate((el) => { el.value = ''; });
  await titleInput.type(payload.title, { delay: 50 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // 4. 填写正文
  console.log('[xhs] Filling content...');
  const contentInput = await page.waitForSelector('.tiptap.ProseMirror, [contenteditable="true"], textarea[placeholder*="正文"], .content-input', { timeout: 15000 });
  await contentInput.click();
  await page.keyboard.type(content, { delay: 20 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // 5. 添加话题标签
  if (tags.length > 0) {
    console.log('[xhs] Adding tags...');

    for (const tag of tags) {
      // 在正文中添加话题（小红书格式：#话题#）
      await page.keyboard.type(`\n${tag}`, { delay: 20 });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 7. 选择封面（如果有多张图片）
  if (payload.images && payload.images.length > 1) {
    console.log('[xhs] Selecting cover image...');
    // 小红书会自动选择第一张图片作为封面
    // 如果需要更改，可以在这里添加逻辑
  }

  // 8. 发布设置
  console.log('[xhs] Configuring publish settings...');

  // 检查是否有"发布设置"按钮
  const settingsBtn = await page.$('.publish-settings-btn, .settings-btn');
  if (settingsBtn) {
    await settingsBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 设置为公开
    const publicOption = await page.$('[data-visibility="public"], .public-option');
    if (publicOption) {
      await publicOption.click();
    }

    // 允许评论
    const commentOption = await page.$('[data-comment="allow"], .allow-comment');
    if (commentOption) {
      await commentOption.click();
    }
  }

  // 6. 点击"发布"按钮
  console.log('[xhs] Publishing...');
  const beforePublishUrl = page.url();
  const publishBtn = await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find((el) => (el.innerText || '').trim() === '发布') || null;
  }, { timeout: 15000 });
  const publishHandle = await publishBtn.asElement();
  if (!publishHandle) {
    throw new Error('未找到发布按钮');
  }
  await publishHandle.click();

  // 7. 等待发布完成
  console.log('[xhs] Waiting for publish confirmation...');
  try {
    await page.waitForFunction((initialUrl) => {
      const text = (document.body && document.body.innerText) || '';
      const hasResultText = /发布成功|笔记发布成功|审核中|发布完成|查看笔记|创作中心|笔记管理/.test(text);
      const urlChanged = window.location.href !== initialUrl;
      const leftPublishEditor = !window.location.href.includes('target=image');
      const publishButtonGone = ![...document.querySelectorAll('button')]
        .some((el) => (el.innerText || '').trim() === '发布');
      const titleInputGone = !document.querySelector('input[placeholder*="填写标题"], input[placeholder*="标题"], .title-input');

      return hasResultText || urlChanged || leftPublishEditor || (publishButtonGone && titleInputGone);
    }, { timeout: 30000 }, beforePublishUrl);
  } catch (error) {
    const auditBase = await captureAudit(page, 'xhs-publish-failed');
    throw new Error(`Waiting failed: 30000ms exceeded (audit: ${auditBase}.png)`);
  }

  console.log('[xhs] Post published successfully!');

  // 获取发布结果
  const postUrl = await page.evaluate(() => {
    const linkEl = document.querySelector('.post-link, .share-link');
    return linkEl ? linkEl.href : null;
  });

  return {
    success: true,
    url: postUrl
  };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/post-xhs.js <payload-json-file>');
    console.log('\nPayload format:');
    console.log(JSON.stringify({
      title: '标题',
      content: '正文内容',
      images: ['/path/to/image1.jpg', '/path/to/image2.jpg'],
      tags: ['#话题1', '#话题2']
    }, null, 2));
    process.exit(1);
  }

  const payloadFile = args[0];
  if (!fs.existsSync(payloadFile)) {
    console.error(`❌ Payload file not found: ${payloadFile}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // 设置视口
    await page.setViewport({ width: 1280, height: 800 });

    // 检查登录状态
    await checkLogin(page);

    // 发布内容
    const result = await publishPost(page, payload);

    console.log('\n✅ 发布成功！');
    if (result.url) {
      console.log(`📱 笔记链接: ${result.url}`);
    }

    if (KEEP_OPEN) {
      console.log('\n💡 浏览器将保持打开状态，按 Ctrl+C 关闭');
      await new Promise(() => {}); // 永久等待
    } else {
      console.log('\n[xhs] Publish flow completed, closing browser.');
      await browser.close();
    }

  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
  }
}

// 导出函数
module.exports = {
  launchBrowser,
  checkLogin,
  publishPost
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
