#!/usr/bin/env node
'use strict';

/**
 * 小红书 iPhone 模拟器截图自动化工具
 * 使用 Puppeteer + iOS Simulator 生成小红书风格的截图
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 小红书推荐的图片尺寸
const XHS_IMAGE_SIZES = {
  square: { width: 1080, height: 1080 },      // 1:1 方形
  vertical: { width: 1080, height: 1440 },    // 3:4 竖版（推荐）
  horizontal: { width: 1440, height: 1080 }   // 4:3 横版
};

// iPhone 模拟器设备列表
const IOS_DEVICES = {
  'iPhone 15 Pro Max': { width: 430, height: 932, scale: 3 },
  'iPhone 15 Pro': { width: 393, height: 852, scale: 3 },
  'iPhone 14 Pro': { width: 393, height: 852, scale: 3 },
  'iPhone SE': { width: 375, height: 667, scale: 2 }
};

/**
 * 生成小红书精简文案
 */
function generateCompactXhsContent(post) {
  const lines = [];

  // 1. 开头（简短有力）
  lines.push('💻 Mac AI 编码必备工具分享！');
  lines.push('');
  lines.push('作为 AI 编程重度用户，这些命令行工具让我效率翻倍 ⚡');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. 核心工具（精简版，只列关键信息）
  lines.push('🔥 核心 4 件套：');
  lines.push('');
  lines.push('1️⃣ fzf - 模糊搜索，秒速定位文件');
  lines.push('2️⃣ Ghostty - 比 iTerm2 快 3 倍');
  lines.push('3️⃣ Yazi - 可视化文件管理');
  lines.push('4️⃣ Tmux - 终端复用神器');
  lines.push('');

  // 3. 进阶工具（只列名字和星数）
  lines.push('⭐ 进阶工具：');
  lines.push('Atuin (27.5K⭐) | Lazygit (55K⭐)');
  lines.push('Starship (53.7K⭐) | eza (20.4K⭐)');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 4. 一键安装
  lines.push('📦 一键安装：');
  lines.push('brew install fzf ghostty yazi tmux');
  lines.push('');

  // 5. 效果
  lines.push('🎯 效果：AI 编码效率提升 50%+');
  lines.push('');

  // 6. 互动
  lines.push('💬 你在用什么工具？评论区见～');
  lines.push('❤️ 点赞收藏不迷路！');

  return lines.join('\n');
}

/**
 * 生成 HTML 内容页面（用于截图）
 */
function generateHtmlPage(content, style = 'card') {
  const styles = {
    card: `
      body {
        margin: 0;
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        background: white;
        border-radius: 24px;
        padding: 40px;
        max-width: 600px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      h1 {
        font-size: 28px;
        font-weight: bold;
        color: #1a1a1a;
        margin: 0 0 20px 0;
        line-height: 1.4;
      }
      .content {
        font-size: 18px;
        line-height: 1.8;
        color: #333;
        white-space: pre-wrap;
      }
      .highlight {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: bold;
      }
    `,
    terminal: `
      body {
        margin: 0;
        padding: 40px;
        background: #1a1f2e;
        font-family: "SF Mono", "Monaco", "Menlo", monospace;
        min-height: 100vh;
      }
      .terminal {
        background: #282c34;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      }
      .terminal-header {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .dot.red { background: #ff5f56; }
      .dot.yellow { background: #ffbd2e; }
      .dot.green { background: #27c93f; }
      .terminal-content {
        font-size: 16px;
        line-height: 1.6;
        color: #abb2bf;
      }
      .prompt { color: #98c379; }
      .command { color: #61afef; }
      .output { color: #e5c07b; }
    `
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles[style]}</style>
</head>
<body>
  ${style === 'card' ? `
    <div class="container">
      <h1>💻 Mac AI 编码<span class="highlight">命令行工具</span></h1>
      <div class="content">${content}</div>
    </div>
  ` : `
    <div class="terminal">
      <div class="terminal-header">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <div class="terminal-content">${content}</div>
    </div>
  `}
</body>
</html>
  `;
}

/**
 * 使用 iOS 模拟器截图
 */
function captureWithSimulator(htmlFile, outputFile, device = 'iPhone 15 Pro') {
  console.log(`📱 使用 iOS 模拟器截图: ${device}`);

  try {
    // 1. 启动模拟器
    console.log('启动模拟器...');
    execSync(`xcrun simctl boot "${device}" 2>/dev/null || true`);

    // 2. 打开 Safari 并加载页面
    const fileUrl = `file://${path.resolve(htmlFile)}`;
    console.log(`打开页面: ${fileUrl}`);
    execSync(`xcrun simctl openurl "${device}" "${fileUrl}"`);

    // 3. 等待页面加载
    console.log('等待页面加载...');
    execSync('sleep 3');

    // 4. 截图
    console.log('截图中...');
    const tempScreenshot = '/tmp/simulator-screenshot.png';
    execSync(`xcrun simctl io "${device}" screenshot "${tempScreenshot}"`);

    // 5. 调整尺寸到小红书推荐尺寸（3:4 竖版）
    console.log('调整图片尺寸...');
    const { width, height } = XHS_IMAGE_SIZES.vertical;
    execSync(`sips -z ${height} ${width} "${tempScreenshot}" --out "${outputFile}"`);

    console.log(`✅ 截图已保存: ${outputFile}`);
    return outputFile;

  } catch (error) {
    console.error('❌ 截图失败:', error.message);
    throw error;
  }
}

/**
 * 生成小红书截图集
 */
async function generateXhsScreenshots(post, outputDir) {
  console.log('🎨 开始生成小红书截图...');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshots = [];

  // 1. 封面图（使用用户提供的图片）
  const coverImage = '/Users/zenghao/Downloads/mac-cli-tools.PNG';
  if (fs.existsSync(coverImage)) {
    const coverOutput = path.join(outputDir, '01-cover.png');
    fs.copyFileSync(coverImage, coverOutput);
    screenshots.push(coverOutput);
    console.log('✅ 封面图已复制');
  }

  // 2. 内容卡片（精简文案）
  const content = generateCompactXhsContent(post);
  const contentHtml = path.join(outputDir, 'content.html');
  fs.writeFileSync(contentHtml, generateHtmlPage(content, 'card'));

  try {
    const contentScreenshot = path.join(outputDir, '02-content.png');
    captureWithSimulator(contentHtml, contentScreenshot);
    screenshots.push(contentScreenshot);
  } catch (error) {
    console.warn('⚠️  模拟器截图失败，跳过内容卡片');
  }

  // 3. 终端演示
  const terminalContent = `
<span class="prompt">user@Mac</span> <span class="command">~ ></span> brew install fzf ghostty yazi tmux
<span class="output">🍺 Installing fzf...</span>
<span class="output">🍺 Installing ghostty...</span>
<span class="output">🍺 Installing yazi...</span>
<span class="output">🍺 Installing tmux...</span>
<span class="output">✅ Installation complete!</span>

<span class="prompt">user@Mac</span> <span class="command">~ ></span> fzf --version
<span class="output">0.48.0</span>
  `;

  const terminalHtml = path.join(outputDir, 'terminal.html');
  fs.writeFileSync(terminalHtml, generateHtmlPage(terminalContent, 'terminal'));

  try {
    const terminalScreenshot = path.join(outputDir, '03-terminal.png');
    captureWithSimulator(terminalHtml, terminalScreenshot);
    screenshots.push(terminalScreenshot);
  } catch (error) {
    console.warn('⚠️  终端截图失败，跳过');
  }

  console.log(`\n✅ 生成了 ${screenshots.length} 张截图`);
  return screenshots;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node generate-xhs-screenshots.js <markdown-file>');
    console.log('\nOptions:');
    console.log('  --device <name>    iOS 模拟器设备名称（默认: iPhone 15 Pro）');
    console.log('  --output <dir>     输出目录（默认: publish/output/xhs/screenshots）');
    process.exit(1);
  }

  const mdFile = args[0];
  const outputDir = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : path.join(__dirname, '..', 'output', 'xhs', 'screenshots');

  if (!fs.existsSync(mdFile)) {
    console.error(`❌ 文件不存在: ${mdFile}`);
    process.exit(1);
  }

  // 简单解析文章
  const content = fs.readFileSync(mdFile, 'utf8');
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(mdFile, '.md');

  const post = { title, content };

  // 生成截图
  const screenshots = await generateXhsScreenshots(post, outputDir);

  // 生成精简文案
  const xhsContent = generateCompactXhsContent(post);

  // 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('📱 小红书发布内容（精简版）');
  console.log('='.repeat(60));
  console.log('\n📌 标题：');
  console.log('💻 Mac AI 编码神器｜12 个命令行工具');
  console.log('\n📝 正文：');
  console.log(xhsContent);
  console.log('\n🏷️ 话题：');
  console.log('#Mac工具 #AI编程 #开发效率 #命令行 #程序员');
  console.log('\n📸 图片：');
  screenshots.forEach((img, idx) => {
    console.log(`${idx + 1}. ${img}`);
  });
  console.log('\n💡 发布提示：');
  console.log('1. 使用手机小红书 App 发布');
  console.log('2. 上传生成的截图（按顺序）');
  console.log('3. 复制标题和正文');
  console.log('4. 添加话题标签');
  console.log('5. 发布时间：工作日 12:00-14:00 或 20:00-22:00');
  console.log('='.repeat(60));

  // 保存文案到文件
  const textFile = path.join(outputDir, 'xhs-content.txt');
  const fullContent = `
标题：💻 Mac AI 编码神器｜12 个命令行工具

正文：
${xhsContent}

话题：#Mac工具 #AI编程 #开发效率 #命令行 #程序员

图片：
${screenshots.map((img, idx) => `${idx + 1}. ${path.basename(img)}`).join('\n')}
  `.trim();

  fs.writeFileSync(textFile, fullContent, 'utf8');
  console.log(`\n✅ 内容已保存到: ${textFile}`);
}

// 导出函数
module.exports = {
  generateCompactXhsContent,
  generateHtmlPage,
  captureWithSimulator,
  generateXhsScreenshots
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
