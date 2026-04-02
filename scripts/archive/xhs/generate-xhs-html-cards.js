#!/usr/bin/env node
'use strict';

/**
 * 小红书多图 HTML 卡片生成工具
 * 生成 9 张小红书风格的 HTML 卡片，可以用浏览器截图
 */

const fs = require('fs');
const path = require('path');

// 小红书推荐尺寸：3:4 竖版
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

/**
 * 生成 HTML 卡片模板
 */
function generateCardHTML(content, style = 'default') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${CARD_WIDTH}px;
      height: ${CARD_HEIGHT}px;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      overflow: hidden;
    }
    ${style}
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `;
}

/**
 * 1. 封面卡片
 */
function generateCoverHTML() {
  const style = `
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 80px;
    }
    h1 {
      font-size: 100px;
      font-weight: bold;
      margin-bottom: 40px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h2 {
      font-size: 60px;
      font-weight: 500;
      margin-bottom: 100px;
      opacity: 0.95;
    }
    .badge {
      font-size: 70px;
      font-weight: bold;
      background: rgba(255,255,255,0.2);
      padding: 30px 60px;
      border-radius: 50px;
      backdrop-filter: blur(10px);
    }
  `;

  const content = `
    <h1>Mac AI 编码神器</h1>
    <h2>12 个命令行工具推荐</h2>
    <div class="badge">效率提升 50%+</div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 2-5. 工具介绍卡片
 */
function generateToolHTML(tool, index) {
  const style = `
    body {
      background: #ffffff;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 200px;
      display: flex;
      align-items: center;
      padding: 0 80px;
      color: white;
    }
    .number {
      font-size: 80px;
      font-weight: bold;
      margin-right: 40px;
    }
    .name {
      font-size: 90px;
      font-weight: bold;
    }
    .content {
      padding: 80px;
    }
    .description {
      font-size: 55px;
      line-height: 1.6;
      color: #1a1a1a;
      margin-bottom: 60px;
    }
    .features {
      margin-bottom: 60px;
    }
    .feature {
      font-size: 50px;
      color: #666;
      margin-bottom: 30px;
      padding-left: 40px;
    }
    .install-box {
      background: #f8f9fa;
      padding: 60px;
      border-radius: 20px;
      text-align: center;
    }
    .install-title {
      font-size: 45px;
      color: #666;
      margin-bottom: 30px;
    }
    .install-cmd {
      font-size: 50px;
      font-family: "SF Mono", Monaco, monospace;
      color: #667eea;
      font-weight: bold;
    }
  `;

  const content = `
    <div class="header">
      <div class="number">${index}</div>
      <div class="name">${tool.name}</div>
    </div>
    <div class="content">
      <div class="description">${tool.description}</div>
      <div class="features">
        ${tool.features.map(f => `<div class="feature">✓ ${f}</div>`).join('')}
      </div>
      <div class="install-box">
        <div class="install-title">安装命令</div>
        <div class="install-cmd">${tool.install}</div>
      </div>
    </div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 6. 对比卡片
 */
function generateComparisonHTML() {
  const style = `
    body {
      background: #ffffff;
      padding: 80px;
    }
    h1 {
      font-size: 70px;
      font-weight: bold;
      text-align: center;
      color: #1a1a1a;
      margin-bottom: 100px;
    }
    .comparison {
      margin-bottom: 80px;
    }
    .comp-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 40px;
    }
    .old {
      font-size: 55px;
      font-family: monospace;
      color: #999;
      width: 200px;
      text-align: right;
    }
    .arrow {
      font-size: 60px;
      color: #00d9ff;
      margin: 0 60px;
    }
    .new {
      font-size: 55px;
      font-family: monospace;
      color: #667eea;
      font-weight: bold;
      width: 200px;
      text-align: left;
    }
    .desc {
      font-size: 45px;
      color: #666;
      text-align: center;
      margin-top: 20px;
    }
  `;

  const comparisons = [
    { old: 'ls', new: 'eza', desc: '彩色文件列表' },
    { old: 'cat', new: 'bat', desc: '语法高亮查看' },
    { old: 'find', new: 'fd', desc: '更快的搜索' },
    { old: 'grep', new: 'rg', desc: '更快的内容搜索' }
  ];

  const content = `
    <h1>传统工具 vs 现代工具</h1>
    <div class="comparison">
      ${comparisons.map(c => `
        <div class="comparison">
          <div class="comp-row">
            <div class="old">${c.old}</div>
            <div class="arrow">→</div>
            <div class="new">${c.new}</div>
          </div>
          <div class="desc">${c.desc}</div>
        </div>
      `).join('')}
    </div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 7. 使用场景卡片
 */
function generateScenarioHTML() {
  const style = `
    body {
      background: #ffffff;
      padding: 80px;
    }
    h1 {
      font-size: 70px;
      font-weight: bold;
      text-align: center;
      color: #1a1a1a;
      margin-bottom: 100px;
    }
    .scenario {
      margin-bottom: 100px;
    }
    .scenario-title {
      font-size: 55px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 40px;
    }
    .step {
      font-size: 50px;
      color: #333;
      margin-bottom: 30px;
      padding-left: 40px;
    }
  `;

  const content = `
    <h1>AI 编码实战场景</h1>
    <div class="scenario">
      <div class="scenario-title">场景 1：AI 修改 10 个文件</div>
      <div class="step">• Ctrl+T 快速打开文件</div>
      <div class="step">• Lazygit 可视化查看变更</div>
      <div class="step">• Tmux 分屏运行测试</div>
    </div>
    <div class="scenario">
      <div class="scenario-title">场景 2：调试复杂问题</div>
      <div class="step">• Atuin 找回复杂命令</div>
      <div class="step">• Yazi 快速定位文件</div>
      <div class="step">• Starship 显示上下文</div>
    </div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 8. 总结卡片
 */
function generateSummaryHTML() {
  const style = `
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 80px;
      color: white;
    }
    h1 {
      font-size: 80px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 100px;
    }
    .install-box {
      background: rgba(255,255,255,0.95);
      padding: 80px;
      border-radius: 30px;
      margin-bottom: 80px;
    }
    .cmd {
      font-size: 48px;
      font-family: "SF Mono", Monaco, monospace;
      color: #1a1a1a;
      margin-bottom: 25px;
    }
    .result {
      font-size: 70px;
      font-weight: bold;
      text-align: center;
    }
  `;

  const commands = [
    'brew install fzf',
    'brew install ghostty',
    'brew install yazi',
    'brew install tmux',
    'brew install atuin',
    'brew install lazygit',
    'brew install starship',
    'brew install eza'
  ];

  const content = `
    <h1>一键安装全套工具</h1>
    <div class="install-box">
      ${commands.map(cmd => `<div class="cmd">${cmd}</div>`).join('')}
    </div>
    <div class="result">效率提升 50%+</div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 9. 互动卡片
 */
function generateCTAHTML() {
  const style = `
    body {
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 80px;
    }
    .emoji {
      font-size: 250px;
      margin-bottom: 80px;
    }
    .question {
      font-size: 70px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 40px;
    }
    .sub {
      font-size: 60px;
      color: #666;
      margin-bottom: 150px;
    }
    .cta {
      font-size: 65px;
      font-weight: bold;
      color: #667eea;
    }
  `;

  const content = `
    <div class="emoji">💬</div>
    <div class="question">你在用什么工具？</div>
    <div class="sub">评论区分享你的神器～</div>
    <div class="cta">❤️ 点赞收藏不迷路</div>
  `;

  return generateCardHTML(content, style);
}

/**
 * 主函数
 */
async function main() {
  const outputDir = path.join(__dirname, '..', 'output', 'xhs', 'html-cards');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 开始生成小红书 HTML 卡片...\n');

  // 1. 封面（使用用户提供的图片）
  const userCover = '/Users/zenghao/Downloads/xhs-mac-ai-tools.jpg';
  if (fs.existsSync(userCover)) {
    const coverOutput = path.join(outputDir, '01-cover.jpg');
    fs.copyFileSync(userCover, coverOutput);
    console.log(`✅ 封面图已复制: 01-cover.jpg`);
  }

  // 2-5. 核心工具卡片
  const coreTools = [
    {
      name: 'fzf',
      description: '模糊搜索神器，秒速定位文件和命令',
      features: [
        'Ctrl+T 快速打开文件',
        'Ctrl+R 智能历史搜索',
        'Alt+C 目录跳转'
      ],
      install: 'brew install fzf'
    },
    {
      name: 'Ghostty',
      description: '现代终端模拟器，性能强悍',
      features: [
        '比 iTerm2 快 3-5 倍',
        'GPU 加速渲染',
        '原生 macOS 体验'
      ],
      install: 'brew install ghostty'
    },
    {
      name: 'Yazi',
      description: '终端文件管理器，可视化操作',
      features: [
        '预览图片/PDF/视频',
        '批量重命名',
        'Vim 风格操作'
      ],
      install: 'brew install yazi'
    },
    {
      name: 'Lazygit',
      description: 'Git 可视化操作，告别复杂命令',
      features: [
        '交互式暂存',
        '可视化 diff',
        '冲突解决'
      ],
      install: 'brew install lazygit'
    }
  ];

  for (let i = 0; i < coreTools.length; i++) {
    const html = generateToolHTML(coreTools[i], i + 1);
    const filename = `0${i + 2}-tool-${coreTools[i].name}.html`;
    fs.writeFileSync(path.join(outputDir, filename), html);
    console.log(`✅ 生成工具卡片: ${filename}`);
  }

  // 6. 对比卡片
  const comparisonHTML = generateComparisonHTML();
  fs.writeFileSync(path.join(outputDir, '06-comparison.html'), comparisonHTML);
  console.log(`✅ 生成对比卡片: 06-comparison.html`);

  // 7. 场景卡片
  const scenarioHTML = generateScenarioHTML();
  fs.writeFileSync(path.join(outputDir, '07-scenario.html'), scenarioHTML);
  console.log(`✅ 生成场景卡片: 07-scenario.html`);

  // 8. 总结卡片
  const summaryHTML = generateSummaryHTML();
  fs.writeFileSync(path.join(outputDir, '08-summary.html'), summaryHTML);
  console.log(`✅ 生成总结卡片: 08-summary.html`);

  // 9. 互动卡片
  const ctaHTML = generateCTAHTML();
  fs.writeFileSync(path.join(outputDir, '09-cta.html'), ctaHTML);
  console.log(`✅ 生成互动卡片: 09-cta.html`);

  console.log('\n✅ 所有 HTML 卡片生成完成！');
  console.log(`📂 输出目录: ${outputDir}`);
  console.log('\n📸 下一步：使用浏览器截图');
  console.log('1. 在浏览器中打开每个 HTML 文件');
  console.log('2. 调整窗口大小为 1080x1440');
  console.log('3. 截图保存为 PNG 格式');
  console.log('\n或者运行截图脚本自动完成：');
  console.log('node publish/tools/screenshot-xhs-cards.js');
}

// 导出函数
module.exports = {
  generateCoverHTML,
  generateToolHTML,
  generateComparisonHTML,
  generateScenarioHTML,
  generateSummaryHTML,
  generateCTAHTML
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
