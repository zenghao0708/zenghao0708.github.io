#!/usr/bin/env node
'use strict';

/**
 * 小红书自动发布工具（使用已登录的 Chrome）
 * 使用用户已登录的 Chrome 浏览器配置文件
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const XHS_WEB_URL = 'https://creator.xiaohongshu.com';
// 使用用户的 Chrome 配置文件
const CHROME_USER_DATA = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome');
const CHROME_PROFILE = 'Default'; // 或 'Profile 1', 'Profile 2' 等

/**
 * 启动浏览器（使用已登录的 Chrome）
 */
async function launchBrowser() {
  console.log('[cdp] Launching Chrome with user profile...');
  console.log(`[cdp] User Data: ${CHROME_USER_DATA}`);
  console.log(`[cdp] Profile: ${CHROME_PROFILE}`);

  const browser = await puppeteer.launch({
    headless: false, // 小红书需要可见浏览器
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: CHROME_USER_DATA,
    args: [
      `--profile-directory=${CHROME_PROFILE}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  return browser;
}

/**
 * 检查登录状态
 */
async function checkLogin(page) {
  console.log('[xhs] Checking login status...');

  await page.goto(XHS_WEB_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 检查是否需要登录
  const needLogin = await page.evaluate(() => {
    return document.querySelector('.login-btn') !== null ||
           document.querySelector('.login-container') !== null ||
           window.location.href.includes('login');
  });

  if (needLogin) {
    console.log('[xhs] ⚠️  未登录，请在浏览器中登录小红书创作者平台');
    console.log('[xhs] 登录后按 Enter 继续...');

    // 等待用户手动登录
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // 刷新页面检查登录状态
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[xhs] Logged in.');
  } else {
    console.log('[xhs] ✅ Already logged in.');
  }
}

/**
 * 发布图文内容
 */
async function publishPost(page, payload) {
  console.log('[xhs] Starting to publish post...');

  try {
    // 1. 点击"发布笔记"按钮
    console.log('[xhs] Looking for publish button...');

    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 尝试多种可能的选择器
    const publishSelectors = [
      'button:has-text("发布笔记")',
      'button:has-text("发布")',
      '.publish-btn',
      '.create-btn',
      '[data-testid="publish-button"]'
    ];

    let publishBtn = null;
    for (const selector of publishSelectors) {
      try {
        publishBtn = await page.$(selector);
        if (publishBtn) {
          console.log(`[xhs] Found publish button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!publishBtn) {
      console.log('[xhs] ⚠️  未找到发布按钮，请手动点击"发布笔记"按钮');
      console.log('[xhs] 点击后按 Enter 继续...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    } else {
      await publishBtn.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 2. 选择"图文"类型
    console.log('[xhs] Selecting image-text type...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 上传图片
    if (payload.images && payload.images.length > 0) {
      console.log(`[xhs] Uploading ${payload.images.length} images...`);

      // 查找文件上传输入框
      const uploadInput = await page.$('input[type="file"]');

      if (uploadInput) {
        // 一次性上传所有图片
        await uploadInput.uploadFile(...payload.images);
        console.log(`[xhs] ✅ Uploaded ${payload.images.length} images`);

        // 等待图片上传完成
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('[xhs] ⚠️  未找到上传按钮，请手动上传图片');
        console.log('[xhs] 上传完成后按 Enter 继续...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }
    }

    // 4. 填写标题
    console.log('[xhs] Filling title...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 使用剪贴板复制标题
    await page.evaluate((title) => {
      navigator.clipboard.writeText(title);
    }, payload.title);

    console.log(`[xhs] 标题已复制到剪贴板: ${payload.title}`);
    console.log('[xhs] 请手动粘贴标题，完成后按 Enter 继续...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // 5. 填写正文
    console.log('[xhs] Filling content...');

    // 使用剪贴板复制正文
    const fullContent = payload.content + '\n\n' + payload.tags.join(' ');
    await page.evaluate((content) => {
      navigator.clipboard.writeText(content);
    }, fullContent);

    console.log('[xhs] 正文已复制到剪贴板');
    console.log('[xhs] 请手动粘贴正文和话题标签，完成后按 Enter 继续...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // 6. 等待用户手动发布
    console.log('[xhs] 请检查内容并点击"发布"按钮');
    console.log('[xhs] 发布完成后按 Enter 继续...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('[xhs] ✅ Post published successfully!');

    return {
      success: true,
      url: null
    };

  } catch (error) {
    console.error('[xhs] Error during publish:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node xhs-publish-manual.js <payload-json-file>');
    process.exit(1);
  }

  const payloadFile = args[0];
  if (!fs.existsSync(payloadFile)) {
    console.error(`❌ Payload file not found: ${payloadFile}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));

  console.log('\n📱 小红书半自动发布工具');
  console.log('='.repeat(60));
  console.log(`📌 标题: ${payload.title}`);
  console.log(`📝 正文: ${payload.content.substring(0, 50)}...`);
  console.log(`📸 图片: ${payload.images.length} 张`);
  console.log(`🏷️  话题: ${payload.tags.join(' ')}`);
  console.log('='.repeat(60));
  console.log('\n⚠️  注意：请关闭所有 Chrome 窗口，然后按 Enter 继续...');

  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  let browser;
  try {
    browser = await launchBrowser();
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // 设置视口
    await page.setViewport({ width: 1280, height: 800 });

    // 检查登录状态
    await checkLogin(page);

    // 发布内容
    const result = await publishPost(page, payload);

    console.log('\n✅ 发布完成！');
    console.log('\n💡 按 Ctrl+C 关闭浏览器');

    // 保持浏览器打开
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
