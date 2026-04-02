#!/usr/bin/env node
'use strict';

/**
 * 小红书自动截图工具
 * 使用 Puppeteer 将 HTML 卡片转换为图片
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

/**
 * 截图单个 HTML 文件
 */
async function screenshotHTML(browser, htmlPath, outputPath) {
  const page = await browser.newPage();

  // 设置视口大小
  await page.setViewport({
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    deviceScaleFactor: 2 // 2x 分辨率，更清晰
  });

  // 加载 HTML 文件
  const fileUrl = `file://${path.resolve(htmlPath)}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // 等待渲染完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 截图
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false
  });

  await page.close();
  console.log(`✅ 截图完成: ${path.basename(outputPath)}`);
}

/**
 * 批量截图所有 HTML 卡片
 */
async function screenshotAllCards(inputDir, outputDir) {
  console.log('🎨 开始截图小红书卡片...\n');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 获取所有 HTML 文件
  const htmlFiles = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.html'))
    .sort();

  // 复制封面图
  const coverJpg = path.join(inputDir, '01-cover.jpg');
  if (fs.existsSync(coverJpg)) {
    const coverOutput = path.join(outputDir, '01-cover.jpg');
    fs.copyFileSync(coverJpg, coverOutput);
    console.log(`✅ 封面图已复制: 01-cover.jpg`);
  }

  // 截图所有 HTML 卡片
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(inputDir, htmlFile);
    const outputPath = path.join(outputDir, htmlFile.replace('.html', '.png'));

    await screenshotHTML(browser, htmlPath, outputPath);
  }

  await browser.close();

  console.log('\n✅ 所有卡片截图完成！');
  console.log(`📂 输出目录: ${outputDir}`);

  // 统计生成的图片
  const images = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort();

  console.log(`\n📸 共生成 ${images.length} 张图片：`);
  images.forEach((img, idx) => {
    console.log(`${idx + 1}. ${img}`);
  });

  return images.map(img => path.join(outputDir, img));
}

/**
 * 主函数
 */
async function main() {
  const inputDir = path.join(__dirname, '..', 'output', 'xhs', 'html-cards');
  const outputDir = path.join(__dirname, '..', 'output', 'xhs', 'images');

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ HTML 卡片目录不存在: ${inputDir}`);
    console.log('请先运行: node publish/tools/generate-xhs-html-cards.js');
    process.exit(1);
  }

  const images = await screenshotAllCards(inputDir, outputDir);

  console.log('\n📱 小红书发布准备完成！');
  console.log('\n下一步：');
  console.log('1. 手动发布：使用手机小红书 App 上传这些图片');
  console.log('2. 自动发布：运行 node publish/tools/xhs-auto-publish.js');

  return images;
}

// 导出函数
module.exports = {
  screenshotHTML,
  screenshotAllCards
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
